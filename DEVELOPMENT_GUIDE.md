# 🛡️ SafeBite Backend — Local Development & Execution Guide

This guide explains how to start, develop, inspect, and test the SafeBite Backend API on your local machine using Docker, Node.js, and Prisma.

---

## 📋 Prerequisites

Before starting, ensure you have:
* **Node.js**: v20.12+ or v24+ (Run `node -v` to check)
* **Docker Desktop**: Running and active (Run `docker ps` to verify)
* **npm**: Installed with Node.js

---

## 🚀 Step-by-Step Setup & Running

### Step 1: Start the Local PostgreSQL + pgvector Container
SafeBite uses PostgreSQL 15 with the `pgvector` extension (for AI embeddings). Start it in the background:

```powershell
docker compose up -d
```
* **Container Name**: `safebite-postgres`
* **Exposed Port**: `5432`
* **Default Database**: `safebite`
* **Default Credentials**: user: `postgres`, password: `postgres`

To verify the container is running:
```powershell
docker ps
```

---

### Step 2: Environment Configuration
Environment variables are read directly from `.env` using Node's native `process.loadEnvFile()` (no external packages required).

If you don't already have `.env`, copy it from `.env.example`:
```powershell
Copy-Item .env.example .env
```

Default local database string in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/safebite?schema=public
```

---

### Step 3: Run Database Migrations
Apply the Prisma schema migrations to ensure all database tables and extensions are created:

```powershell
npm run prisma:migrate
```

To re-generate the Prisma Client types at any time:
```powershell
npm run prisma:generate
```

---

### Step 4: Start the Development Server
Run the Express server in hot-reload watch mode using `tsx`:

```powershell
npm run dev
```

You will see:
```text
🚀 Server running in [development] mode on port 3000
📑 API Documentation: http://localhost:3000/docs
🩺 Health check: http://localhost:3000/health
```

---

## 🔍 How to View and Manage Database Data

### Option A: Prisma Studio (Recommended — Instant Web UI)
Prisma includes a visual data browser out of the box. Run:

```powershell
npm run prisma:studio
```
* Automatically opens in your browser at: **`http://localhost:5555`**
* You can visually view, search, filter, insert, edit, and delete rows in any table (`users`, `products`, `categories`, `research_data`, `reference_standards`, `analysis_results`, etc.).

---

### Option B: External GUI Client (DBeaver, pgAdmin, TablePlus)
Connect using standard PostgreSQL connection parameters:
* **Host**: `localhost`
* **Port**: `5432`
* **Database**: `safebite`
* **Username**: `postgres`
* **Password**: `postgres`
* **SSL**: Disabled (for local Docker)

---

### Option C: Docker Command Line (`psql`)
Access the database CLI directly inside the running container:

```powershell
docker exec -it safebite-postgres psql -U postgres -d safebite
```

Useful commands inside `psql`:
```sql
\dt                                  -- List all tables
\d users                             -- Inspect the users table columns
SELECT id, email, role, created_at FROM users;
\q                                   -- Exit psql
```

---

## 🛠️ Verification & Quality Commands

| Command | Purpose |
| :--- | :--- |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `npm run build` | Compiles TypeScript code to production JavaScript in `dist/` |
| `npm run dev` | Runs the development server with hot-reloading |
| `npm run prisma:studio` | Launches the visual Prisma Studio web browser on port 5555 |
| `npm run prisma:migrate` | Applies pending database migrations |

---

## 📡 API Endpoints & Documentation

Once the server is running (`npm run dev`), interactive Swagger documentation is available at:
👉 **`http://localhost:3000/docs`**

Core endpoints currently available:
* **Liveness Probe**: `GET /health`
* **Deep Readiness Probe**: `GET /ready` (verifies PostgreSQL and pgvector status)
* **User Registration**: `POST /api/auth/signup`
* **User Login**: `POST /api/auth/login`
* **User Profile**: `GET /api/auth/profile` (requires `Authorization: Bearer <token>`)
* **File Upload**: `POST /api/storage/upload` (AWS S3)

---

## 🛑 Stopping the Environment

To stop the Express server: press `Ctrl + C` in the terminal.

To stop the Docker container without losing data:
```powershell
docker compose stop
```

To restart it later:
```powershell
docker compose start
```
