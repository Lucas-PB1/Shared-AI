# HostDime Review — dashboard

Next.js App Router + Supabase Auth (JWT/RLS). Ver playbook OKF: [`docs/okf/dashboard-web.md`](../../docs/okf/dashboard-web.md).

```bash
# na raiz do monorepo
npm install
npm run supabase:start   # ou cloud
npm run supabase:reset   # aplica migrations + seed
npm run dev:web
```

Requer `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env` da raiz.
