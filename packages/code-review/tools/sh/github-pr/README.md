# GitHub PR /avaliar — módulos bash

Entry: `../review-github-pr.sh` (orquestra; soft ≤200 linhas).

| Módulo | Papel |
| --- | --- |
| `common.sh` | paths, git, pr_report, logs de resumo |
| `state.sh` | estado incremental no PR |
| `report.sh` | estático/LLM + artifact |
| `inline-suggestion.sh` | De/Para → suggestion GitHub |
| `inline-post.sh` | publica inlines; **não apaga** threads (purge opt-in) |
| `summary.sh` | comentário por arquivo + resumo |
