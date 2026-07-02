# Bundle e concepts (OKF v0.1)

## Estrutura típica

```
okf/
├── index.md              # listagem (progressive disclosure)
├── log.md                # histórico opcional
├── meu-concept.md
└── subpasta/
    ├── index.md
    └── outro-concept.md
```

Distribuição: git (recomendado), tarball ou subpasta de um repo maior.

## Arquivos reservados

| Arquivo | Uso |
| --- | --- |
| `index.md` | Índice do diretório; **sem** frontmatter (exceto `okf_version` na raiz) |
| `log.md` | Log cronológico de mudanças do escopo |

Todo outro `.md` é um **concept**.

## Frontmatter (concept)

```yaml
---
type: Playbook                    # OBRIGATÓRIO
title: Título legível
description: Uma frase resumo.
resource: https://…             # URI do ativo, se houver
tags: [tag1, tag2]
timestamp: 2026-06-12T10:00:00Z
---
```

- `type`: único campo obrigatório; valores livres (`API Endpoint`, `Metric`, `Playbook`, `Reference`, etc.)
- Campos extras: permitidos; preservar ao editar

## Body — seções convencionais

| Heading | Quando usar |
| --- | --- |
| `# Schema` | Colunas/campos estruturados |
| `# Examples` | Exemplos de uso |
| `# Citations` | Fontes externas numeradas no final |

## Cross-links

- **Recomendado:** absoluto na raiz do bundle — `[clientes](/tabelas/clientes.md)`
- **Relativo:** `[vizinho](./outro.md)`
- Links quebrados são válidos (conhecimento ainda não escrito)

## index.md (raiz)

Pode declarar versão:

```yaml
---
okf_version: "0.1"
---
```

Corpo: seções com bullets `* [Título](url) - descrição`.

## log.md

```markdown
# Directory Update Log

## 2026-06-12
* **Update**: Descrição da mudança com [link](/concept.md).
* **Creation**: Estrutura inicial.
```

Datas em ISO `YYYY-MM-DD`, entradas mais recentes primeiro.

## Conformidade v0.1

1. Todo `.md` não reservado tem frontmatter YAML parseável
2. Todo frontmatter tem `type` não vazio
3. `index.md` / `log.md` seguem estrutura da spec quando presentes
