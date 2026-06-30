---
name: hubspot-cli
description: >-
  HubSpot CLI (hs): auth, developer projects, upload/deploy, dev server local e troubleshooting de build. Use com HubSpot CLI, comando hs, hs project upload, deploy HubSpot ou cms dev server.
---

# HubSpot CLI

## Quando usar

- Configurar conta, `hsproject.json` e platformVersion
- Enviar build (`upload`) vs publicar (`deploy`)
- Desenvolver local com cms dev server e depurar falhas de build

## Princípios

- Upload compila e registra build; não publica sozinho na conta
- Preferir MCP HubSpot (`search-docs`, `fetch-doc`) em vez de memória
- Logs remotos (`get-build-logs`) quando local passa e CI falha

## Referências

| Tópico | Arquivo |
| --- | --- |
| Instalação e auth | [references/installation-and-auth.md](references/installation-and-auth.md) |
| Developer projects | [references/developer-projects.md](references/developer-projects.md) |
| Upload e deploy | [references/upload-and-deploy.md](references/upload-and-deploy.md) |
| Dev local | [references/local-development.md](references/local-development.md) |
| Build troubleshooting | [references/build-troubleshooting.md](references/build-troubleshooting.md) |
| Docs e MCP | [references/docs-and-mcp.md](references/docs-and-mcp.md) |

## Comandos (exemplo real)

- `hs project upload --skip-npm-audit`
- `hs project deploy --deploy-latest-build --force`
- `platformVersion`: `"2026.03"` em `hsproject.json`

## Como aplicar

1. Confirmar pasta com `hsproject.json` e conta (`hs account list`)
2. Desenvolver local; validar antes do upload
3. Upload → verificar build status/logs → deploy quando pronto publicar

## Anti-padrões comuns

- Assumir que upload já deixou o site live
- Ignorar diferença entre dev server local e build remoto
- Adivinhar flags da CLI sem consultar docs via MCP

## Relacionado

- Skill `testing` e lint antes de upload
