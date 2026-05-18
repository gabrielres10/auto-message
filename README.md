# Auto Message

A production-ready WhatsApp message scheduling application — monorepo.

## Architecture

```
auto-message/
├── apps/
│   ├── web/          # Next.js 15 — App Router, TypeScript, TailwindCSS, NextAuth
│   └── worker/       # BullMQ worker — processes scheduled messages via whatsapp-web.js
├── packages/
│   └── shared/       # Shared TypeScript types (job data, DTOs)
├── prisma/
│   └── schema.prisma # Database schema (PostgreSQL / NeonDB)
├── docker-compose.yml
└── .env.example
```

## Tech Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15, TypeScript, TailwindCSS |
| Auth | NextAuth v4 (Google OAuth + Prisma adapter) |
| Database | PostgreSQL via NeonDB, Prisma ORM |
| Queue | Redis + BullMQ |
| WhatsApp | whatsapp-web.js (Puppeteer) |
| Infrastructure | Docker (Redis only — DB is hosted on NeonDB) |

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Redis)
- [NeonDB](https://neon.tech) account — create a project and copy the connection string
- Google OAuth credentials (console.cloud.google.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_*
```

Generate a secure NextAuth secret:

```bash
openssl rand -base64 32
```

### 3. Start Redis

```bash
npm run docker:up
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to NeonDB (development — no migration history)
npm run db:push

# OR create a tracked migration
npm run db:migrate
```

### 5. Run the applications

Open two terminals:

```bash
# Terminal 1 — Next.js web app  (http://localhost:3000)
npm run dev

# Terminal 2 — BullMQ worker
npm run dev:worker
```

On first worker start, a WhatsApp QR code will be printed in the terminal.
Scan it with your phone to authenticate.

---

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the web app (Next.js dev server) |
| `npm run dev:worker` | Start the worker (tsx watch) |
| `npm run build` | Build all packages |
| `npm run docker:up` | Start Redis via Docker Compose |
| `npm run docker:down` | Stop Docker services |
| `npm run db:generate` | Generate / regenerate Prisma client |
| `npm run db:push` | Push schema changes (no migration file) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:migrate:prod` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio |

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/messages` | List scheduled messages for the current user |
| `POST` | `/api/messages` | Schedule a new message |
| `GET` | `/api/messages/:id` | Get a single message |
| `DELETE` | `/api/messages/:id` | Cancel a pending message |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth endpoints |

### POST /api/messages — request body

```json
{
  "recipient": "5491112345678@c.us",
  "content": "Hello from Auto Message!",
  "scheduledAt": "2026-06-01T10:00:00.000Z"
}
```

## Environment Variables

See [.env.example](.env.example) for the full list with descriptions.

## Data Flow

```
User → POST /api/messages
         │
         ▼
   Create DB record (PENDING)
         │
         ▼
   Enqueue BullMQ job with delay
         │
         ▼ (at scheduledAt time)
   Worker picks up job
         │
         ▼
   Update DB → PROCESSING
         │
         ▼
   whatsapp-web.js sends message
         │
         ▼
   Update DB → SENT / FAILED
```
