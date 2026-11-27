# SafeBite RAG Architecture & Model Fine-Tuning Plan

## 1. Embedding & Generation Model Architecture

To keep the retrieval pipeline simple and free of local RAM overhead while satisfying the panel's requirement to train a custom model for the chatbot, SafeBite separates retrieval indexing from domain response generation:

| Pipeline Role | Selected Model | Hosting & Cost | Vector / Context Specs | Architectural Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Vector Retrieval (Pre-Trained API)** | **`gemini-embedding-001`** (Google AI Studio) | Cloud REST API; Free Tier (`0 USD`, no fallback required) | `1,536` dimensions (via MRL); `2,048`-token context; multilingual (English + Urdu) | Zero local RAM usage on `EC2 t2.micro`, matches SafeBite's existing `vector(1536)` `pgvector` schema, and uses an OpenAI-compatible REST endpoint |
| **RAG Chatbot Generator (Custom Fine-Tuned)** | **`SafeBite-Qwen2.5-3B-Instruct`** (4-bit QLoRA tuned) | Self-hosted `llama.cpp` server on free `16 GB` RAM CPU Hugging Face Space | `32,768` native / `131,072` YaRN capacity (`4,096`-token runtime window); `Q4_K_M` GGUF (`~2.1 GB`) | Trained directly on SafeBite's `549` products, `2,361` metal measurements, and `38` studies; replaces external LLM generation APIs |

### Why No Embedding Fallback Is Included

* **Single Clean Code Path:** Avoiding a secondary local ONNX encoder removes native binary dependencies (`onnxruntime`) and saves `~100 MB` of memory on the `1 GB` `AWS EC2 t2.micro` instance.
* **Pre-Computed Corpus Vectors:** All `549` product entries and `38` research study records are embedded once during database seeding and persisted in PostgreSQL (`pgvector`). Live traffic only embeds short user query strings via `gemini-embedding-001`.

### Model Capacity, Quantization (`Q4_K_M`), & Context Window Sizing

* **Native Capacity vs. Runtime Configuration:** `Qwen2.5-3B-Instruct` natively supports a **`32,768`-token (`32K`)** input context window (`8,192` max output tokens) and up to **`131,072` tokens (`128K`)** via YaRN RoPE scaling. The `4,096`-token figure in this plan is not a limitation of the model or quantization format—it is a **runtime memory allocation parameter** (`max_seq_length` during training and `--ctx-size` during inference).
* **Why `4,096` Tokens Is Optimal for SafeBite:**
  * **Google Colab T4 VRAM (`16 GB`):** Self-attention activation memory scales quadratically ($O(L^2)$) with sequence length $L$. Setting `max_seq_length = 4096` prevents out-of-memory (OOM) errors during 4-bit QLoRA training while maintaining stable batch sizes.
  * **Inference KV Cache & CPU Latency (`16 GB` RAM HF Space):** In `llama.cpp`, larger context buffers pre-allocate additional RAM for the Key-Value (KV) cache and slow down CPU prompt processing. Keeping `--ctx-size 4096` keeps total memory usage compact (`~2.1 GB` weights plus a small KV cache) and preserves sub-3.5-second response times.
  * **RAG Payload Alignment:** Stage 4 prompts (medically conservative system instructions + top-5 retrieved database records + user query) typically total `1,200` to `2,200` tokens, leaving ample headroom for multi-turn follow-ups and cited answers inside `4,096` tokens.
* **What `Q4_K_M GGUF` Quantization Does:** `Q4_K_M` is a mixed-precision weight compression scheme (`~4.85` bits per parameter on average, preserving 6-bit precision on sensitive attention and feed-forward layers) that reduces the 16-bit (`bfloat16`) model from `~6.2 GB` to `~2.1 GB` in single-file GGUF format. It compresses **model weights only** and leaves the model's `32K` positional embeddings intact.
* **Scaling Context Length Without Retraining:** Because the exported GGUF file retains its native `32,768`-token positional capability, you can expand the active conversation window at any time without retraining simply by updating `--ctx-size 4096` to `--ctx-size 8192` or `--ctx-size 16384` in the `llama.cpp` server startup flags (subject to available host RAM).

---

## 2. Google Antigravity Execution Plan

