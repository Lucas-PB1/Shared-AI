# Directory Update Log

## 2026-08-13

* **Creation**: Dashboard Next.js em `apps/web` — Auth Supabase (sem confirmação de e-mail), FSD, membership (`profiles` / `project_members`), claim owner e listagem de runs. Concept [dashboard-web](dashboard-web.md). Migration `20260813140000_dashboard_auth.sql`.

## 2026-08-10

* **Update**: Store grava resultados só pós-merge (ingest); limpa runs/findings/decisions/exclusions/conventions de teste; projects mantidos.
* **Update**: Inlines do Avaliar **não** são deletados ao re-avaliar/corrigir código; purge só com `REVIEW_AVALIAR_INLINE_PURGE=1`.
* **Update**: Cobertura rica no store — `review_runs.meta` (files/reports/verdicts), findings com body/severity no publish e dual-write.
* **Update**: Adapt hostdime-hub (CI + docs) ao store evolutivo; slug via git remote / `hostdime-hub`.
* **Update**: Memória evolutiva — dual-write promove exclusions (rejeitado) e conventions (≥2 aceito); findings no finalize; docs do modelo.
* **Update**: Store-only — `link-project` remove `.cursor/review/` em todos os projetos e limpa gitignores; sem paths legados no monorepo.
* **Update**: Bundle OKF v0.1 sob `docs/okf/` — migration dos docs planos anteriores (planos de fase removidos).
* **Creation**: Concepts [review-store](review-store.md), [schema](review-store-schema.md), [código](review-store-code.md), [local](supabase-local.md), [cloud](supabase-cloud.md), [windows](windows.md), [convenções](docs-conventions.md).
