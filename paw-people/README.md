# Paw People — Treatment Log Platform

A mobile-first treatment logging app for the Paw People NGO (Bhopal). Built with Next.js + Supabase.

## Run locally (3 steps)

```bash
npm install
npm run dev
```

Open http://localhost:3000 → redirects to dashboard.

The `.env.local` file already has the Supabase keys baked in. Schema should already be in your Supabase project.

## What's built

| Screen | Route | Does |
|---|---|---|
| Dashboard | `/dashboard` | Today's follow-ups, overdue alerts, low stock, all active patients |
| Patients | `/dogs` | List, search, filter by status |
| Add patient | `/dogs/new` | New dog profile form |
| Dog profile | `/dogs/[id]` | Full history: treatments, follow-ups, diagnostics. Share button generates WhatsApp-ready summary |
| Log treatment | `/treatments/new` | Log treatment → auto-deducts inventory. Schedule follow-up in same form |
| Inventory | `/inventory` | Stock levels, low-stock alerts, restock inline |

## Key behaviours
- Logging a treatment auto-deducts medicine quantity (Supabase trigger)
- Follow-ups can be scheduled directly from the treatment log form
- Dog profile share button → WhatsApp-ready text summary
- Low stock alert fires when quantity ≤ threshold
- Dashboard shows follow-ups due today + next 7 days

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add these environment variables in the Vercel dashboard (Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both values are in your local `.env.local`. After adding them, redeploy: `vercel --prod`.

## Deploy to Netlify (alternative)

1. Push to a GitHub repo
2. Go to netlify.com → New site from Git → pick the repo
3. Build command: `npm run build` · Publish directory: `.next`
4. Add the two env vars under Site settings → Environment variables
5. Deploy

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres + auto triggers)
- Tailwind CSS
- TypeScript
- lucide-react icons
- date-fns
