# Migrar Cursor (`/migrar-cursor`)

Procedimento **one-shot da máquina** para o modelo global-only: orquestrador e commands hostdime só em `~/.cursor/`. Sem dual-link. Sem fallback legado.

Após o time migrar, este command pode ser removido do pacote numa PR futura.

## Quando usar

- Máquina ainda com `skills-orchestrator-*.mdc` ou `/avaliar` etc. espelhados em `projeto/.cursor/`
- Pós `git pull` do hostdime-ia que adotou rules/commands globais
- `.gitignore` do projeto ainda ignora orquestrador/commands hostdime (lixo do dual-link)

## Modelo alvo

| Onde | O quê |
| --- | --- |
| `~/.cursor/rules/` | orquestrador (`skills-orchestrator-*.mdc`) |
| `~/.cursor/commands/` | `/avaliar`, `/historico`, `/migrar-cursor`, … |
| `~/.cursor/skills/` | skills do pacote |
| `projeto/.cursor/review/` | inbox/reports/resultados/memoria |
| `projeto/.cursor/rules/*-project.mdc` | rules versionáveis do repo |
| `projeto/.cursor/commands/*.md` | **só** se for arquivo real do projeto |

**Proibido pós-migração:** symlink hostdime de orquestrador ou command em qualquer projeto.

## Protocolo do Agent

Preferir a parte mecânica:

```bash
cd "$HOSTDIME_IA_ROOT"   # clone hostdime-ia
npm run migrar-cursor
```

Se o script não existir ainda: `git pull` + `npm run sync` e então `npm run migrar-cursor`.

Ordem:

1. **Pré-checagem** — `npm run doctor` (ou status). Sem `HOSTDIME_IA_ROOT` / clone: parar e pedir `npm run setup:skills` / `/onboard`.
2. **Atualizar** — no clone: `git pull` (se remoto ok) + `npm run migrar-cursor` (inclui sync + limpeza).
3. **Validar checklist** abaixo (Agent confirma com ls/grep nos registrados e em `~/Projetos/.cursor/` se existir).
4. **Reload** — pedir Reload Window / novo chat; testar `/avaliar` ou `/historico` (escopo usuário).
5. **Fechamento** — usar o texto fixo da seção final.

Não inventar loops manuais se `npm run migrar-cursor` estiver disponível. Não reintroduzir dual-link.

## Limpeza (o script faz; Agent só valida)

Nos projetos do registry (`~/.cursor/hostdime-ia/projects.json`) e pastas pai com `.cursor/` (ex.: `Projetos/`):

- Remover symlink hostdime `skills-orchestrator-*.mdc`
- Remover symlink hostdime `*.md` em `.cursor/commands/`
- Scrub no `.gitignore` (bloco `# hostdime-ia:…`): tirar ignores de orquestrador/commands; manter só `review/`
- **Não** apagar arquivo real, `*-project.mdc`, `review/`, `SKILLS-ROUTING.md`

## Veredito pós-migração

| Deve existir | Deve estar ausente |
| --- | --- |
| `~/.cursor/rules/skills-orchestrator-base.mdc` | `*/.cursor/rules/skills-orchestrator-*.mdc` (symlink) |
| `~/.cursor/commands/avaliar.md` (e demais hostdime) | `*/.cursor/commands/{avaliar,historico,…}.md` (symlink hostdime) |
| `.gitignore` hostdime só com entradas `review/` | linhas `.cursor/rules/skills-orchestrator-*` / `.cursor/commands/avaliar.md` etc. |
| `.cursor/review/` nos projetos em uso | espelho triplo (user + projeto + pasta pai) |

## CLI

```bash
npm run migrar-cursor
```

## Fechamento (texto fixo)

> Migração concluída. Espelhos por projeto e ignores órfãos são lixo — se reaparecerem, rode de novo `/migrar-cursor` ou `npm run sync`. Não reintroduzir dual-link.
