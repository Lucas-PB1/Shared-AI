# Query keys e cache

- Factory: `characterKeys.all`, `characterKeys.detail(id)`
- Incluir filtros na key (`list({ page, q })`)
- `staleTime` / `gcTime` conscientes do domínio
- Preferir `select` para derivar view model sem nova request
