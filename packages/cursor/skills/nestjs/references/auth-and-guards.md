# Auth e guards

- Guard JWT na borda; decorator `@CurrentUser()` (ou equivalente) para claims
- Não modelar User rico se a fonte for Auth externo (Supabase) — claims bastam
- Rotas públicas explícitas; default autenticado quando o produto exige sessão
- Testar guard com `@nestjs/testing` + mock de strategy/token
