# Migrar Cursor (`/migrar-cursor`)

Procedimento **one-shot da máquina** para o modelo global-only: orquestrador e commands hostdime só em `~/.cursor/`. Sem dual-link. Sem fallback legado. Memória de review **só v2**.

Após o time migrar, este command pode ser removido do pacote numa PR futura.

## Quando usar

- Máquina ainda com `skills-orchestrator-*.mdc` ou `/avaliar` etc. espelhados em `projeto/.cursor/`
- Pós `git pull` do hostdime-ia que adotou rules/commands globais
- `.gitignore` do projeto ainda ignora orquestrador/commands hostdime ou artefatos legacy de review (`memoria.md`, `memoria.legacy.md`, `context.json`)
- Pastas `.cursor/commands/` ou `.cursor/rules/` vazias após tirar os espelhos
- Projetos ainda com `memoria.md` / memória v1

## Modelo alvo

| Onde | O quê |
| --- | --- |
| `~/.cursor/rules/` | orquestrador (`skills-orchestrator-*.mdc`) |
| `~/.cursor/commands/` | `/avaliar`, `/historico`, `/migrar-cursor`, … |
| `~/.cursor/skills/` | skills do pacote |
| `projeto/.cursor/review/` | v2: `decisions.jsonl`, `context.yaml`, `convencoes.md`, inbox/reports/resultados |
| `projeto/.cursor/rules/*-project.mdc` | rules versionáveis do repo |
| `projeto/.cursor/commands/*.md` | **só** se for arquivo real do projeto |

**Proibido pós-migração:** symlink hostdime de orquestrador ou command em qualquer projeto.  
**Não recriar** `rules/` / `commands/` vazios no projeto (`link-project` só limpa se a pasta já existir).  
**Não** manter `memoria.md`, `memoria.legacy.md` nem `context.json` — nem no disco nem no `.gitignore`.

## Protocolo do Agent

Preferir a parte mecânica:

```bash
cd "$HOSTDIME_IA_ROOT"   # clone hostdime-ia
npm run migrar-cursor
```

Se o script não existir ainda: `git pull` + `npm run sync` e então `npm run migrar-cursor`.

Ordem:

1. **Pré-checagem** — `npm run doctor` (ou status). Sem `HOSTDIME_IA_ROOT` / clone: parar e pedir `npm run setup:skills` / `/onboard`.
2. **Atualizar** — no clone: `git pull` (se remoto ok) + `npm run migrar-cursor` (inclui sync + limpeza + pastas vazias + memória v2 + scrub de `.gitignore`).
3. **Validar checklist** abaixo.
4. **Projetos a conferir** — o script lista repos com `.gitignore` dirty; o Agent **mostra essa lista ao usuário** e resume o tipo de mudança (scrub de ignores dual-link / legacy review vs. o pacote `hostdime-ia`). Não commit automático.
5. **Reload** — pedir Reload Window / novo chat; testar `/avaliar` ou `/historico` (escopo usuário).
6. **Fechamento** — usar o texto fixo da seção final.

Não inventar loops manuais se `npm run migrar-cursor` estiver disponível. Não reintroduzir dual-link nem ignores legacy de review.

## Limpeza (o script faz; Agent só valida)

Nos projetos do registry (`~/.cursor/hostdime-ia/projects.json`) e pastas pai com `.cursor/` (ex.: `Projetos/`):

- Remover symlink hostdime `skills-orchestrator-*.mdc`
- Remover symlink hostdime `*.md` em `.cursor/commands/`
- Scrub no `.gitignore` (bloco `# hostdime-ia:…`):
  - tirar ignores de orquestrador/commands
  - tirar ignores legacy de review: `memoria.md`, `memoria.legacy.md`, `context.json`
  - manter só artefatos v2 de `review/` (ver fragmento)
- Remover pastas **vazias** `.cursor/commands/` e `.cursor/rules/` após a limpeza
- Migrar memória de review: `memoria.md` (v1) → v2; remover `memoria.md` / `memoria.legacy.md` / `context.json` residual; backup só em `backups/`
- **Não** apagar arquivo real, `*-project.mdc`, commands locais do repo, `review/` (exceto legacy de memória), `SKILLS-ROUTING.md`

### `.gitignore` review — alvo (fragmento)

```gitignore
.cursor/review/inbox/*
!.cursor/review/inbox/.gitkeep
.cursor/review/reports/*
!.cursor/review/reports/.gitkeep
.cursor/review/resultados/
.cursor/review/.memoria-version
.cursor/review/decisions.jsonl
.cursor/review/context.yaml
.cursor/review/convencoes.md
.cursor/review/backups/
```

**Ausente de propósito:** `.cursor/review/memoria.md`, `memoria.legacy.md`, `context.json`.

## Veredito pós-migração

| Deve existir | Deve estar ausente |
| --- | --- |
| `~/.cursor/rules/skills-orchestrator-base.mdc` | `*/.cursor/rules/skills-orchestrator-*.mdc` (symlink) |
| `~/.cursor/commands/avaliar.md` (e demais hostdime) | `*/.cursor/commands/{avaliar,historico,…}.md` (symlink hostdime) |
| `.gitignore` hostdime só com review v2 (fragmento acima) | ignores de orquestrador/commands; `memoria.md` / `legacy` / `context.json` |
| `.cursor/review/` v2 nos projetos em uso | espelho triplo; pastas `rules/`/`commands/` **vazias**; `memoria.md` / `memoria.legacy.md` / `context.json` |

## Projetos que o usuário deve conferir

Depois do script, o Agent lista e explica:

| Tipo | O que olhar |
| --- | --- |
| Repos com só `M .gitignore` | Scrub dual-link + remoção de ignores legacy de review — revisar e commit no repo do time se fizer sentido |
| `hostdime-ia` | Diff da feature (pacote global + `/migrar-cursor`) — commit no monorepo |
| Sem dirty | Só pastas vazias / memória local gitignored — nada a commit |

Pastas que **continuam** com conteúdo real (ex.: `*-project.mdc`, `commands/ci.md` do tema) estão corretas — não apagar.

## CLI

```bash
npm run migrar-cursor
```

## Fechamento (texto fixo)

> Migração concluída. Espelhos por projeto, ignores órfãos (orquestrador/commands e review legacy), pastas `rules/`/`commands/` vazias e memória v1 são lixo — se reaparecerem, rode de novo `/migrar-cursor` ou `npm run sync`. Não reintroduzir dual-link nem `memoria.md`/`context.json`. Confira os projetos com `.gitignore` alterado antes de commitar.
