# Desenvolvimento local

## hs-cms-dev-server

- Servidor de preview para CMS React / developer project
- Integrado ao workflow npm do tema (Vite via cms-dev-server)

## Padrão npm start

- Na raiz do monorepo: script que entra no tema e roda `npm start`
- Exemplo: `cd src/theme/<nome> && npm start`
- Hot reload local; dados HubL podem ser null no preview — tratar fallbacks

## Preview local vs conta

- Local: iteração rápida de UI e módulos
- Upload: valida build remoto, bundling e metadados reais

## Checklist prático

- [ ] Node na versão exigida pelo projeto (ex.: >= 20)
- [ ] Dependências instaladas no pacote do tema
- [ ] Preview testado antes de upload caro

## Exemplos mentais

- **Bom:** corrigir módulo local, depois um upload
- **Ruim:** ciclo upload-only para typo de CSS

## Quando revisitar

- Novo alias, path ou config do dev server
- Módulos que dependem de hublData real (testar na conta)
