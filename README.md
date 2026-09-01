<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-Vector_Search-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Groq-Fallback_LLM-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/AWS-Free_Tier-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS" />
</p>

# 🛡️ SafeBite — Backend API

> **AI-powered food safety intelligence for Pakistani consumers.**
>
> SafeBite analyzes heavy metal contamination in everyday food products, compares findings against international safety standards (Codex Alimentarius, EU, PSQCA), and delivers actionable safety insights through a mobile app — powered by a RAG-based AI chatbot.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [RAG Pipeline](#-rag-pipeline)
- [Safety Standards](#-safety-standards)
- [Project Roadmap](#-project-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

Pakistani consumers lack accessible, evidence-based information about food safety — particularly regarding heavy metal contamination in locally available products. SafeBite bridges this gap by:

- **Scanning barcodes** to instantly retrieve product safety data
- **Analyzing contamination levels** against three tiers of international standards
- **Generating safety scores** using a deterministic, weighted algorithm
- **Recommending safer alternatives** within the same product category
- **Answering questions** via an AI chatbot grounded in real research data (RAG)

---

## 🏗 Architecture

```
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
```

**Key components:**

| Component         | Service              | Purpose                                      |
| ----------------- | -------------------- | -------------------------------------------- |
| **Compute**       | EC2 t2.micro         | Hosts the Express API behind Nginx           |
| **Database**      | RDS PostgreSQL 15    | Stores products, research data, and vectors  |
| **Object Storage** | S3                   | Product images, research PDFs, app assets    |
| **AI**            | OpenAI API           | GPT-4o-mini (chat) + text-embedding-3-small  |
| **Client**        | React Native (Expo)  | Cross-platform mobile app                    |

---

## ✨ Features

| #  | Feature                              | Technical Implementation                                                 |
| -- | ------------------------------------ | ------------------------------------------------------------------------ |
| 1  | **Barcode Product Scanner**          | `expo-camera` + `expo-barcode-scanner`                                   |
| 2  | **Product Lookup by Barcode**        | `GET /api/products/:barcode` → Prisma → PostgreSQL                       |
| 3  | **Heavy Metal Safety Analysis**      | Compare research data against `ReferenceStandards` table                 |
| 4  | **Standardized Safety Scoring**      | Deterministic algorithm: weighted comparison against tiered standards     |
| 5  | **Contaminant-by-Contaminant View**  | Per-metal display with availability indicators                           |
| 6  | **Research Evidence Transparency**   | Source URL, study metadata, measurement type                             |
| 7  | **Safer Alternative Recommendations** | SQL query: same category, sorted by lower contamination                 |
| 8  | **Food Category Explorer**           | Browse all categories, filter by contaminant                             |
| 9  | **Search & Scan History**            | AsyncStorage (local) or PostgreSQL (if auth added)                       |
| 10 | **Favorites / Watchlist**            | Local storage or user-specific DB table                                  |
| 11 | **Offline/Cached Results**           | AsyncStorage cache with TTL                                              |
| 12 | **Educational Content About Metals** | Static content + chatbot dynamic explanations                            |

---

## 🧰 Tech Stack

| Layer               | Technology                                            | Justification                                                                                                                     |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile App**      | React Native + Expo + TypeScript                      | Cross-platform with Expo; TypeScript enables shared types with backend                                                            |
| **Backend**         | Node.js 20 LTS + Express + TypeScript                 | Minimal framework for explicit architecture design; sole backend developer with advanced JS skills                                |
| **ORM**             | Prisma                                                | Schema-first, auto-generated TypeScript types, version-controlled migrations, excellent PostgreSQL support                        |
| **Database**        | PostgreSQL 15 + pgvector                              | ACID compliance for research data; pgvector enables semantic search without a separate vector database                            |
| **AI / LLM**        | OpenAI API (GPT-4o-mini + text-embedding-3-small)     | GPT-4o-mini: $0.60/M input tokens; text-embedding-3-small: $0.02/M tokens; ~$0.01 total for 262 records                          |
| **AI Fallback**     | LLM Provider Abstraction Layer                        | Interface-based architecture enables hot-swapping to Groq (free tier) or local models                                            |
| **Cloud**           | AWS Free Tier                                         | EC2 t2.micro + RDS db.t3.micro + S3; 12 months free; industry-standard                                                           |
| **Process Manager** | PM2                                                   | Production-grade Node.js process management on EC2                                                                                |
| **Reverse Proxy**   | Nginx                                                 | SSL termination, static file serving, rate limiting                                                                               |
| **CI/CD**           | GitHub Actions                                        | Free for public repos; automated testing and deployment                                                                           |
| **Version Control** | Git + GitHub                                          | Two repositories: `SafeBite-Backend` and `SafeBite-Mobile`                                                                        |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 LTS
- **PostgreSQL** 15+ with the `pgvector` extension
- **npm** or **yarn**

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/safebite?schema=public"
OPENAI_API_KEY="sk-..."
GROQ_API_KEY="gsk_..."          # optional fallback
PORT=3000
NODE_ENV=development
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/SafeBite-Backend.git
cd SafeBite-Backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start the development server
npm run dev
```

The server will start at `http://localhost:3000`.

---

## 📡 API Endpoints

| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| `GET`  | `/api/products/:barcode`       | Look up a product by barcode             |
| `GET`  | `/api/products`                | List all products (with pagination)      |
| `GET`  | `/api/categories`              | Browse all food categories               |
| `GET`  | `/api/categories/:id/products` | Products in a specific category          |
| `GET`  | `/api/safety/:productId`       | Safety analysis for a product            |
| `GET`  | `/api/alternatives/:productId` | Safer alternatives in the same category  |
| `POST` | `/api/chat`                    | RAG-powered chatbot query                |

> **Note:** Full API documentation is available via Swagger UI at `/api-docs` when the server is running.

---

## 🗄 Database Schema

The database consists of 7 core tables:

```
Products ──────────┐
                    ├──► ResearchData ──► ReferenceStandards
Categories ────────┘
                         VectorStore (pgvector)
```

| Table                  | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `Products`             | Barcode, name, brand, category, image URL                  |
| `Categories`           | Food category taxonomy (20 categories)                     |
| `ResearchData`         | Heavy metal measurements from peer-reviewed studies        |
| `ReferenceStandards`   | Safety limits from Codex, EU, and PSQCA                    |
| `VectorStore`          | Embeddings for RAG semantic search (pgvector)              |

---

## 🤖 RAG Pipeline

The Retrieval-Augmented Generation pipeline follows a four-step flow:

```
┌───────────┐    ┌───────────┐    ┌────────────┐    ┌────────────┐
│  Embed    │ →  │   Store   │ →  │  Retrieve  │ →  │  Generate  │
│  (OpenAI) │    │ (pgvector)│    │  (cosine)  │    │ (GPT-4o)   │
└───────────┘    └───────────┘    └────────────┘    └────────────┘
```

1. **Embed** — Research data and product info are embedded using `text-embedding-3-small`
2. **Store** — Vectors are stored in PostgreSQL via the `pgvector` extension
3. **Retrieve** — User queries are embedded and matched against stored vectors using cosine similarity
4. **Generate** — Retrieved context + user query are sent to GPT-4o-mini for grounded responses

---

## 📊 Safety Standards

SafeBite compares contamination data against a three-tier hierarchy of international food safety standards:

| Priority      | Standard                           | Role                         | Source                                                                                      |
| ------------- | ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Primary**   | Codex Alimentarius (CAC)           | Main comparison benchmark    | FAO/WHO General Standard for Contaminants and Toxins in Food and Feed (CODEX STAN 193-1995) |
| **Secondary** | EU Regulation (EC) No 1881/2006    | Stringent regional benchmark | European Commission — most comprehensive documented limits                                  |
| **Tertiary**  | PSQCA (Pakistan)                   | Local relevance              | Pakistan Standards and Quality Control Authority — where explicitly documented              |

**Contaminant classification:**
- **Toxic contaminants** (analyzed): Lead (Pb), Cadmium (Cd), Chromium (Cr), Cobalt (Co), Copper (Cu)
- **Nutritional minerals** (separated): Iron (Fe), Zinc (Zn)

---

## 🗓 Project Roadmap

### Phase 1 — Foundation (Days 1–6)

- [x] Initialize backend repo (Node.js 20 + Express + TypeScript + Prisma)
- [ ] Clean and validate dataset (fix typos, duplicates, unit inconsistencies)
- [ ] Reclassify metals — separate toxic contaminants from nutrients
- [ ] Collect and populate reference standards (Codex + EU limits for 20 categories)
- [ ] Write Prisma schema (7 tables) and run first migration
- [ ] Seed database with cleaned dataset

### Phase 2 — Core API (Days 7–10)

- [ ] Build `GET /api/products/:barcode` endpoint
- [ ] Implement safety analysis engine
- [ ] Design RAG pipeline architecture
- [ ] Build chatbot endpoint (`POST /api/chat`)

### Phase 3 — Integration & Deployment (Days 11–14)

- [ ] Deploy to AWS (EC2 + RDS + S3)
- [ ] Configure Nginx reverse proxy with SSL
- [ ] Set up PM2 process manager
- [ ] Configure GitHub Actions CI/CD pipeline

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed as a Final Year Project (FYP). Please contact the team for licensing inquiries.

---

<p align="center">
  <sub>Built with ❤️ for safer food choices in Pakistan</sub>
</p>
