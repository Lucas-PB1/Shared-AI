# Perfis de bootstrap

Aplicados com:

```bash
npm run bootstrap -- /caminho/do/repo --profile=laravel
npm run bootstrap -- /caminho/do/repo --profile=hubspot
npm run bootstrap -- /caminho/do/repo --profile=react
```

Cada perfil cria **somente se não existir**:

| Arquivo | Descrição |
| --- | --- |
| `.cursor/SKILLS-ROUTING.md` | Complemento de roteamento do projeto |
| `.cursor/rules/*-project.mdc` | Rule versionável (não symlink) |

Arquivos reais do projeto **nunca são sobrescritos**.
