# Finalizar review (`/finalizar`)

Empacota o resultado quando o usuário **finalizou** o review (ex.: `/finalizar`, "review finalizado").

## Quando usar

- Após `/avaliar` e confirmação do usuário
- Exige relatório em `.cursor/review/reports/` para o arquivo

## O que fazer

1. Identificar o arquivo (contexto do chat ou mais recente em `.cursor/review/inbox/`).
2. **Perguntar ao dev** o que vale da análise (se ainda não estiver claro no chat):
   - por achado: `aceito` | `rejeitado` | `adiado` | `nao-aplicavel`
   - motivo breve quando `rejeitado` ou `nao-aplicavel`
3. Atualizar `.cursor/review/memoria.md`:
   - **append** em **Histórico** (data, slug, decisões por linha/achado)
   - **reescrever** **Convenções validadas pelo time** (consolidar padrões do projeto)
   - criar o arquivo a partir do template em `packages/code-review/templates/memoria.md` se não existir
4. Rodar `~/.cursor/review-finalizar.sh <caminho>`.
5. Informar pasta gerada em `.cursor/review/resultados/`.
6. O script remove arquivo do inbox e relatório após copiar.

## Saída

```text
.cursor/review/resultados/<YYYY-MM-DD>_<slug>/
├── relatorio.md
├── codigo/          # cópia do arquivo
└── meta.txt         # data, veredito, slug
```

## Resposta ao usuário

Informar só: caminho do pacote em `resultados/`, veredito, que `memoria.md` foi atualizado, e que inbox/reports foram limpos. Sem repetir o relatório.
