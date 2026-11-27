<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.4-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-15_+_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL + pgvector" />
  <img src="https://img.shields.io/badge/AWS-S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS S3" />
</p>

# 🛡️ SafeBite — Backend API

> **Evidence-based heavy metal food safety intelligence for Pakistani consumers.**
>
> SafeBite links barcoded retail food products and local staples to peer-reviewed heavy metal contamination research, evaluates measurements against hierarchical regulatory limits (**PSQCA → Codex Alimentarius → EU**), and computes deterministic **CLR / CCI / A–F** safety grades.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Dataset & Catalog Snapshot](#-dataset--catalog-snapshot)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Safety Analysis & Standards Hierarchy](#-safety-analysis--standards-hierarchy)
- [Project Structure](#-project-structure)
- [Roadmap & Implementation Status](#-roadmap--implementation-status)
- [License](#-license)

---

## 🔍 Overview

Pakistani consumers lack accessible, product-level information about heavy metal contamination in everyday foods. SafeBite bridges peer-reviewed laboratory studies and regulatory standards through a REST API built for the SafeBite mobile application:

- **Barcode & Catalog Lookup:** Look up products by GS1-validated GTIN (`EAN-13`, `UPC-A`, `EAN-8`, `GTIN-14`) or filter by category, brand, grade, and `ProductType`.
- **Consumer-Facing Product Taxonomy:** Separates retail and consumer staples (`COMMERCIAL_PACKAGED`, `INFORMAL_WRAPPED`, `LOOSE_COMMODITY`) from internal academic baselines (`RESEARCH_BENCHMARK`) via `isConsumerFacing`.
- **Deterministic Safety Engine (`ruleVersion = "1.0.0"`):** Computes per-contaminant **Contamination Limit Ratios (CLR)**, handles **Limit of Detection (`BELOW_LOD`)** compliance and unit/basis normalization, aggregates eligible CLRs into the **Cumulative Contamination Index (CCI)**, and assigns **A–F** grades.
- **Safer Alternatives:** Ranks safer products within the same food category by lower CCI/CLR.
- **Auth, User Profiles & Storage:** JWT authentication with email OTP verification and 3-step password reset (Mailtrap Sending API + SMTP fallback), user scan/search history, favorites, watchlist, health-context consent/tags, and AWS S3 media storage.
- **RAG Readiness:** `VectorStore` (`pgvector` `vector(1536)`) schema and implementation plan ready for the upcoming grounded AI assistant.

---

## 📊 Dataset & Catalog Snapshot

From the ingested seed dataset ([analysis/PRODUCT_DATA_BREAKDOWN.md](analysis/PRODUCT_DATA_BREAKDOWN.md)):

| Dimension | Count | Notes |
| --- | ---: | --- |
| **Active Food Products** | **519** | **302** consumer-facing (`204` `COMMERCIAL_PACKAGED`) + **217** `RESEARCH_BENCHMARK` |
| **Retail Barcodes (`ProductBarcode`)** | **848** | Across **135** barcoded commercial SKUs (`811` EAN-13, `19` UPC-A, `17` EAN-8, `1` GTIN-14) |
| **Heavy Metal Measurements (`ResearchData`)** | **1,693** | Quantitative observations from ICP-OES & AAS studies |
| **Food Categories (`Category`)** | **21** | **18** populated categories + **3** standards-ready categories |
| **Literature Sources (`ResearchSource`)** | **38** | Peer-reviewed scientific papers (`source_id` 1–38) |
| **Regulatory Standards (`ReferenceStandard`)** | **192** | `179` PSQCA + `7` Codex (`CXS 193-1995`) + `6` EU (`2023/915`) |
| **Precomputed Analyses (`AnalysisResult`)** | **519** | `369` graded (`A–F`) + `150` `Insufficient Data` (`MIN_ELIGIBLE_NOT_MET`) |

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| **Runtime & Framework** | Node.js (≥ 20 LTS, native `process.loadEnvFile`), Express 5, TypeScript 5.7 |
| **Database & ORM** | PostgreSQL 15 + `pgvector`, Prisma ORM 6.4 |
| **Validation & Security** | Zod, Helmet, CORS, `express-rate-limit`, `bcrypt`, `jsonwebtoken` |
| **Storage & Email** | AWS S3 (`@aws-sdk/client-s3`, presigned URLs), Mailtrap API + Nodemailer SMTP |
| **API Docs** | Swagger UI (`/docs`) + OpenAPI 3.0 spec (`/openapi.json`) |
| **Data Ingestion** | `xlsx` seed pipelines (`prisma/seed.ts`, `prisma/seed-products.ts`, `prisma/seed-standards.ts`) |
| **AI / RAG (Planned)** | OpenAI (`text-embedding-3-small`) + Groq fallback via `VectorStore` (`pgvector`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 20.0.0`
- **PostgreSQL 15+** with the `pgvector` extension (or Docker)
- **npm**

### 1. Clone & Install

```bash
git clone https://github.com/MadG0blin359/SafeBite-Backend.git
cd SafeBite-Backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key environment variables (validated at startup by `src/config/env.ts`):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`pgvector` enabled) |
| `JWT_SECRET` | Secret key for JWT signing (required ≥ 32 chars in `production`) |
| `JWT_EXPIRES_IN` | Token lifetime (default `90d`) |
| `PORT` | Server port (default `3000`) |
| `CORS_ORIGIN` | Allowed origins (`*` or comma-separated list) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` | AWS S3 media upload/signed URL config |
| `MAILTRAP_API_TOKEN`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Primary transactional email delivery (with optional `SMTP_*` fallback) |
| `OPENAI_API_KEY`, `GROQ_API_KEY` | AI provider keys for the RAG assistant |

### 3. Start PostgreSQL (`pgvector`) & Seed

```bash
# Start local PostgreSQL 15 + pgvector via Docker
docker compose up -d

# Generate Prisma client, apply migrations, and seed standards + products + analyses
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run the Server & Tests

```bash
# Development server (hot reload)
npm run dev

# Type-check or production build
npm run typecheck
npm run build
npm start

# End-to-end API smoke/regression suite (against a running server)
npm run test:e2e
```

Once running, interactive API documentation is available at:
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

---

## 📡 API Endpoints

### Health & Docs

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness health check |
| `GET` | `/ready` | Readiness check (database connectivity) |
| `GET` | `/docs` | Interactive Swagger UI |
| `GET` | `/openapi.json` | Raw OpenAPI 3.0 JSON specification |

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
| --- | --- | :---: | --- |
| `POST` | `/api/auth/validate-email` | — | Validate email format/domain availability |
| `POST` | `/api/auth/signup` | — | Register account and send verification OTP |
| `POST` | `/api/auth/verify-email` | — | Verify email address with OTP |
| `POST` | `/api/auth/resend-verification-otp` | — | Resend email verification OTP |
| `POST` | `/api/auth/login` | — | Authenticate and issue JWT |
| `POST` | `/api/auth/forgot-password` | — | Initiate 3-step password reset OTP |
| `POST` | `/api/auth/verify-reset-otp` | — | Verify password reset OTP |
| `POST` | `/api/auth/reset-password` | — | Reset password with verified token |
| `GET` | `/api/auth/profile` | JWT | Get authenticated user profile |
| `PATCH` | `/api/auth/profile` | JWT | Update user profile |
| `POST` | `/api/auth/logout` | JWT | Invalidate active session (`tokenVersion`) |

### Products, Categories, Safety & Standards

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List/search products (`search`/`q`, `categoryId`, `brand`, `hasBarcode`, `productType`, `includeBenchmarks`, `grade`, `page`, `limit`) |
| `GET` | `/api/products/barcode/:barcode` | Look up product by EAN/UPC/GTIN barcode |
| `GET` | `/api/products/:id` | Get full product details, measurements, and analysis |
| `GET` | `/api/categories` | List all food categories |
| `GET` | `/api/categories/:id` | Get category details |
| `GET` | `/api/categories/:id/products` | List products in a category |
| `GET` | `/api/safety/:productId` | Detailed safety breakdown (per-contaminant CLR, standards, CCI, grade) |
| `GET` | `/api/alternatives/:productId` | Safer product alternatives in the same category |
| `GET` | `/api/standards` | Query regulatory reference limits |
| `GET` | `/api/standards/summary` | Summary statistics of seeded standards |
| `GET` | `/api/standards/categories/:categoryId` | Resolve applicable limits for a category |
| `GET` | `/api/standards/:id` | Get a specific regulatory standard record |

### User Data (`/api/user`, JWT required)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/user/history` | Get scan & search history |
| `POST` | `/api/user/history/scan` | Record a product scan |
| `POST` | `/api/user/history/search` | Record a search query |
| `DELETE` | `/api/user/history` | Clear user history |
| `GET` / `POST` / `DELETE` | `/api/user/favorites` (`/:productId`) | Manage favorite products |
| `GET` / `POST` / `DELETE` | `/api/user/watchlist` (`/:productId`) | Manage product safety watchlist |
| `GET` / `DELETE` | `/api/user/health-profile` | View or clear health profile |
| `PUT` | `/api/user/health-profile/consent` | Update health-context consent |
| `PUT` | `/api/user/health-profile/tags` | Update health tags (e.g., `PREGNANCY`, `INFANT`) |

### Storage (`/api/storage`, JWT required)

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/storage/upload` | Direct multipart image upload (JPEG/PNG/WebP, max 10 MB) to S3 |
| `POST` | `/api/storage/signed-upload` | Generate presigned S3 PUT upload URL |
| `POST` | `/api/storage/signed-url` | Generate presigned S3 download URL |
| `GET` | `/api/storage/files` | List accessible bucket files |
| `DELETE` | `/api/storage/files` | Delete owned/authorized files |

---

## 🗄 Database Schema

Defined in [prisma/schema.prisma](prisma/schema.prisma) across 14 models:

- **Users & Auth:** `User`, `EmailVerificationToken`, `PasswordResetToken`
- **Catalog & Barcodes:** `Category`, `Product` (`ProductType`, `isConsumerFacing`), `ProductBarcode`
- **Research Evidence:** `ResearchSource`, `ResearchData` (`EvidenceLevel`: `PRODUCT_SPECIFIC`, `BRAND_LEVEL`, `CATEGORY_LEVEL`)
- **Standards & Scoring:** `ReferenceStandard`, `AnalysisResult` (`ruleVersion`, `clrBreakdown`, `cci`, `grade`, `excludedReasons`)
- **Guidance & RAG:** `HealthContextEvidence`, `ExposureReductionGuidance`, `VectorStore` (`vector(1536)`)
- **User Activity:** `SearchHistory`, `ScanHistory`, `Favorite`, `Watchlist`

---

## ⚖️ Safety Analysis & Standards Hierarchy

### Tracked Contaminants

- **Toxic Heavy Metals Evaluated:** Lead (`Pb`), Cadmium (`Cd`), Chromium (`Cr`), Cobalt (`Co`), Copper (`Cu`)
- **Nutritional Minerals Excluded from Toxicity Grading:** Iron (`Fe`), Zinc (`Zn`)

### Standard Resolution Order

`standardResolverService` resolves the primary applicable limit per contaminant and product matrix in order:

1. **Primary National (`PRIMARY_NATIONAL`):** **PSQCA** (Pakistan Standards & Quality Control Authority)
2. **International Fallback (`INTERNATIONAL_FALLBACK`):** **Codex Alimentarius** (`CXS 193-1995`) → **European Union** (`EU 2023/915`)
3. **Secondary Comparison (`SECONDARY_COMPARISON`):** Supplemental Codex / EU reference limits when a national limit already serves as primary

### Deterministic Scoring (`ruleVersion = "1.0.0"`)

- **Contamination Limit Ratio:** `CLR = concentration / limitValue` (with automatic unit normalization and matrix/basis compatibility checks; `BELOW_LOD` is evaluated conservatively against the limit).
- **Cumulative Contamination Index (`CCI`):** Mean of eligible per-contaminant CLRs (`MIN_ELIGIBLE_NOT_MET` / `Insufficient Data` when eligibility thresholds are not met).
- **Decision-Support Grades:** `A` through `F` computed deterministically alongside exact status strings and reason codes from `src/constants/status.constants.ts`.

---

## 📁 Project Structure

```text
SafeBite-Backend/
├── analysis/               # Dataset coverage, barcode, standards gap & logo reports
├── plan/                   # RAG & model implementation plan
├── prisma/
│   ├── data/               # Cleaned product/barcode workbooks & PSQCA standards Excel
│   ├── mappings/           # Category, barcode recovery, display & PSQCA mappings
│   ├── migrations/         # Versioned Prisma SQL migrations
│   ├── schema.prisma       # PostgreSQL + pgvector Prisma schema
│   ├── seed.ts             # Master seed orchestrator
│   ├── seed-products.ts    # Products, barcodes, measurements & analyses seeder
│   └── seed-standards.ts   # Categories & PSQCA standards seeder
├── scripts/
│   ├── get_breakdown_stats.ts
│   └── test-endpoints.ts   # E2E API regression test suite
├── src/
│   ├── config/             # Env validation (Zod) & Prisma singleton
│   ├── constants/          # Status catalogue, reason codes & contaminant registry
│   ├── controllers/        # Route handlers
│   ├── middlewares/        # Auth, Zod validation, rate limiting, error handler
│   ├── routes/             # Express 5 route modules
│   ├── services/           # CLR, scoring, safety engine, standards resolver, auth, S3, email
│   ├── utils/              # Logger, AppError, barcode & Swagger helpers
│   └── validators/         # Zod request schemas
├── docker-compose.yml      # Local pgvector PostgreSQL 15 service
├── openapi.json            # OpenAPI 3.0 specification
└── SafeBite_SRS_V4_1.md    # Software Requirements Specification v4.1
```

---

## 🗓 Roadmap & Implementation Status

- [x] Express 5 + TypeScript + Prisma + PostgreSQL 15 (`pgvector`) backend foundation
- [x] 14-model Prisma schema & migrations (including `ProductType` & `isConsumerFacing`)
- [x] Cleaned dataset ingestion: 519 products, 848 GS1-validated barcodes, 1,693 measurements, 38 sources, 192 regulatory limits
- [x] Deterministic safety engine (`CLR`, `CCI`, `A–F` grades, `BELOW_LOD` handling, `PSQCA → Codex → EU` resolution)
- [x] Full REST API: auth + email OTP, products, barcodes, categories, safety, alternatives, standards, user history/favorites/watchlist/health-profile, and AWS S3 storage
- [x] Swagger UI (`/docs`), OpenAPI spec (`/openapi.json`), and E2E API regression suite (`npm run test:e2e`)
- [ ] RAG embedding pipeline (`VectorStore` ingestion from the 38 research PDFs) and `POST /api/chat` assistant endpoint
- [ ] Production AWS deployment (EC2 + RDS + Nginx + PM2) and CI/CD pipeline

---

## 📄 License

Licensed under the [MIT License](LICENSE).
