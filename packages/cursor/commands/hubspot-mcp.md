# Instalar MCP HubSpot (`/hubspot-mcp`)

Configura o servidor **HubSpotDev** no Cursor para docs oficiais, upload/deploy e troubleshooting via MCP.

## Quando usar

- `/hubspot-mcp` — instalação explícita (não depende da pergunta da rule)
- MCP ausente ou com erro em Settings → Tools & MCP
- Após recusar a sugestão automática e mudar de ideia

## Pré-requisitos

- Node.js 20+
- Conta HubSpot com CLI autenticada (`hs auth`) — necessária para o servidor responder após o restart

## Fluxo

1. Verificar `~/.cursor/mcp.json` — se `HubSpotDev` já existe, informar e parar
2. Executar:

```bash
~/.cursor/install-hubspot-mcp.sh
```

3. Pedir **reinício do Cursor** (Settings → Tools & MCP → HubSpotDev com ícone verde)
4. Se o servidor falhar após restart: `npm install -g @hubspot/cli@latest`, `hs auth`, depois `/hubspot-mcp` de novo

## Registrar recusa (opcional)

Se o usuário pedir para não sugerir instalação automática:

```bash
~/.cursor/install-hubspot-mcp.sh --decline
```

Isso grava `STATUS=declined` em `~/.cursor/hostdime-hubspot-mcp.state`. A rule `skills-orchestrator-hubspot.mdc` deixa de perguntar.

## Alternativa oficial

Com HubSpot CLI global: `hs mcp setup` e selecionar Cursor. O script acima usa modo **standalone** (`npx @hubspot/cli`) e não exige `hs` no PATH.

## Relacionado

- Skill `hubspot-cli` → `references/docs-and-mcp.md`
- Rule `skills-orchestrator-hubspot.mdc` — verificação na primeira tarefa HubSpot
