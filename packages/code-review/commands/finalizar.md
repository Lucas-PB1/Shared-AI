# Finalizar review (`/finalizar`)

Empacota o resultado quando o usuário **finalizou** o review (ex.: `/finalizar`, "review finalizado").

## Quando usar

- Após `/avaliar` e confirmação do usuário
- Exige relatório em `.cursor/review/reports/` para o arquivo

## O que fazer

1. Identificar o arquivo (contexto do chat ou mais recente em `.cursor/review/inbox/`).
2. Rodar `~/.cursor/review-finalizar.sh <caminho>`.
3. Informar pasta gerada em `.cursor/review/resultados/`.
4. O script remove arquivo do inbox e relatório após copiar.

## Saída

```text
.cursor/review/resultados/<YYYY-MM-DD>_<slug>/
├── relatorio.md
├── codigo/          # cópia do arquivo
└── meta.txt         # data, veredito, slug
```

## Resposta ao usuário

Informar só: caminho, conteúdo, veredito, que inbox/reports foram limpos. Sem repetir o relatório.
