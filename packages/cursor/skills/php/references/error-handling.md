# Tratamento de erros

## Exceções

- Lançar exceções específicas (`OrderNotFoundException`) em vez de `Exception` genérica
- Não usar exceções para fluxo de controle normal

## Try/catch

- Capturar no **boundary** (controller, CLI, job), não em cada linha
- Re-lançar ou encapsular com contexto quando necessário

## Logging

- Logar exceção com stack no servidor; mensagem genérica ao usuário
- Níveis: `error` para falhas, `warning` para degradável

## Retornos vs exceções

| Situação | Preferir |
| --- | --- |
| Falha excepcional (DB down, not found) | Exceção |
| Validação de input esperada | Result object ou DTO com erros |

## Evitar

- `@` operator
- `catch (Exception $e) {}` vazio
- Expor stack trace em produção