Use this specification inside Google Antigravity (`/plan` or the Agent Manager Playground) to implement SafeBite's streamlined RAG pipeline.

### Architectural Scope & Constraints

* **Preserved Core Stack:** The React Native + Expo mobile client, Node.js + Express + TypeScript backend, Prisma ORM, PostgreSQL 15 + `pgvector` HNSW index (`vector(1536)`), and deterministic A–F regulatory scoring engine (`PSQCA`, `EU 2023/915`, `Codex CXS 193-1995`) remain intact.
* **Single Trained Model Scope:** Only the Stage 5 RAG chatbot generator (`Qwen2.5-3B-Instruct`) is fine-tuned. Stage 1–3 retrieval uses `gemini-embedding-001` directly without fallback complexity.
* **Compute & Hosting Separation:** QLoRA fine-tuning executes on Google Colab (free T4 GPU), and quantized `Q4_K_M` GGUF inference runs on a dedicated `16 GB` RAM CPU Hugging Face Space exposing an OpenAI-compatible `/v1/chat/completions` endpoint.

### Phase 1: Google AI Studio Embedding Integration (`gemini-embedding-001`)

**Target Files:** `backend/src/config/env.ts`, `backend/src/services/embeddings/geminiEmbeddingService.ts`, `backend/scripts/reindexEmbeddings.ts`

1. **Environment Configuration:** Add `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL="gemini-embedding-001"` to `backend/.env` and Zod environment validation schemas.
2. **Implement Single Embedding Client:** Create `geminiEmbeddingService.ts` calling Google AI Studio's OpenAI-compatible embeddings endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/embeddings`) with `model: "gemini-embedding-001"` and `dimensions: 1536`—with no fallback provider.
3. **Seed & Index Database Vectors:** Run `backend/scripts/reindexEmbeddings.ts` to embed all `549` product profiles and `38` peer-reviewed study records into PostgreSQL `pgvector` (`vector(1536)` with HNSW cosine distance `<=>`).

### Phase 2: Domain Instruction Dataset Construction

**Target Files:** `ml/scripts/build_rag_dataset.py`, `ml/data/train.jsonl`, `ml/data/eval.jsonl`

1. **Ingest Curated Dataset:** Parse `safebite_clean_data_review4.xlsx` across its relational tabs: `products` (`549` product rows), `Products_Wide` (concentrations for `Cd`, `Co`, `Cr`, `Cu`, `Fe`, `Pb`, `Zn`), `measurements` (`2,361` measurement records), and `sources` (`38` peer-reviewed studies).
2. **Synthesize Grounded RAG Triplets:** Generate `750` ChatML (`system`, `user`, `assistant`) instruction-tuning conversations across four query archetypes:
   * **Single-Product Safety Queries:** Reporting exact heavy-metal concentrations against the most restrictive regulatory threshold.
   * **Cross-Brand & Category Comparisons:** Ranking products within a food category (e.g., juices, teas, jams, chocolates) by measured contamination levels.
   * **Missing-Data & Evidence-Granularity Disclosures:** Explicitly stating `"Not Tested"` for unmeasured metals and disclosing whether evidence is `product_level`, `brand_level`, or `category_level`.
   * **Out-of-Scope & Medical Refusal Queries:** Declining medical diagnosis/treatment questions and prompts unsupported by the top-5 retrieved context records.
3. **Enforce Inline Citations:** Require every target `assistant` response to report exact `mg/kg` or `mg/L` values from the injected top-5 context block and append verifiable tags (`[Source ID: <id> | <Authors>, <Year>]`).
4. **Stratified Split:** Partition the dataset `85/15` grouped by `category` and `source_id` into `ml/data/train.jsonl` (`637` examples) and `ml/data/eval.jsonl` (`113` held-out examples) to prevent study leakage.

### Phase 3: 4-Bit QLoRA Fine-Tuning & GGUF Quantization

**Target Files:** `ml/notebooks/finetune_safebite_qwen3b.ipynb`, `ml/artifacts/safebite-qwen2.5-3b-q4_k_m.gguf`

