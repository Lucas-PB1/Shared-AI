# HostDime IA

Dois pacotes, seis comandos:

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run setup:code-review
npm run bootstrap -- /caminho/do/seu/projeto
```

| Comando | Escopo | O que faz |
| --- | --- | --- |
| `npm run setup:skills` | Máquina | Rules, skills, hooks (merge), motor de sync |
| `npm run setup:code-review` | Máquina | Commands `/avaliar`, `/avaliar-diff`, `/finalizar`, ferramentas |
| `npm run bootstrap -- <repo>` | Projeto | Symlinks + pastas `.cursor/review/` |
| `npm run bootstrap -- <repo> --profile=laravel\|hubspot\|react` | Projeto | + `SKILLS-ROUTING.md` e rule do stack |
| `npm run detach -- <repo>` | Projeto | Remove symlinks gerenciados; desregistra do sync |
| `npm run detach -- <repo> --keep-registry` | Projeto | Só remove symlinks; mantém no registry |
| `npm run sync` | Máquina | Após `git pull` — symlinks, hooks (merge), deps, relink projetos |
| `npm run sync -- --migrate` | Máquina | Igual ao sync, mas substitui cópias antigas (rsync) por symlinks |
| `npm run status` | Máquina | Versão, projetos, conflitos, symlinks quebrados |
| `npm run doctor` | Máquina | Diagnóstico rápido: ferramentas, hooks, instalação |
| `npm run review:ci -- [base]` | Projeto | Mesmo review-check do `/avaliar` nos arquivos do diff |

## Atualização

Rules, skills e commands são **symlinks** para o clone local. Depois de editar o repo:

```bash
cd hostdime-ia
git pull
npm run sync
npm run status
```

Conteúdo já editado no repo reflete na hora nos symlinks; `sync` recria links novos, atualiza deps e relinka projetos registrados.

## Coexistência com rules/skills próprias

O hostdime-ia **nunca sobrescreve** arquivo real em `~/.cursor/` ou no projeto. Se existir skill/rule/command própria no mesmo caminho, o pacote **pula** e o `status` avisa.

No projeto, `.cursor/skills/<nome>/` real **sobrescreve** a skill global (comportamento do orquestrador Cursor).

O `bootstrap` também atualiza o `.gitignore` do projeto com symlinks e conteúdo operacional de `review/`, **somente** quando `.cursor/` inteiro ainda não está ignorado. Rules e skills próprias do projeto continuam versionáveis.

## Estrutura

```
hostdime-ia/
├── CHECKLIST.md      # backlog de melhorias
├── VERSION
├── package.json
└── packages/
    ├── cursor/
    └── code-review/
```

MIT — [LICENSE](LICENSE).
