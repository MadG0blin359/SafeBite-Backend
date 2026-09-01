┌─────────────────────────────────────────────────────────────┐
│                    AWS Free Tier Account                    │
│  ┌─────────────────┐         ┌──────────────────────────┐   │
│  │   S3 Bucket     │         │    EC2 t2.micro (1GB)    │   │
│  │  safebite-assets│         │  ┌────────────────────┐  │   │
│  │                 │         │  │   Nginx (80/443)   │  │   │
│  │ • Product imgs  │         │  │        ↓           │  │   │
│  │ • Research PDFs │         │  │  PM2 + Node.js 20  │  │   │
│  │ • App assets    │         │  │  ┌──────────────┐  │  │   │
│  └─────────────────┘         │  │  │ Express + TS │  │  │   │
│                              │  │  │  ┌────────┐  │  │  │   │
│                              │  │  │  │Prisma  │  │  │  │   │
│  ┌─────────────────┐         │  │  │  │ Client │  │  │  │   │
│  │  RDS PostgreSQL │◄────────┘  │  │  └───┬────┘  │  │  │   │
│  │  db.t3.micro    │   SSL/TLS  │  │      │       │  │  │   │
│  │                 │            │  └──────┼───────┘  │  │   │
│  │ • Products      │            │         │          │  │   │
│  │ • ResearchData  │            └─────────┼──────────┘  │   │
│  │ • ReferenceStd  │                      │             │   │
│  │ • VectorStore   │◄─────────────────────┘             │   │
│  │   (pgvector)    │         OpenAI API (HTTPS)         │   │
│  └─────────────────┘                                    │   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  React Native   │
                    │   (Expo Go)     │
                    │   Mobile App    │
                    └─────────────────┘


| Section                             | Content                                                                                                                       | Pages | Owner    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| **Title Page**                      | Project name, team members, supervisor, department, date                                                                      | 1     | All      |
| **Anti-Plagiarism Declaration**     | Signed by all members                                                                                                         | 1     | All      |
| **Abstract**                        | 250 words: problem, method, expected contribution                                                                             | 1     | Member 3 |
| **Table of Contents**               | Auto-generated                                                                                                                | 2     | All      |
| **1. Introduction**                 | Context, background, why this matters                                                                                         | 3–4   | Member 3 |
| **1.1 Problem Statement**           | The gap: Pakistani consumers lack accessible food safety info                                                                 | 2     | Member 3 |
| **1.2 Objectives**                  | 5–6 SMART objectives                                                                                                          | 1     | All      |
| **1.3 Motivation**                  | Personal + societal relevance                                                                                                 | 2     | Member 3 |
| **2. Literature Review**            | 15–20 peer-reviewed papers on food safety informatics, heavy metal contamination in Pakistan, mobile health apps, RAG systems | 5–7   | Member 3 |
| **2.1 Existing Systems**            | Compare 3–4 existing apps (Yuka, Open Food Facts, etc.) — identify their limitations                                          | 2–3   | Member 3 |
| **2.2 Research Gap**                | What NONE of the existing systems do for Pakistani consumers                                                                  | 1     | Member 3 |
| **3. Proposed System**              | High-level description                                                                                                        | 2     | All      |
| **3.1 Functional Requirements**     | 14 features listed above, each with use case                                                                                  | 3–4   | Member 1 |
| **3.2 Non-Functional Requirements** | Performance, security, scalability, usability                                                                                 | 2     | Member 2 |
| **4. Methodology**                  | SDLC model (Agile/Scrum), development phases                                                                                  | 2     | All      |
| **5. System Architecture**          | Diagram + component explanation                                                                                               | 3–4   | Member 2 |
| **5.1 Database Design**             | ERD + schema explanation + normalization justification                                                                        | 3–4   | Member 3 |
| **5.2 API Design**                  | REST endpoint specification (OpenAPI/Swagger style)                                                                           | 2–3   | Member 2 |
| **5.3 RAG Pipeline Architecture**   | Embed → Store → Retrieve → Generate flow                                                                                      | 2–3   | Member 2 |
| **6. Technology Stack**             | Every technology with justification and comparison                                                                            | 3–4   | Member 2 |
| **7. Use Case Diagram**             | UML                                                                                                                           | 1     | Member 1 |
| **8. Activity Diagrams**            | (3–4) Barcode scan, Safety lookup, Chatbot query                                                                              | 2–3   | Member 1 |
| **9. Sequence Diagrams**            | Barcode → API → DB → Response; RAG flow                                                                                       | 2–3   | Member 2 |
| **10. Timeline / Gantt Chart**      | FYP-1 and FYP-2 milestones                                                                                                    | 2     | All      |
| **11. Testing Plan**                | Unit, integration, system, user acceptance                                                                                    | 2     | Member 2 |
| **12. Expected Results**            | What the final system will deliver                                                                                            | 1     | All      |
| **13. Limitations**                 | Honest constraints: data incompleteness, API costs, no real-time testing                                                      | 1     | All      |
| **14. Future Enhancements**         | Auth, admin dashboard, push notifications, local LLM                                                                          | 1     | All      |
| **15. References**                  | IEEE / APA format, 20+ sources                                                                                                | 2–3   | Member 3 |



