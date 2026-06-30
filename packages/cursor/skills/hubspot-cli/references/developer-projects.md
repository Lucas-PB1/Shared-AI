# Developer projects

## hsproject.json

- `name`: identificador do projeto
- `srcDir`: raiz do código (ex.: `"src"`)
- `platformVersion`: API/plataforma alvo (ex.: `"2026.03"`)

## hs project create

- Scaffold inicial quando não há projeto
- Seguir prompts de tipo (CMS theme, app, etc.)

## Estrutura típica

- Código sob `srcDir` (temas em `src/theme/...`)
- Metadados `*-hsmeta.json` por feature conforme plataforma

## platformVersion

- Deve alinhar com docs e dependências `@hubspot/cms-*`
- Upgrade: ler release notes antes de bump

## Checklist prático

- [ ] `hsproject.json` commitado; secrets não
- [ ] Caminhos no meta batem com `srcDir`
- [ ] Versão de plataforma consistente no time

## Exemplos mentais

- **Bom:** um hsproject por tema/app, srcDir claro
- **Ruim:** código fora de srcDir esperado pelo upload

## Quando revisitar

- Novo tipo de asset (module, template, function)
- Migração de platformVersion
