# Segurança básica

## Input não confiável

- Validar e normalizar na fronteira (HTTP, CLI args, env vars)
- Nunca interpolar input em SQL — usar parâmetros (`?`, `%s`, ORM)
- Nunca montar shell com string + input — `subprocess.run([...], shell=False)`

## Deserialização

- Evitar `pickle`, `yaml.load` (sem `SafeLoader`), `eval`, `exec` com dados externos
- JSON para troca de dados; schema validation quando o shape importa

## Secrets

- Secrets em variáveis de ambiente ou secret manager — não no código nem em git
- Não logar tokens, senhas ou PII completa

## Paths

- `pathlib.Path` + resolver caminho canônico antes de ler/escrever
- Cuidado com path traversal em uploads/downloads (`../`)

## Dependências

- Pin ou lockfile em produção; revisar CVEs em upgrades grandes
- Venv isolado por projeto

## Evitar

- `os.system(user_input)`
- Desabilitar verificação TLS (`verify=False`) sem motivo documentado
- `DEBUG=True` ou stack traces expostos em ambiente público