| Day       | Action                                                                                                                                            | Owner    | Deliverable                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| **1–2**   | **Fix data integrity issues** — unique IDs, correct "Natoional" typo, verify honey units, fix chocolate company names, resolve noodle duplication | Member 3 | Cleaned dataset v2.0                |
| **1–2**   | **Reclassify metals** — separate toxic contaminants (Pb, Cd, Cr, Co, Cu) from nutrients (Fe, Zn)                                                  | Member 3 | Updated data dictionary             |
| **3–4**   | **Collect reference standards** — populate ReferenceStandard table with Codex + EU limits for all 20 categories                                   | Member 3 | Standards matrix (Excel)            |
| **3–4**   | **Initialize backend repo** — Node.js 20 + Express + TypeScript + Prisma + ESLint + Prettier                                                      | Member 2 | Working repo on GitHub              |
| **5–6**   | **Write Prisma schema** — implement all 7 tables above, run first migration                                                                       | Member 2 | `schema.prisma` + migration files   |
| **5–6**   | **Seed database** — import cleaned dataset into PostgreSQL via Prisma seed script                                                                 | Member 2 | `prisma/seed.ts`                    |
| **7–8**   | **Initialize mobile repo** — Expo project with TypeScript, React Navigation, folder structure                                                     | Member 1 | Working repo on GitHub              |
| **7–8**   | **Implement barcode scanner UI** — camera permission, scanner component, mock data display                                                        | Member 1 | Screen recording of scanner working |
| **9–10**  | **Build first API endpoint** — `GET /api/products/:barcode` with Prisma query                                                                     | Member 2 | Postman collection + test           |
| **9–10**  | **Design RAG pipeline** — system prompt draft, embedding strategy, context assembly logic                                                         | Member 2 | Architecture document (1 page)      |
| **11–12** | **Create defense proposal draft** — Introduction, Problem Statement, Objectives, Motivation                                                       | All      | Proposal sections 1–3 draft         |
| **13–14** | **Supervisor review meeting** — Present cleaned data, schema, API demo, proposal draft                                                            | All      | Feedback document                   |

Sign up NOW:
Groq: https://console.groq.com/keys — create account, generate API key. Free tier: 1,000,000 tokens/day, 20 requests/minute.
OpenAI: https://platform.openai.com/ — create account, verify phone number. You get $5 free credit for 3 months.
AWS: https://aws.amazon.com/free/ — create account with your university email. You get 12 months free tier.

Sources to use:
Codex: https://www.fao.org/fao-who-codexalimentarius/sh-proxy/en/?lnk=1&url=https%3A%2F%2Fworkspace.fao.org%2Fsites%2Fcodex%2FStandards%2FCXS%2B193-1995%2FCXS_193e.pdf
EU: https://food.ec.europa.eu/system/files/2023-03/reg-2023-915_contaminants_en.pdf
PSQCA: Search http://www.psqca.com.pk/ for Pakistani Standards (PS). Many are not digitized — use only if you find explicit numbers.

