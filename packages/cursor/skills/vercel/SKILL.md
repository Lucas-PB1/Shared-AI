---
name: vercel
description: >-
  Orienta deploy na Vercel: project settings, serverless Nest/Next, env e
  região. Use ao configurar vercel.json, CLI Vercel ou deploy de API/front.
---

# Vercel

## Quando usar

- Deploy de Next.js ou Nest serverless
- `vercel.json`, env de preview/production
- CLI (`vercel`, `vercel dev`)

## Princípios

- Env por ambiente (Preview ≠ Production); secrets só no dashboard/CLI
- Região próxima aos usuários/dados (ex.: `gru1` com Supabase BR)
- Build command e output alinhados ao framework
- Não commitar tokens `.vercel` sensíveis

## Referências

| Tópico | Arquivo |
| --- | --- |
| Projetos e env | [references/projects-and-env.md](references/projects-and-env.md) |
| Nest serverless | [references/nest-serverless.md](references/nest-serverless.md) |

## Como aplicar

1. Confirmar build local (`next build` / `nest build`)
2. Mapear env vars necessárias na Vercel
3. Ajustar `vercel.json` (rotas, região) se o repo já usar
4. Validar preview antes de production

## Anti-padrões comuns

- Service role / DATABASE_URL no front
- Timeout serverless ignorado em cold start pesado
- Região longe do Postgres (latência)

## Relacionado

- `next`, `nestjs`, `ci-cd`, `env-secrets`, `supabase`
