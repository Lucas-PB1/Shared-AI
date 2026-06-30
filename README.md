# HostDime IA

Monorepo de pacotes públicos de configuração de IA.

Cada funcionalidade fica isolada em `packages/<nome>/`. Hoje:

| Pacote | Descrição |
| --- | --- |
| [`cursor`](packages/cursor/) | Rules, skills e automações para o [Cursor](https://cursor.com) |

## Início rápido

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup
npm run cursor:bootstrap -- /caminho/do/seu/projeto
```

### O que cada comando faz

| Comando | Escopo |
| --- | --- |
| `npm run setup` | Instala o pacote **cursor** em `~/.cursor/` + hook automático |
| `npm run cursor:install` | Só instala rules/skills (sem hook) |
| `npm run cursor:bootstrap -- <repo>` | Symlinks das rules no projeto de código |
| `npm run cursor:update` | Reinstala após `git pull` |

> Não precisa de `npm install` — os scripts usam bash e ferramentas do sistema (`rsync`, `python3`).

## Estrutura

```
hostdime-ia/
├── package.json              # scripts npm na raiz
├── packages/
│   └── cursor/               # pacote Cursor (rules, skills, scripts)
│       ├── rules/
│       ├── skills/
│       ├── docs/
│       └── scripts/
└── packages/<futuro>/        # próximos pacotes de IA
```

## Adicionar outro pacote

1. Criar `packages/<nome>/` com README e scripts próprios
2. Registrar scripts em `package.json` na raiz: `"<nome>:install": "..."`
3. Opcionalmente incluir no `npm run setup` quando fizer sentido

Detalhes do pacote Cursor: [packages/cursor/README.md](packages/cursor/README.md).

## Licença

MIT — veja [LICENSE](LICENSE).
