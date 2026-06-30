# Organização de constantes

## Quando nomear

- Qualquer literal que não seja 0, 1, empty string em contexto trivial
- Timeouts, limites de paginação, códigos HTTP, chaves de storage
- Strings de protocolo, roles, event names

## Onde colocar

- Escopo mínimo: constante no módulo que usa
- Compartilhada → `constants/` ou junto ao domínio
- Config de ambiente → `.env` + validação na boot

## Naming

- Incluir unidade quando relevante (`TIMEOUT_MS`, `MAX_RETRIES`)
- Agrupar em objetos (`HTTP_STATUS`, `ROUTES`)

## Enums vs const

- Union `as const` ou enum para conjuntos fechados
- Documentar valor default e significado de negócio

## Anti-padrões

- Arquivo `constants.ts` catch-all sem coesão
- Duplicar mesma constante com nomes diferentes
