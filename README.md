# HostDime IA

Dois pacotes, três comandos:

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run setup:code-review
npm run bootstrap -- /caminho/do/seu/projeto
```

| Comando | Pacote | O que faz |
| --- | --- | --- |
| `npm run setup:skills` | cursor | Rules, skills, hooks e `link-project.sh` em `~/.cursor/` |
| `npm run setup:code-review` | code-review | Commands `/avaliar` + `/finalizar`, skills de review, ferramentas (ESLint, PHPStan…) |
| `npm run bootstrap -- <repo>` | ambos | Symlinks + pastas `.cursor/review/` no projeto |

Só quer skills de dev? Rode só `setup:skills`. Só quer review? Rode só `setup:code-review` (precisa das deps Node/PHP).

Com hooks ativos, `bootstrap` é automático ao abrir o Agent.

## Estrutura

```
hostdime-ia/
├── package.json
├── packages/cursor/
└── packages/code-review/
```

MIT — [LICENSE](LICENSE).
