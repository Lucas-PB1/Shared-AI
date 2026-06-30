# HostDime IA

Monorepo de pacotes de configuração de IA.

| Pacote | Descrição |
| --- | --- |
| [`cursor`](packages/cursor/) | Rules, skills, hooks, link de projeto |
| [`code-review`](packages/code-review/) | Commands `/avaliar`, `/finalizar` + skills de PR |

## Início rápido

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup
npm run cursor:bootstrap -- /caminho/do/seu/projeto
```

`npm run setup` faz tudo de uma vez:
- `npm install` + `composer install` (deps únicas na raiz)
- Instala rules, skills, **commands** e scripts em `~/.cursor/`
- Cria hook que liga rules **e** commands ao abrir o Agent

Em qualquer projeto preparado:
- `.cursor/rules/` → orquestrador
- `.cursor/commands/` → `/avaliar`, `/finalizar`
- `.cursor/review/inbox/` → snippets para review

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run setup` | Instala deps + pacote completo em `~/.cursor/` |
| `npm run cursor:bootstrap -- <repo>` | Symlinks rules + commands + pastas review |
| `npm run review:check -- <arquivo>` | Checagem estática (dev) |
| `npm run review:doctor` | Valida pré-requisitos |

## Estrutura

```
hostdime-ia/
├── package.json          # único Node (ESLint, TS, scripts)
├── composer.json         # PHPStan
└── packages/
    ├── cursor/
    └── code-review/
```

## Futuros pacotes

Ver [packages/README.md](packages/README.md).

## Licença

MIT — [LICENSE](LICENSE).
