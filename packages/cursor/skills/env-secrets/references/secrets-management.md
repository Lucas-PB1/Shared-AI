# Gestão de segredos

## Onde guardar

- Dev local: `.env` ignorado pelo git
- CI: secret store da plataforma (GitHub/GitLab), mascarado
- Runtime/prod: secret manager (Vault, AWS/GCP Secrets Manager) ou secret do orquestrador
- Nunca: git, imagem Docker, log, bundle do front

## Menor privilégio

- Credencial com escopo mínimo para a tarefa
- Uma por ambiente; separar leitura de escrita quando possível
- Preferir credencial de vida curta (OIDC/token temporário) a chave estática longa

## Rotação e revogação

- Poder rotacionar sem downtime (app relê o segredo)
- Revogar imediatamente ao vazar ou ao sair colaborador
- Registrar quem tem acesso a quê

## Se vazou

- Um segredo no histórico do git está comprometido — **rotacionar**, não só remover o commit
- Reescrever histórico (`git filter-repo`) só depois de rotacionar
- Auditar uso do segredo vazado

## Detecção

- Scanner de segredo no pre-commit e no CI (ex.: gitleaks, trufflehog)
- Bloquear push com credencial detectada

## Evitar

- Compartilhar segredo por chat/e-mail em texto plano
- Chave master única com acesso a tudo
- "Remover depois" — segredo commitado já vazou
