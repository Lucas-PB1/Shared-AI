# Memória de review (`/memoria`)

**Fonte de verdade:** store Supabase (`SUPABASE_URL` + chave + `REVIEW_PROJECT_SLUG`).

CLI local (`memoria`) e dual-write usam workdir **fora do repo** (`HOSTDIME_REVIEW_WORKDIR` ou `$TMPDIR/hostdime-review/<hash>`).

Ler skill **`review-inbox`** para o fluxo `/avaliar` + `/finalizar`.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/memoria` ou `/memoria status` | Estado (workdir tmp + dica store) |
| `/memoria init [--write]` | Scaffold no workdir (rascunho local) |
| `/memoria backup` / `restore` | Backup do workdir |
| `/memoria compactar` / `promover` | decisions → context → convencoes (workdir; push via store tools) |

Após **merge de PR** com `/avaliar` no GitHub (workflow `avaliar-pr-memoria`):

```bash
PR_NUMBER=42 npm run review:ingest-pr -- --write /caminho/do/projeto
```

Ingere threads → dual-write store (decisions + exclusions/conventions no banco).

## CLI

```bash
npm run memoria -- status [projeto]
npm run memoria -- init [--write] [projeto]
npm run memoria -- backup [projeto]
npm run memoria -- compactar [--write] [projeto]
npm run memoria -- promover [--write] [--all] [projeto]
npm run memoria -- restore [--write] [projeto]
```

Preferir store: `npm run review:memory-pull` / publish / dual-write.

## Resposta ao usuário

Curta: se store configurado, próximo comando; lembrar que artefatos locais não vão no git do projeto.
