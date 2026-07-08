# State e módulos

## O que é o state

- Mapeia recursos do código para objetos reais no provider
- Fonte da verdade do Terraform sobre o que existe
- Contém dados sensíveis (pode ter segredo) → tratar como sensível

## Backend remoto

- State remoto (S3+DynamoDB, GCS, Terraform Cloud) — nunca só local em equipe
- **Lock** para evitar `apply` concorrente corrompendo o state
- Versionamento/backup do state para recuperação

## Drift

- Mudança manual no console diverge do state (drift)
- `plan` detecta drift; política: mudar sempre pelo código
- `import` para trazer recurso existente ao gerenciamento

## Módulos

- Agrupar recursos reutilizáveis com `variables`/`outputs` claros
- Reuso entre ambientes com valores diferentes
- Pin da versão do módulo (registry/git com tag)
- Não criar módulo prematuro — extrair quando o reuso aparece

## Organização

- Separar por ambiente (diretório ou workspace) para blast radius menor
- Composição: módulos pequenos e focados, root fino que os junta

## Segurança

- State com segredo → backend criptografado e acesso restrito
- Não commitar `terraform.tfstate` nem `.terraform/` (gitignore)

## Evitar

- State local compartilhado por commit
- `apply` sem lock em equipe
- Mudança manual fora do código (drift crônico)
