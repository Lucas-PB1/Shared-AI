# Convenções do projeto

Atualizado via **ingest pós-merge** (`avaliar-pr-memoria`: dual-write + promoção LLM) e `/memoria promover`.  
No CI GitHub: este arquivo é lido por escopo no `/avaliar`.

Regras de styling/CSS/Tailwind ficam na skill `hostdime-styling` (roteada no `/avaliar`).

Promoção: slug por **palavras‑chave** → pares próximos (Jaccard) como prior →
**LLM** decide por lógica (create | merge | skip) e absorve keys no mesmo sentido.
Slug igual conta como o mesmo achado; slug próximo só aumenta a chance — a lógica confirma.

## Como escrever escopos

Use **`## Escopo: rótulo (**/glob)`** — o glob entre parênteses casa com o path relativo do arquivo.

| Formato | Exemplo |
| --- | --- |
| Glob | `## Escopo: api (**/src/api/**)` |
| Arquivo | `## Escopo: config (**/config/app.php)` |
| Global | `## Escopo: global (**/*)` |

Prefixo de path sem parênteses também funciona se o rótulo for substring do path.

Bullets entram após **≥2 aceites** no ingest (`avaliar-pr-memoria`) ou `/memoria promover --write`.

## Escopo: global (**/*)

_(vazio — preenchido pelo ingest ou `/memoria promover`)_
