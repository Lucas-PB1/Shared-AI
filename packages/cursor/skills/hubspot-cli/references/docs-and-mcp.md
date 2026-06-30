# Documentação e MCP HubSpot

## Preferência

- **Não** responder flags, limites ou APIs só de memória
- Usar MCP: `search-docs` primeiro, depois `fetch-doc` no resultado relevante

## Ferramentas MCP úteis

| Ferramenta | Uso |
| --- | --- |
| `search-docs` | Achar tópico oficial |
| `fetch-doc` | Ler página completa |
| `upload-project` | Upload estruturado via MCP |
| `deploy-project` | Deploy estruturado via MCP |
| `get-build-status` | Estado do build após upload |
| `get-build-logs` | stderr/stdout do build remoto |
| `find-projects` | Localizar `hsproject.json` |

## Fluxo recomendado

1. Dúvida de CLI/plataforma → search-docs
2. Build falhou → get-build-status + get-build-logs
3. Implementar feature → fetch-doc do tipo de asset

## Checklist prático

- [ ] Citar comportamento alinhado à doc fetched
- [ ] MCP preferido a curl manual quando disponível
- [ ] Versão da doc compatível com platformVersion do projeto

## Exemplos mentais

- **Bom:** confirmar se upload auto-publica via doc atual
- **Ruim:** assumir paridade com CLI de anos atrás

## Quando revisitar

- Nova ferramenta MCP ou mudança de platformVersion
