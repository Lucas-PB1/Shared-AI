# Memória de review (`/memoria`)

Gerencia a memória de review **v2** — migração, compactação e promoção de convenções. Tudo em `.cursor/review/` (**gitignored**). Sem modo legacy: `memoria.md` / `memoria.legacy.md` são removidos após migrar.

Ler skill **`review-inbox`** para o fluxo `/avaliar` + `/finalizar`.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/memoria` ou `/memoria status` | Estado do projeto (arquivos, pendências) |
| `/memoria backup` | Cópia de `memoria.md` (se ainda existir) em `backups/` |
| `/memoria diff` | Comparar tamanho fonte → `context.yaml` |
| `/memoria migrar` | v1→v2 ou scaffold/purge legacy — **dry-run** |
| `/memoria migrar --write` | Gravar v2 e **remover** `memoria.md` / `memoria.legacy.md` |
| `/memoria compactar` | `decisions.jsonl` → `context.yaml` — dry-run |
| `/memoria compactar --write` | Gravar `context.yaml` |
| `/memoria promover` | `candidates` → `convencoes.md` — dry-run |
| `/memoria promover --write` | Gravar `convencoes.md` |
| `/memoria promover --all --write` | Promover todos os candidates (mesmo com 1 ocorrência) |
| `/memoria restore` | Re-migrar backup → v2 — dry-run |
| `/memoria restore --write` | Reconstrói v2 a partir de `backups/` (não reativa v1) |

## CLI

```bash
npm run memoria -- status [projeto]
npm run memoria -- backup [projeto]
npm run memoria -- diff [projeto]
npm run memoria -- migrar [--write] [projeto]
npm run memoria -- compactar [--write] [projeto]
npm run memoria -- promover [--write] [--all] [projeto]
npm run memoria -- restore [--write] [projeto]
```

## Modo único: v2

| Detectar | `/finalizar` | `/avaliar` lê |
| --- | --- | --- |
| `.memoria-version` = `2` | Append em `decisions.jsonl` | `context.yaml` + `convencoes.md` |

`/migrar-cursor` e `link-project` já sobem scaffold v2 e migram `memoria.md` antigas.

## Artefatos (gitignored)

| Arquivo | Escrito por | Lido por |
| --- | --- | --- |
| `backups/memoria-original.md` | backup / migrar | restore / diff |
| `.memoria-version` | migrar | detectar modo |
| `decisions.jsonl` | `/finalizar` ou migrar | compactar |
| `context.yaml` | migrar / compactar | `/avaliar`, promover |
| `convencoes.md` | promover | `/avaliar`, geração |

**Não** manter `memoria.md` nem `memoria.legacy.md` no projeto após migrar.

## Protocolo do Agent (`/memoria migrar`)

1. Rodar `npm run memoria -- backup` se ainda houver `memoria.md` e não houver backup.
2. Rodar `npm run memoria -- migrar` (dry-run) — mostrar contagens.
3. **Só com OK explícito do dev** (exceto quando o fluxo for `/migrar-cursor`): `npm run memoria -- migrar --write`.
4. Sugerir `compactar --write` e `promover --write` como passos seguintes.

## Protocolo do Agent (`/memoria restore`)

Reconstrói v2 a partir do backup (não volta a v1):

1. `npm run memoria -- restore` (dry-run).
2. Com OK: `npm run memoria -- restore --write`.

## Resposta ao usuário

Curta: modo, bytes antes/depois (se diff), arquivos gravados, próximo comando sugerido.
