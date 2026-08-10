# Memória de review (`/memoria`)

Gerencia a memória de review — init, compactação e promoção de convenções. Tudo em `.cursor/review/` (**gitignored**). Formato: `decisions.jsonl`, `context.yaml`, `convencoes.md`.

Ler skill **`review-inbox`** para o fluxo `/avaliar` + `/finalizar`.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/memoria` ou `/memoria status` | Estado do projeto (arquivos, pendências) |
| `/memoria init` ou `/memoria migrar` | Scaffold — **dry-run** |
| `/memoria init --write` | Criar `.memoria-version`, `decisions.jsonl`, `context.yaml`, `convencoes.md` |
| `/memoria backup` | Cópia dos artefatos em `backups/…` e `backups/latest/` |
| `/memoria diff` | Contagens compactas (decisões → listas do context) |
| `/memoria compactar` | `decisions.jsonl` → `context.yaml` — dry-run |
| `/memoria compactar --write` | Gravar `context.yaml` |
| `/memoria promover` | `candidates` → `convencoes.md` — dry-run |
| `/memoria promover --write` | Gravar `convencoes.md` |
| `/memoria promover --all --write` | Promover todos os candidates (mesmo com 1 ocorrência) |
| `/memoria restore` | Restaurar de `backups/latest` — dry-run |
| `/memoria restore --write` | Restaura a partir de `backups/latest` |

Após **merge de PR** com `/avaliar` no GitHub (workflow `avaliar-pr-memoria` ou manual):

```bash
PR_NUMBER=42 npm run review:ingest-pr -- --write /caminho/do/projeto
```

Ingere decisões dos threads → `decisions.jsonl` → compactar → promover → export.

## CLI

```bash
npm run memoria -- status [projeto]
npm run memoria -- init [--write] [projeto]
npm run memoria -- backup [projeto]
npm run memoria -- diff [projeto]
npm run memoria -- compactar [--write] [projeto]
npm run memoria -- promover [--write] [--all] [projeto]
npm run memoria -- restore [--write] [projeto]
```

`migrar` é alias de `init`.

## Artefatos (gitignored)

| Arquivo | Escrito por | Lido por |
| --- | --- | --- |
| `.memoria-version` | init | detectar modo |
| `decisions.jsonl` | `/finalizar` | compactar |
| `context.yaml` | init / compactar | `/avaliar`, promover |
| `convencoes.md` | promover | `/avaliar`, geração |
| `backups/latest/*` | backup | restore |

`link-project` sobe o scaffold e remove nomes inválidos residual (`memoria.md`, `context.json`) se ainda existirem no disco.

## Protocolo do Agent (`/memoria init`)

1. Dry-run: `npm run memoria -- init`
2. Com OK: `npm run memoria -- init --write`
3. Se houver decisões: `compactar --write` e `promover --write`

## Protocolo do Agent (`/memoria restore`)

1. `npm run memoria -- restore` (dry-run).
2. Com OK: `npm run memoria -- restore --write` (exige `backups/latest` de um `backup` anterior).

## Resposta ao usuário

Curta: modo, arquivos gravados, próximo comando sugerido.
