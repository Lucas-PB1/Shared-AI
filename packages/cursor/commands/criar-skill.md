# Criar skill (`/criar-skill`)

Scaffold de uma skill Shared AI (padrão do pacote `packages/cursor/skills`).

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/criar-skill` | Wizard interativo |
| `/criar-skill <nome>` | Usa o nome (kebab-case) e pergunta o resto |

## Perguntar (se faltar)

1. **Nome** — `^[a-z0-9]+(-[a-z0-9]+)*$` (ex.: `tanstack-query`)
2. **Destino**
   - **Projeto** → `.cursor/skills/<nome>/` (sobrescreve global)
   - **Pacote Shared AI** → `packages/cursor/skills/<nome>/` (só se o cwd for o clone shared-ai)
3. **Description** — uma frase “o que faz + quando usar” (≤1024 chars)
4. **Refs** — criar `references/` com 1 arquivo stub? (default sim)

## Gerar

Templates: `$SHARED_AI_ROOT/packages/cursor/templates/skill-SKILL.md` e `skill-reference.md`.

```
<destino>/<nome>/
├── SKILL.md
└── references/
    └── overview.md    # se refs=sim
```

1. Substituir placeholders `{{name}}`, `{{description}}`, `{{title}}`, etc.
2. Não sobrescrever `SKILL.md` existente sem confirmação.
3. Se destino = pacote shared-ai: lembrar de atualizar `docs/SKILLS-ROUTING.md` + rules intent/stack se for skill de produto.
4. Resumo: path criado + próximo passo (`npm run sync` se pacote; ou só commit no projeto).

## Checklist de qualidade

- [ ] `name` no frontmatter = nome da pasta
- [ ] description com gatilhos concretos
- [ ] seções: Quando usar, Princípios, Como aplicar, Anti-padrões
- [ ] sem secrets nem paths absolutos de máquina
