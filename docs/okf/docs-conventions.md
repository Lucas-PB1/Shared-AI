---
type: Convention
title: Convenções de documentação (OKF)
description: >-
  Como escrever e manter docs do hostdime-ia no Open Knowledge Format v0.1.
tags: [okf, docs, convention]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

A doc humana e para agentes do monorepo vive em **`docs/okf/`**, um [knowledge bundle OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (Google Cloud, jun/2026).

Não confundir com Google Docs: OKF é **Markdown + YAML frontmatter** versionado em Git.

## Onde colocar

| Conteúdo | Onde |
| --- | --- |
| Concepts do produto / ops | `docs/okf/**/*.md` |
| Índice / histórico do bundle | `docs/okf/index.md`, `docs/okf/log.md` |
| Skill library genérica | `packages/cursor/skills/` (não OKF) |
| README de pacote / CI | `packages/*/README.md`, `ci/README.md` |

## Regras por arquivo

1. **Um arquivo = um concept** (ideia testável isoladamente).
2. Todo concept tem frontmatter com **`type`** (obrigatório).
3. Campos recomendados: `title`, `description`, `tags`, `timestamp` (ISO-8601).
4. **Reservados** (não são concepts): `index.md`, `log.md`.
5. Links entre concepts: preferir path absoluto na raiz do bundle — `[texto](/review-store.md)` ou relativo estável `[texto](review-store.md)`.
6. Sem wikilinks `[[…]]`.
7. Body: headings, tabelas e listas antes de prosa longa.
8. Seções úteis: `# Schema`, `# Examples`, `# Citations` (quando couber).

## Tipos usados neste monorepo

| `type` | Uso |
| --- | --- |
| `Architecture` | Visão de sistema / fluxo |
| `Schema` | Modelo de dados, env, contratos |
| `Reference` | Superfícies de código / APIs internas |
| `Playbook` | Passo a passo ops (local, cloud, Windows) |
| `Convention` | Como trabalhamos (este arquivo) |

Valores de `type` são livres; novos tipos são ok se documentados aqui ou no `log.md`.

## Ao editar

1. Alterar o concept.
2. Atualizar [index.md](index.md) se criar/mover arquivo.
3. Entrada em [log.md](log.md) (data ISO, mais recente primeiro).
4. Não reintroduzir monólitos de “plano de fase” concluído — status curto no concept + [CHECKLIST](../../CHECKLIST.md) para backlog.

## Relacionados

- [Review store](review-store.md)
- Spec oficial OKF (Citations)

# Citations

[1] [OKF SPEC v0.1 — GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
