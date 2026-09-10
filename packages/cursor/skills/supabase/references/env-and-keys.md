# Env e keys

| Variável típica | Onde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | público |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / anon | público |
| `SUPABASE_SECRET_KEY` / service role | **somente server** |

- Local: Docker/`supabase start`; copiar keys de `supabase status`
- Nunca commitar `.env` com secrets reais
