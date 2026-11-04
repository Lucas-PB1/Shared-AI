# Básicos client-side

## Secrets

- Nunca API keys secretas no bundle público
- Tokens em httpOnly cookies quando possível

## Storage

- Evitar PII em localStorage
- Limpar sessão no logout

## Dependências

- Auditar supply chain; pin versions
- Subresource Integrity em CDN quando aplicável
