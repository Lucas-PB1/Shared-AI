# Fundamentos do Terraform

## Blocos principais

- `terraform { required_version, required_providers }` — versões pinadas
- `provider` — configuração do alvo (cloud, DNS, etc.)
- `resource` — recurso gerenciado (cria/atualiza/destrói)
- `data` — leitura de algo existente
- `variable` / `output` — entradas e saídas do módulo

## Workflow

- `terraform init` — baixa providers e configura backend
- `terraform fmt` + `validate` — formata e valida
- `terraform plan` — mostra o diff (o que vai mudar) — **sempre revisar**
- `terraform apply` — aplica; `destroy` remove

## Declarativo

- Descrever o estado final desejado; Terraform calcula os passos
- Reexecutar é idempotente: sem mudança no código = sem mudança na infra
- Dependências inferidas por referência entre recursos

## Variáveis e ambientes

- `variable` com tipo e default; valores por `.tfvars` (por ambiente)
- Segredo via env `TF_VAR_...` ou secret manager, não em `.tfvars` commitado
- Workspaces ou diretórios separados por ambiente

## Providers

- Pin de versão do provider (`~>`) para builds reproduzíveis
- Credenciais via env/secret, nunca hardcoded no `provider`

## Evitar

- `apply` sem ler o `plan`
- Segredo em `.tfvars` versionado
- Provider sem pin de versão
