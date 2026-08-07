# Convenções do projeto

Atualizado via **ingest pós-merge** (`avaliar-pr-memoria`) e `/memoria promover`.  
No CI GitHub: este arquivo é lido por escopo no `/avaliar`.

Regras de styling/CSS/Tailwind ficam na skill `hostdime-styling` (roteada no `/avaliar`).

## Como escrever escopos

Use **`## Escopo: rótulo (**/glob)`** — o glob entre parênteses casa com o path relativo do arquivo.

| Formato | Exemplo |
| --- | --- |
| Glob | `## Escopo: api (**/src/api/**)` |
| Arquivo | `## Escopo: config (**/config/app.php)` |
| Global | `## Escopo: global (**/*)` |

Prefixo de path sem parênteses também funciona se o rótulo for substring do path.

Bullets entram após **≥2 aceites** do mesmo achado (`finding_id` no marker inline) no ingest (`decisions-ingest.jsonl`) ou `/memoria promover --write`.

## Escopo: global (**/*)

_(vazio — preenchido pelo ingest ou `/memoria promover`)_
