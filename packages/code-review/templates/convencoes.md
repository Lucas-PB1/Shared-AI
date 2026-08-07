# Convenções do projeto

Atualizado via `/memoria promover` ou manualmente.  
No CI GitHub: `.cursor/review/convencoes.md` versionado é lido por escopo no `/avaliar`.

## Como escrever escopos

Use **`## Escopo: rótulo (**/glob)`** — o glob entre parênteses casa com o path relativo do arquivo.

| Formato | Exemplo |
| --- | --- |
| Glob | `## Escopo: api (**/src/api/**)` |
| Arquivo | `## Escopo: config (**/config/app.php)` |
| Global | `## Escopo: global (**/*)` |

Prefixo de path sem parênteses também funciona se o rótulo for substring do path (ex.: `## Escopo: src/legacy/**`).

Promova bullets após validação do time (≥2 aceites no ingest ou `/memoria promover --write`).

## Escopo: global (**/*)

_(vazio — preenchido via `/memoria promover` ou manualmente)_