| Priority      | Standard                            | Role                         | Source                                                                                      |
| ------------- | ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Primary**   | **Codex Alimentarius (CAC)**        | Main comparison benchmark    | FAO/WHO General Standard for Contaminants and Toxins in Food and Feed (CODEX STAN 193-1995) |
| **Secondary** | **EU Regulation (EC) No 1881/2006** | Stringent regional benchmark | European Commission — most comprehensive documented limits                                  |
| **Tertiary**  | **PSQCA (Pakistan)**                | Local relevance              | Pakistan Standards and Quality Control Authority — where explicitly documented              |


| #  | Feature                                  | Technical Implementation                                                                  |
| -- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1  | **Barcode Product Scanner**              | `expo-camera` + `expo-barcode-scanner`                                                    |
| 2  | **Product Lookup by Barcode**            | `GET /api/products/:barcode` → Prisma → PostgreSQL                                        |
| 3  | **Heavy Metal Safety Analysis**          | Compare research data against `ReferenceStandards` table                                  |
| 4  | **Standardized Safety Scoring**          | Deterministic algorithm: weighted comparison against primary/secondary/tertiary standards |
| 5  | **Contaminant-by-Contaminant Breakdown** | Per-metal display with availability indicators                                            |
| 6  | **Research Evidence Transparency**       | Source URL, study metadata, measurement type                                              |
| 7  | **Safer Alternative Recommendations**    | SQL query: same category, sort by lower contamination                                     |
| 8  | **Food Category Explorer**               | Browse all categories, filter by contaminant                                              |
| 9  | **Search & Scan History**                | AsyncStorage (local) or PostgreSQL (if auth added)                                        |
| 10 | **Favorites / Watchlist**                | Local storage or user-specific DB table                                                   |
| 11 | **Offline/Cached Results**               | AsyncStorage cache with TTL                                                               |
| 12 | **Educational Content About Metals**     | Static content + chatbot dynamic explanations                                             |

| Layer               | Technology                                            | Justification                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile App**      | **React Native + Expo + TypeScript**                  | Your team knows React. Expo eliminates native Android/iOS build complexity. TypeScript enables type sharing with backend.                                                                          |
| **Backend**         | **Node.js 20 LTS + Express + TypeScript**             | You are the sole backend developer with advanced JavaScript skills. Express is minimal and forces you to design your own architecture — a jury respects explicit engineering over framework magic. |
| **ORM**             | **Prisma**                                            | Schema-first, auto-generates TypeScript types, version-controlled migrations via Prisma Migrate, excellent PostgreSQL support.                                                                     |
| **Database**        | **PostgreSQL 15 + pgvector extension**                | ACID compliance for research data. pgvector enables semantic search without adding a separate vector database.                                                                                     |
| **AI / LLM**        | **OpenAI API (GPT-4o-mini + text-embedding-3-small)** | GPT-4o-mini is the cheapest capable model (\$0.60/million input tokens). text-embedding-3-small is \$0.02/million tokens. For 262 records, total embedding cost is ~\$0.01.                        |
| **AI Fallback**     | **LLM Provider Abstraction Layer**                    | You have zero budget. I am mandating an interface-based architecture so you can swap to Groq (free tier) or local models if OpenAI credit expires.                                                 |
| **Cloud**           | **AWS Free Tier**                                     | EC2 t2.micro + RDS db.t3.micro + S3. 12 months free. Industry-standard. Valuable for job interviews.                                                                                               |
| **Process Manager** | **PM2**                                               | Production-grade Node.js process management on EC2.                                                                                                                                                |
| **Reverse Proxy**   | **Nginx**                                             | SSL termination, static file serving, rate limiting.                                                                                                                                               |
| **CI/CD**           | **GitHub Actions**                                    | Free for public repositories. Automated testing and deployment.                                                                                                                                    |
| **Version Control** | **Git + GitHub**                                      | Two repositories: `safebite-backend` and `safebite-mobile`.                                                                                                                                        |