1. **Base Model & LoRA Configuration:** Load `unsloth/Qwen2.5-3B-Instruct` in 4-bit NF4 quantization (`max_seq_length = 4096` runtime training window) and attach LoRA adapters ($r = 16$, $\alpha = 16$, `lora_dropout = 0.05`) across all linear projection layers (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
2. **Training Hyperparameters:** Train for `3` epochs with effective batch size `16` (`per_device_train_batch_size = 4`, `gradient_accumulation_steps = 4`), AdamW 8-bit optimizer, learning rate $2 \times 10^{-4}$ with cosine decay, warmup ratio `0.05`, and response-only loss masking (`train_on_responses_only`).
3. **Export Quantized Artifact:** Merge LoRA adapters into the base weights and export to `Q4_K_M` GGUF format (`~2.1 GB`, retaining full `32K` positional embeddings), pushing the artifact to a Hugging Face model repository (`safebite-qwen2.5-3b-instruct-gguf`).

### Phase 4: Self-Hosted Inference Server & Backend Wiring

**Target Files:** `ml/inference/Dockerfile`, `backend/src/config/env.ts`, `backend/src/services/llm/providers/selfHostedProvider.ts`, `backend/src/services/llm/llmFactory.ts`, `backend/src/services/chatbot/citationValidator.ts`

1. **Deploy Inference Container:** Build a Docker image from `ghcr.io/ggml-org/llama.cpp:server` loading `safebite-qwen2.5-3b-instruct-q4_k_m.gguf` with `--ctx-size 4096 --threads 4 --port 7860` (scalable via `--ctx-size` without retraining) on a free `16 GB` RAM CPU Hugging Face Space, protected by a Bearer API token (`LLM_INFERENCE_API_KEY`).
2. **Configure Backend Generator Provider:** Add `LLM_PROVIDER="self_hosted"`, `SELF_HOSTED_LLM_BASE_URL`, `SELF_HOSTED_LLM_MODEL="safebite-qwen2.5-3b-instruct"`, and `SELF_HOSTED_LLM_API_KEY` to `backend/.env` and Zod environment validation.
3. **Wire Chatbot Pipeline:** Route Stage 5 generation in `selfHostedProvider.ts` to `${SELF_HOSTED_LLM_BASE_URL}/v1/chat/completions` (`temperature: 0.1`, `timeout: 15000ms`), retaining Stage 6 deterministic citation verification in `citationValidator.ts` to validate `[Source ID]` tags against the top-5 `pgvector` results.

### Phase 5: Quantitative Benchmarking for FYP Defense

**Target Files:** `ml/scripts/evaluate_rag_model.py`, `ml/results/benchmark_report.json`

Evaluate the unmodified base `Qwen2.5-3B-Instruct` model against `SafeBite-Qwen2.5-3B-Instruct` on the held-out `ml/data/eval.jsonl` split:

| Metric | Definition | Target Threshold |
| :--- | :--- | :--- |
| **Citation Precision** | Percentage of `[Source ID]` citations in model output present in the retrieved top-5 context | $\ge 98\%$ |
| **Numerical Concentration Accuracy** | Exact match of reported metal concentrations (`mg/kg`) and regulatory limits against ground truth | $\ge 95\%$ |
| **Evidence-Level Disclosure Rate** | Percentage of responses explicitly disclosing `product_level`, `brand_level`, or `category_level` | $100\%$ |
| **Out-of-Context Refusal Rate** | Percentage of medical-diagnosis or unsupported queries properly declined without hallucination | $\ge 95\%$ |
| **End-to-End Response Latency** | Median time from `gemini-embedding-001` query embedding to validated Express API JSON response | $< 3.5\text{ s}$ |

### Verification Checkpoints

1. **Embedding Indexing Check:** Verify `geminiEmbeddingService.ts` returns `1,536`-dimensional vectors and populates `pgvector` HNSW indexes for all `549` products and `38` studies with zero local RAM overhead.
2. **Dataset Integrity Check:** Confirm `ml/data/train.jsonl` and `ml/data/eval.jsonl` pass JSON schema validation with zero `source_id` overlap and zero `NaN` string leaks.
3. **Training Convergence Check:** Verify monotonically decreasing training and validation cross-entropy loss across all `3` epochs.
4. **End-to-End API & Citation Check:** Run Jest integration tests on `/api/chat` confirming `gemini-embedding-001` retrieval, cited generation from the Hugging Face Space endpoint, and Stage 6 deterministic fallback when an invalid `source_id` is simulated.