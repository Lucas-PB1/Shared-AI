# Tratamento de erros

## Exceções

- Hierarquia específica (`ValidationError`, `NotFoundError`) em vez de `Exception` genérica
- Não usar exceções para fluxo de controle esperado (preferir retorno explícito ou `Result`)

## Try/except

- Capturar tipos **específicos**; re-raise com `raise ... from err` para preservar cadeia
- Capturar no **boundary** (CLI, HTTP handler, job), não em cada linha interna

## Context managers

```python
with open(path, encoding="utf-8") as f:
    data = f.read()
```

- Recursos (arquivo, lock, conexão) sempre via `with`
- `@contextmanager` para setup/teardown customizado curto

## Logging

- Módulo `logging` — não `print` para erros em produção
- `logger.exception(...)` dentro de `except` para stack automático
- Mensagem ao usuário genérica; detalhe técnico no log

## Retornos vs exceções

| Situação | Preferir |
| --- | --- |
| Falha excepcional (IO, rede, not found) | Exceção |
| Validação de input esperada | Retorno tipado ou dataclass com erros |

## Evitar

- Bare `except:` ou `except Exception: pass`
- Engolir exceção sem log
- Expor stack trace ao usuário final em produção
