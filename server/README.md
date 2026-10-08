# Server — Desk & Day AI Assistant API

Node.js + Express + OpenAI streaming chat API.

## Setup

```bash
cd server
cp .env.example .env
```

Put your key in `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3001
CLIENT_ORIGIN=http://localhost:5174
```

```bash
npm install
npm run dev
```

## Database (Supabase)

All tables use a unique prefix to avoid overlap with other projects:

`shopify_store_database_*`

```bash
npm run db:migrate
npm run db:verify
```

## Endpoints

- `GET /api/health`
- `GET /api/knowledge`
- `POST /api/chat` — SSE stream (`token`, `recommendations`, `done`, `error`)
- `GET/POST/PATCH /api/admin/leads`
- `GET/POST /api/admin/conversations`
- `GET/POST/PATCH/DELETE /api/admin/knowledge`
- `GET/POST /api/admin/training`
- `POST /api/admin/training/process`
- `GET/PUT /api/admin/settings/widget`
