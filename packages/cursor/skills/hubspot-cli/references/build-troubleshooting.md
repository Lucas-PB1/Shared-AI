# Troubleshooting de build

## Sintomas comuns

- Upload OK localmente mas build remoto falha
- Erros de TypeScript, ESLint ou empaquetamento no servidor
- Metadados `*-hsmeta.json` inválidos para platformVersion

## Passos

1. Reproduzir `npm run build` (ou script do tema) localmente
2. `get-build-status` → falhou? `get-build-logs` completo
3. Comparar versões Node/npm com ambiente remoto documentado

## Dev server vs build remoto

- Dev server pode ser permissivo (aliases, env)
- Build remoto exige imports e paths válidos no meta
- Entry points (`index.tsx`, fields) às vezes não resolvem aliases

## Erros frequentes

- Dependência faltando no package do tema
- Import de arquivo fora de `srcDir`
- platformVersion incompatível com API usada

## Checklist prático

- [ ] Logs remotos lidos até a primeira causa raiz
- [ ] Fix validado local + novo upload
- [ ] Documentar se foi limitação conhecida da plataforma

## Exemplos mentais

- **Bom:** diff mínimo após linha exata do log
- **Ruim:** tentar flags aleatórias sem ler log

## Quando revisitar

- Após bump de `@hubspot/cms-components` ou CLI
