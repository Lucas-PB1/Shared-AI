# Mutations

- `mutationFn` chama API; onSuccess invalida keys afetadas
- Optimistic update só com rollback claro
- Expor `isPending` / erro para feedback UX
- Não misturar RHF submit com side-effects fora do `mutationFn` sem necessidade
