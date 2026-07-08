# Config 12-factor

## Config no ambiente

- Tudo que varia entre ambientes vai para variável de ambiente
- Código não sabe em qual ambiente roda; lê da config
- Um mesmo build/imagem promovido entre dev → staging → prod

## .env

- `.env` para dev local, sempre no `.gitignore`
- Versionar `.env.example` com todas as chaves e valores placeholder
- Carregar via ferramenta do runtime (dotenv, Compose `env_file`), não hardcode

## Tipagem e validação

- Validar presença e formato das envs no boot; falhar cedo se faltar obrigatória
- Converter tipos explicitamente (env é sempre string)
- Default seguro só para valor não sensível

## Separação por ambiente

- Nunca reusar credencial entre ambientes
- Nomes de chave estáveis; valor muda por ambiente
- Config de terceiros (URLs, flags) também por env, não `if ambiente == prod`

## Front-end

- Só expor ao client o que é público; prefixos como `NEXT_PUBLIC_`/`VITE_` viram bundle público
- Segredo de verdade fica no backend

## Evitar

- `config.prod.js` com segredo no repo
- Ramificar comportamento por hostname em vez de por config
- Env obrigatória sem validação (falha tardia e obscura)
