---
okf_version: "0.1"
---

# HostDime IA — knowledge bundle

Documentação operacional do monorepo em **[Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)** (Google Cloud).  
Cada arquivo abaixo (exceto este índice e [log.md](log.md)) é um **concept** com frontmatter `type`.

## Como usar este bundle

* [Convenções de documentação](docs-conventions.md) - padrão OKF neste repositório
* [Log do bundle](log.md) - mudanças no conhecimento

## Review store

* [Review store](review-store.md) - fonte de verdade, arquitetura e status
* [Schema do store](review-store-schema.md) - tabelas, RLS, env
* [Código do store](review-store-code.md) - port, CLIs, dual-write
* [Supabase local](supabase-local.md) - Docker + smoke
* [Supabase cloud](supabase-cloud.md) - go-live HostDime + secrets CI

## Plataformas

* [Windows](windows.md) - install, hooks, pre-commit e limites

## Fora do bundle (código / backlog)

* [packages/code-review/STRUCTURE.md](../../packages/code-review/STRUCTURE.md)
* [packages/code-review/ci/README.md](../../packages/code-review/ci/README.md)
* [packages/cursor/docs/SKILLS-ROUTING.md](../../packages/cursor/docs/SKILLS-ROUTING.md)
* [CHECKLIST.md](../../CHECKLIST.md)
* [README do monorepo](../../README.md)
