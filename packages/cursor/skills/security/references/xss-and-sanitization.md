# XSS e sanitização

## Risco

- `innerHTML`, `dangerouslySetInnerHTML`, templates com input cru
- URLs `javascript:` em href/src

## Mitigação

- Preferir textContent ou framework que escape por default
- Sanitizador allowlist (DOMPurify etc.) se HTML rico necessário
- CSP como camada adicional

## Dados

- Validar no servidor sempre; client é complemento
