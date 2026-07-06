# Memória de review (`/memoria`)

Gerencia a memória de review **v2** — migração explícita, compactação e promoção de convenções. Tudo em `.cursor/review/` (**gitignored**).

Ler skill **`review-inbox`** para o fluxo `/avaliar` + `/finalizar`.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/memoria` ou `/memoria status` | Estado do projeto (v1/v2, arquivos, pendências) |
| `/memoria backup` | Cópia de segurança de `memoria.md` antes de testar |
| `/memoria diff` | Comparar tamanho `memoria.md` → `context.yaml` |
| `/memoria migrar` | Converter `memoria.md` (v1) para v2 — **dry-run** |
| `/memoria migrar --write` | Gravar após confirmação do dev |
| `/memoria compactar` | `decisions.jsonl` → `context.yaml` — dry-run |
| `/memoria compactar --write` | Gravar `context.yaml` |
| `/memoria promover` | `candidates` → `convencoes.md` — dry-run |
| `/memoria promover --write` | Gravar `convencoes.md` |
| `/memoria promover --all --write` | Promover todos os candidates (mesmo com 1 ocorrência) |
| `/memoria restore` | Voltar ao backup v1 — dry-run |
| `/memoria restore --write` | Restaurar `memoria.md` e remover artefatos v2 |

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

## Modos

| Modo | Detectar | `/finalizar` | `/avaliar` lê |
| --- | --- | --- | --- |
| **v1 (legacy)** | `memoria.md` sem `.memoria-version` | Atualiza `memoria.md` (comportamento atual) | Seção **Convenções** |
| **v2** | `.memoria-version` = `2` | Append em `decisions.jsonl` apenas | `context.yaml` + `convencoes.md` |

**Nada migra sozinho** — bootstrap e `/finalizar` não criam v2 automaticamente.

## Artefatos (gitignored)

| Arquivo | Escrito por | Lido por |
| --- | --- | --- |
| `memoria.md` | `/finalizar` (v1) | `/avaliar` (v1) |
| `backups/memoria-original.md` | `/memoria backup` | `/memoria restore` |
| `memoria.legacy.md` | `/memoria migrar --write` | — (cópia de segurança) |
| `.memoria-version` | `/memoria migrar --write` | detectar modo |
| `decisions.jsonl` | `/finalizar` (v2) ou migrar | `/memoria compactar` |
| `context.yaml` | `/memoria compactar --write` | `/avaliar`, `/avaliar-diff` (v2) |
| `convencoes.md` | `/memoria promover --write` | `/avaliar`, geração de código (v2) |

## Protocolo do Agent (`/memoria migrar`)

1. Rodar `npm run memoria -- backup` se ainda não houver backup.
2. Rodar `npm run memoria -- diff` e mostrar resumo ao dev.
3. Rodar `npm run memoria -- migrar` (dry-run) — mostrar contagens.
4. **Só com OK explícito do dev:** `npm run memoria -- migrar --write`.
5. Sugerir `compactar --write` e `promover --write` como passos seguintes.

## Protocolo do Agent (`/memoria restore`)

Para re-testar migração a partir do backup:

1. `npm run memoria -- restore` (dry-run) — mostrar o que será removido.
2. Com OK: `npm run memoria -- restore --write`.
3. Opcional: `migrar --write` de novo.

## Resposta ao usuário

Curta: modo, bytes antes/depois (se diff), arquivos gravados, próximo comando sugerido.
