# Tratamento de erros

## Onde tratar

- Camada que pode recuperar ou traduzir para o usuário
- Validar na fronteira (API, parse, formulário)
- Não engolir exceções sem log ou re-throw contextualizado

## Mensagens

- Logs internos: detalhe técnico
- UI: mensagens acionáveis, sem stack trace
- Nunca vazar segredos ou PII em erros públicos

## Padrões

- `try/catch` ou `.catch` em operações que falham (rede, parse)
- Unions discriminadas ou Result quando falha é esperada
- Fail fast em config inválida na boot

## Async

- Toda Promise rejeitada precisa de handler
- `async/await` com try/finally para cleanup

## Testes

- Cobrir caminhos de erro relevantes além do happy path
