# Route Handlers e BFF

- `app/api/**/route.ts` para BFF leve (health, proxy pontual)
- Não reimplementar a API Nest no Next — preferir client HTTP para o backend
- Auth: ler sessão SSR; não expor service role
- Retornar status e JSON consistentes; tipar body com Zod quando entrada externa
