# Instalação e autenticação

## Instalação

- CLI global: `@hubspot/cli` via npm (`npm install -g @hubspot/cli` ou npx)
- Verificar: `hs --version`

## hs init

- Na raiz do repo ou pasta do projeto
- Cria/atualiza config local e associa ao portal

## hs auth

- Personal Access Key (Developer Account)
- Fluxo interativo ou token conforme documentação atual
- Múltiplas contas: `hs account list`, `hs account use <id>`

## Seleção de conta

- Sempre confirmar conta ativa antes de upload/deploy
- Projetos de produção vs sandbox em contas distintas

## Checklist prático

- [ ] CLI na versão mínima exigida pelo `platformVersion`
- [ ] Conta correta selecionada
- [ ] Credenciais fora do git (.env, secrets locais)

## Exemplos mentais

- **Bom:** script npm documenta conta de dev padrão
- **Ruim:** upload acidental em portal de produção

## Quando revisitar

- Rotação de access key ou mudança de time/conta
