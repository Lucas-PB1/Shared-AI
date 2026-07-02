---
name: python
description: >-
  Orienta Python moderno (3.10+): tipos, módulos, erros, async e segurança. Use
  ao escrever ou revisar scripts, libs, CLI, automações ou testes Python, ou
  quando o usuário pedir pip, pyproject, pytest ou padrões da linguagem sem
  framework específico.
---

# Python

## Quando usar

- Scripts, CLIs e automações
- Bibliotecas e pacotes (`pyproject.toml`, `requirements.txt`)
- Tipagem, dataclasses e contratos explícitos
- Testes com pytest/unittest

## Princípios

- Tipagem com `typing` / PEP 695 onde ajuda manutenção
- `pathlib` em vez de strings de caminho
- Context managers (`with`) para recursos e locks
- Exceções específicas; evitar bare `except`

## Referências

| Tópico | Arquivo |
| --- | --- |
| Sintaxe e tipos | [references/syntax-and-types.md](references/syntax-and-types.md) |
| Módulos e pacotes | [references/modules-and-packages.md](references/modules-and-packages.md) |
| Erros | [references/error-handling.md](references/error-handling.md) |
| Async | [references/async-and-concurrency.md](references/async-and-concurrency.md) |
| Segurança | [references/security-basics.md](references/security-basics.md) |

## Como aplicar

1. Identificar se o contexto é script pontual ou pacote instalável
2. Ler a referência do tópico (tipos, módulos, segurança)
3. Aplicar o padrão mínimo; extrair funções/classes quando responsabilidades divergem
4. Validar com pytest, ruff/mypy ou `python -m py_compile` conforme o projeto

## Anti-padrões comuns

- `except:` ou `except Exception: pass` silencioso
- `mutable` default args (`def f(items=[])`)
- `os.path` quando `pathlib` resolve
- SQL ou shell montados com f-string + input do usuário
- `pickle`/`eval`/`exec` com dados não confiáveis
- Dependências sem pin em produção quando o projeto já usa lockfile

## Relacionado

- Testes → skill `testing` + refs em `python/references/` quando pytest
- Qualidade → skills `clean-code`, `dry`, `solid` (orquestrador `base.mdc`)
- Framework web (Django/FastAPI) → skill específica se existir no projeto; senão `python`
