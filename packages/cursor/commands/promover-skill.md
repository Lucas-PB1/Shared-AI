# Promover skill (`/promover-skill`)

Sobe uma skill que nasceu **no projeto** (`.cursor/skills/<nome>`) para o pacote Shared AI (`packages/cursor/skills/<nome>`), para valer em todos os repos ligados.

Uso **ocasional** — só quando a melhoria local se mostrou estável.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/promover-skill` | Wizard (lista skills locais do projeto) |
| `/promover-skill <nome>` | Promove a skill nomeada |

## Pré-requisitos

1. CWD (ou workspace) é um repo com `.cursor/skills/<nome>/SKILL.md` **arquivo real** (não só symlink)
2. Clone Shared AI acessível (`SHARED_AI_ROOT` ou abrir o monorepo)
3. Nome kebab-case válido

## Protocolo

1. Confirmar destino: `$SHARED_AI_ROOT/packages/cursor/skills/<nome>/`
2. Se já existir no pacote: mostrar diff resumido e pedir confirmação (merge vs sobrescrever)
3. Copiar `SKILL.md` + `references/` para o pacote
4. Atualizar `packages/cursor/docs/SKILLS-ROUTING.md` (uma linha na tabela certa)
5. Se for skill de produto (stack/intent): lembrar de ajustar `skills-orchestrator-intent.mdc` e/ou `skills-orchestrator-stack.mdc`
6. Manter ou remover a cópia local do projeto?
   - **Manter** — continua como override (pode divergir)
   - **Remover** — projeto passa a usar a global via `~/.cursor/skills` (preferível após promote)
7. Resumo: paths + `npm run sync` no monorepo + commit sugerido no Shared AI

## Não promover

- Skills de domínio só do produto (ex.: regras DND específicas) — ficam no repo `dnd-*`
- Skills com secrets, paths absolutos de máquina ou dados de um cliente
- Rascunhos não testados em pelo menos um turno real

## Checklist

- [ ] `name` no frontmatter = pasta
- [ ] description com gatilhos
- [ ] SKILLS-ROUTING atualizado
- [ ] sync na máquina após merge no pacote
