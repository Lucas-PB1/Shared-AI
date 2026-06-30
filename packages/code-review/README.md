# Pacote Code Review

Review por arquivo com `/avaliar` e `/finalizar` — **commands universais** em todo projeto, no mesmo padrão das rules.

## Como funciona

1. `npm run setup` instala commands em `~/.cursor/commands/`
2. `link-project.sh` (automático no sessionStart ou `cursor:bootstrap`) symlinka para `.cursor/commands/`
3. Cada projeto ganha `.cursor/review/{inbox,reports,resultados}/`

Não precisa de workspace separado nem segundo `package.json`.

## Uso no dia a dia

```bash
# 1. Setup único na máquina (clone hostdime-ia)
npm run setup

# 2. Abrir qualquer projeto — hook cria symlinks + pastas review
#    Ou manualmente:
npm run cursor:bootstrap -- /caminho/do/repo

# 3. No projeto
#    - coloque snippet em .cursor/review/inbox/
#    - /avaliar
#    - /finalizar
```

## Dois modos de review

| Modo | Como |
| --- | --- |
| **Inbox** | `/avaliar` + `.cursor/review/inbox/` |
| **PR / diff** | Skills `review`, `review-bugbot`, `review-security` |

## Estrutura do pacote

```
packages/code-review/
├── commands/     # avaliar.md, finalizar.md → ~/.cursor/commands/
├── skills/       # review-inbox, review-bugbot, …
└── tools/        # check + finalizar (deps na raiz do monorepo)
```

## Ferramentas

Um único Node na raiz do `hostdime-ia`. Ver `tools/README.md`.

```bash
npm run review:doctor    # valida setup
npm run review:check -- <arquivo>
npm run review:finalizar -- <arquivo>
```
