# Upload e deploy

## hs project upload

- Envia projeto e dispara build remoto na HubSpot
- Exemplo neste repo: `hs project upload --skip-npm-audit`
- **Não publica automaticamente** — gera/registra build

## hs project deploy

- Publica build já existente
- Exemplo: `hs project deploy --deploy-latest-build --force`
- Pipeline comum: upload → conferir build OK → deploy

## Inspecionar builds

- `hs project list-builds` (ou equivalente na versão atual)
- MCP: `get-build-status`, `get-build-logs` para erros detalhados

## skip-npm-audit

- Acelera CI/local quando audit não é gate do time
- Não substituir `npm ci` / testes locais

## Checklist prático

- [ ] Build verde antes de deploy em produção
- [ ] Saber qual build ID será promovido
- [ ] Rollback plano (deploy build anterior se suportado)

## Exemplos mentais

- **Bom:** upload em PR, deploy manual pós-review
- **Ruim:** achar que upload já atualizou páginas live

## Quando revisitar

- Falha intermitente só no upload remoto
- Mudança de flags de deploy (--force)
