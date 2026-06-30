# Pacote Cursor

Rules orquestradoras, skills reutilizáveis e automações para o [Cursor](https://cursor.com).

## Conteúdo

```
packages/cursor/
├── rules/                  # skills-orchestrator-*.mdc
├── skills/                 # 31 skills com references/
├── docs/
│   └── SKILLS-ROUTING.md
└── scripts/
    ├── install.sh
    ├── bootstrap-project.sh
    ├── link-project-rules.sh
    └── hooks/
```

## Comandos (da raiz do monorepo)

```bash
npm run setup                              # instala + hooks
npm run cursor:bootstrap -- /caminho/repo   # prepara um projeto
npm run cursor:update                      # após git pull
```

## Como funciona

### Instalação (`npm run setup`)

Copia para `~/.cursor/`:

| Origem | Destino |
| --- | --- |
| `rules/` | `~/.cursor/rules/` |
| `skills/` | `~/.cursor/skills/` |
| `docs/SKILLS-ROUTING.md` | `~/.cursor/SKILLS-ROUTING.md` |
| `scripts/link-project-rules.sh` | `~/.cursor/link-project-rules.sh` |
| `scripts/hooks/ensure-project-rules.sh` | `~/.cursor/hooks/` |

Com hooks: cria `~/.cursor/hooks.json` para garantir symlinks das rules ao abrir sessão do Agent.

### Bootstrap (`npm run cursor:bootstrap -- <repo>`)

- `.cursor/rules/` → symlinks das rules orquestradoras
- `.cursor/skills/` → pasta vazia para overrides do projeto

### Rules vs skills

**Rules** — o Cursor só lê `.cursor/rules/` do workspace. As genéricas ficam em `~/.cursor/rules/` e são ligadas via symlink. Rules específicas do projeto ficam como arquivo real e não são sobrescritas.

**Skills** — resolução automática:

1. `.cursor/skills/<nome>/SKILL.md` (projeto, sobrescreve)
2. `~/.cursor/skills/<nome>/SKILL.md` (pacote do usuário)

### Orquestrador

Três camadas (detalhes em `docs/SKILLS-ROUTING.md`):

| Camada | Rule | Sinal |
| --- | --- | --- |
| Intent | `skills-orchestrator-intent.mdc` | palavras do pedido |
| Stack | `skills-orchestrator-stack.mdc` | manifestos do repo |
| Contexto | rules com glob | arquivos abertos |

## Skills incluídas

Arquitetura: `clean-architecture`, `hexagonal-architecture`, `layered-architecture`, `domain-driven-design`, `vertical-slice`, `repository`, `atomic-design`, `solid`

Front-end: `react`, `next`, `typescript`, `javascript`, `html`, `css`, `tailwind`, `mobile-first`, `motion`, `accessibility`, `ux`

Qualidade: `clean-code`, `dry`, `no-magic-numbers`, `eslint`, `prettier`, `testing`, `security`

PHP: `php`, `laravel`, `zend-laminas`

Tooling: `git`, `hubspot-cli`

## Contribuir

- Rules → `rules/`
- Skills → `skills/<nome>/SKILL.md` + `references/`
- Mapa → `docs/SKILLS-ROUTING.md`
