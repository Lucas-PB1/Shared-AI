---
name: okf
description: >-
  Open Knowledge Format (OKF) v0.1 do Google Cloud: bundles Markdown com YAML
  frontmatter para humanos e agentes. Use ao ler, editar ou produzir knowledge
  bundles, concepts, index.md ou log.md OKF.
---

# Open Knowledge Format (OKF)

## Quando usar

- Ler ou navegar um **knowledge bundle** (diretório de `.md` com frontmatter)
- **Produzir** ou refatorar concepts, `index.md`, `log.md`
- Converter documentação longa em **concepts atômicos** para agentes
- Validar conformidade OKF v0.1 antes de commitar

## O que é

OKF **não** é Google Docs. É um formato aberto (Google Cloud, jun/2026): diretório de Markdown + YAML frontmatter, legível em Git, sem SDK obrigatório.

Spec oficial: [GoogleCloudPlatform/knowledge-catalog/okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

## Princípios

- **Um arquivo = um concept** (unidade de conhecimento), não um documento monolítico
- Campo obrigatório no frontmatter: `type` (string livre, sem registro central)
- Preferir Markdown estruturado (headings, listas, tabelas, código) a prosa longa
- Links entre concepts formam um **grafo**; tolerar links quebrados
- Consumidores **não** devem rejeitar bundle por campos opcionais ausentes ou `type` desconhecido

## Referências

| Tópico | Arquivo |
| --- | --- |
| Estrutura e conformidade | [references/bundle-and-concepts.md](references/bundle-and-concepts.md) |
| Produzir e editar | [references/producing.md](references/producing.md) |
| Consumir como agente | [references/consuming.md](references/consuming.md) |

## Convenção de pasta no repo

Recomendado: `okf/` ou `.okf/` na raiz ou em `docs/okf/`. A rule `skills-orchestrator-okf.mdc` usa esses globs; concepts OKF fora dessas pastas ainda devem seguir a spec se o frontmatter tiver `type:`.

## Anti-padrões

- Um único `.md` gigante em vez de concepts atômicos
- Concept sem `type` no frontmatter
- Usar `index.md` ou `log.md` como concept (são arquivos reservados)
- Wikilinks `[[...]]` — OKF usa links Markdown normais (`[texto](/caminho.md)`)

## Relacionado

- Rule `skills-orchestrator-okf.mdc` — gatilho por glob e intent
- `git` — bundles OKF versionam bem em repositório
