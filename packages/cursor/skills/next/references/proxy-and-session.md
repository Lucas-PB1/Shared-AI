# Proxy / middleware de sessão

Em Next recente o arquivo pode se chamar `proxy.ts` (ou `middleware.ts`).

- Refrescar sessão Supabase antes de rotas protegidas
- Matcher explícito: só paths que precisam de auth/headers
- Redirect para login com `next` return URL quando fizer sentido
- Manter lógica mínima — sem regras de negócio PHB no proxy
