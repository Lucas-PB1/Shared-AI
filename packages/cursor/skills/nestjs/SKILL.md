---
name: nestjs
description: >-
  Orienta NestJS: módulos, controllers, providers, guards, pipes, CQRS leve e
  Swagger. Use em APIs Nest, DTOs, auth guards ou estrutura modular monolith.
---

# NestJS

## Quando usar

- Criar ou alterar módulos, controllers, services/handlers
- Guards, pipes, interceptors, DTOs (class-validator)
- Documentar contrato REST (Swagger)

## Princípios

- Modular monolith: um módulo por bounded context ou capacidade
- Controller fino; regras em services/handlers
- DTOs na borda HTTP; validação explícita (`ValidationPipe`)
- CQRS leve quando read ≠ write (queries vs commands)

## Referências

| Tópico | Arquivo |
| --- | --- |
| Módulos e DI | [references/modules-and-di.md](references/modules-and-di.md) |
| HTTP e DTOs | [references/http-and-dtos.md](references/http-and-dtos.md) |
| Auth e guards | [references/auth-and-guards.md](references/auth-and-guards.md) |

## Como aplicar

1. Colocar o código no BC/módulo certo (catalog / identity / game, etc.)
2. Expor rota no controller; validar body/query com DTO
3. Persistência via `typeorm` (ou SQL) — não vazá-la no controller
4. Atualizar Swagger se o contrato público mudar

## Anti-padrões comuns

- Lógica de domínio no controller
- Módulo “god” com dezenas de providers sem fronteira
- Ignorar ValidationPipe / tipagem frouxa no body

## Relacionado

- `typeorm`, `domain-driven-design`, `typescript`, `postgresql-sql`
- `supabase` para JWT Auth externo quando aplicável
