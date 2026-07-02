# Consumir OKF como agente

## Fluxo de leitura

1. Localizar a **raiz do bundle** (`okf/`, `.okf/` ou diretório com `index.md` + concepts)
2. Ler `index.md` da raiz — progressive disclosure antes de abrir tudo
3. Filtrar por `type`, `tags` ou links a partir do pedido do usuário
4. Seguir cross-links só na profundidade necessária
5. Consultar `log.md` para mudanças recentes no escopo

## Campos úteis para roteamento

| Campo | Uso |
| --- | --- |
| `type` | Filtrar playbooks vs tabelas vs APIs |
| `description` | Snippet sem abrir o body |
| `resource` | Ir ao ativo real (console, URL canônica) |
| `tags` | Agrupamento transversal |

## Ao responder perguntas

- Preferir **concepts linkados** em vez de inventar relações
- Citar o concept ID (path) quando afirmar algo do bundle
- Se link quebrado, tratar como lacuna — não falhar
- Não assumir taxonomia fixa de `type` — tipos desconhecidos são concepts genéricos

## Ao editar bundle existente

- Preservar chaves desconhecidas no frontmatter
- Não fundir vários concepts em um arquivo
- Atualizar `timestamp` em mudanças significativas
- Manter `index.md` sincronizado com a árvore

## Lint mental (estilo Karpathy / enrichment)

Periodicamente útil:

- Contradições entre concepts linkados
- Concepts órfãos (sem entrada no `index.md`)
- `timestamp` muito antigo vs `log.md`
- Claims sem `# Citations` quando deveriam ter fonte
