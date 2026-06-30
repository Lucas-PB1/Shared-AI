# Server e Client Components

## Server Components (padrão)

- Render no servidor; podem fazer fetch async direto
- Não usam hooks, event handlers nem browser APIs
- Podem importar Client Components (como filhos)

## Client Components

- Topo do arquivo: `'use client'`
- Necessários para: useState, useEffect, onClick, context consumer, libs só browser

## Boundaries

- Empurrar `'use client'` para folhas da árvore
- Passar dados serializáveis (props) do Server para o Client
- Não importar módulo server-only dentro de Client

## Quando usar cada um

| Caso | Preferência |
| --- | --- |
| Lista estática de CMS | Server |
| Modal com formulário | Client (ou leaf) |
| Fetch + HTML inicial | Server |

## Checklist prático

- [ ] Arquivo client é o menor subtree possível
- [ ] Props do server são JSON-serializáveis
- [ ] Sem secrets ou tokens em bundles client

## Exemplos mentais

- **Bom:** ServerPage → ClientCounter com initialCount
- **Ruim:** layout.tsx com use client por causa do tema

## Quando revisitar

- Ao adicionar biblioteca que exige window/document no import
