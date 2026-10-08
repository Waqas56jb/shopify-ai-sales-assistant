# Admin — Desk & Day AI Assistant

React admin panel with Lucide icons, charts, knowledge base, training controls, and widget color settings.

## Run

```bash
cd admin
npm install
npm run dev
```

Open: http://localhost:5175/

## Demo login

- Email: `admin@deskday.com`
- Password: `Admin@123`

## Supabase

Add to `admin/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Until configured, the panel runs in local demo mode with in-memory data.
