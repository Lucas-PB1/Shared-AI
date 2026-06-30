# Segurança básica

## Input

- Validar e sanitizar toda entrada externa (HTTP, CLI, fila)
- Whitelist > blacklist

## SQL

- **Sempre** prepared statements / query builder parametrizado
- Nunca concatenar input em SQL

## Output (XSS)

- Escapar na saída HTML: `htmlspecialchars($value, ENT_QUOTES, 'UTF-8')`
- Templates (Blade) escapam por padrão — não usar `{!! !!}` com input do usuário

## Senhas

- `password_hash()` / `password_verify()` — nunca MD5/SHA1

## Arquivos e paths

- Validar uploads (tipo, tamanho, destino)
- Evitar path traversal em nomes de arquivo

## CSRF / sessão

- Em apps web com form: token CSRF (frameworks costumam fornecer)

## Relacionado

- skill `security` (web client-side)
- Laravel: middleware e FormRequest — skill `laravel`
