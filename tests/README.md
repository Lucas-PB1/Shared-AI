# Testes

Requer [bats](https://github.com/bats-core/bats-core):

```bash
sudo apt install bats   # Debian/Ubuntu
npm run test
```

Ambiente **isolado** — não altera `~/.cursor` real (`CURSOR_USER_DIR` temporário).

| Arquivo | Cobertura |
| --- | --- |
| `link.bats` | symlinks, não sobrescrever arquivo real |
| `bootstrap.bats` | perfil, registry, perfil inválido |
| `detach.bats` | remove symlinks, preserva perfil, registry |
| `merge-hooks.bats` | merge idempotente de hooks.json |
| `finalizar.bats` | empacota review |
