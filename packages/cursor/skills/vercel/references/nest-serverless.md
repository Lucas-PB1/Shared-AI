# Nest serverless

- Entry compatível com Vercel (handler / `vercel.json` rewrites)
- `vercel dev` para simular runtime local
- Evitar estado in-memory entre requests; conexões DB com pool adequado (PgBouncer)
- Cold start: imports pesados e sync schema na boot são custo
