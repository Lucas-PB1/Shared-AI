# Secrets e artefatos

## Secrets no CI

- Guardar no secret store da plataforma (GitHub/GitLab), nunca no YAML
- Injetar como variável de ambiente mascarada; não ecoar em log
- Escopo mínimo: secret por ambiente (dev/staging/prod), não um global
- Rotacionar credenciais; revogar ao sair um colaborador

## OIDC em vez de chave longa

- Preferir federação OIDC com o cloud provider a armazenar chave estática
- Token de vida curta emitido por execução, sem segredo de longa duração no CI

## Artefatos

- Resultado de build (binário, imagem, bundle) passado entre estágios
- Publicar em registry/artifact store com versão imutável (tag/semver/sha)
- `build` uma vez; `deploy` promove o mesmo artefato entre ambientes
- Retenção com prazo — não acumular artefato para sempre

## Cache vs artefato

- **Cache**: acelera build (deps), descartável, reconstruível
- **Artefato**: saída que precisa ser usada depois (deploy, download)
- Não usar cache como se fosse artefato de release

## Evitar

- Segredo em texto plano no repositório ou em variável não mascarada
- Rebuild do artefato em cada ambiente (deriva entre staging e prod)
- Logar valor de secret em modo debug
