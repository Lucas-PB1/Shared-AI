# Módulos e pacotes

## Layout comum

```
projeto/
├── pyproject.toml      # preferido (PEP 621)
├── src/meu_pacote/
│   ├── __init__.py
│   └── modulo.py
└── tests/
    └── test_modulo.py
```

## Imports

- Ordem: stdlib → third-party → local; linha em branco entre grupos
- Imports absolutos no pacote; relativos só dentro do mesmo pacote
- `if __name__ == "__main__":` para entrypoint de script — não side effects no import

## Dependências

| Arquivo | Quando |
| --- | --- |
| `pyproject.toml` | Projeto novo ou pacote instalável |
| `requirements.txt` | Deploy/CI simples; gerar a partir do lock quando possível |
| `requirements-dev.txt` | Ferramentas de dev (pytest, ruff, mypy) separadas |

## Entry points

- CLI: `argparse` (stdlib) ou biblioteca já adotada no repo (`click`, `typer`)
- Registrar console scripts em `[project.scripts]` no `pyproject.toml` quando for pacote

## Ambiente virtual

- Nunca instalar deps globalmente se o projeto tem venv/poetry/uv
- Documentar comando de ativação no README do repo, não inventar outro gerenciador

## Evitar

- `sys.path.insert` para “consertar” imports — ajustar layout ou `PYTHONPATH` no dev
- Código executável no topo de módulo importado por testes/outros pacotes
- Duplicar versão de dependência entre arquivos sem lockfile coerente
