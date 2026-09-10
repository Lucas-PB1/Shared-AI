# Auth

- Fluxos: sign-up, sign-in, sign-out, callback (`/auth/callback` ou equivalente)
- Cookie de sessão gerenciado pelo SSR helper — não reinventar storage
- Front: feature `auth`; API: guard JWT com o mesmo projeto/JWKS ou secret
- `enable_confirmations` e URLs de redirect alinhados ao ambiente (local vs prod)
