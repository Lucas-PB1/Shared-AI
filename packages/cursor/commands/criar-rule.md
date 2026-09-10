# Criar rule (`/criar-rule`)

Scaffold de rule Cursor (`.mdc`) no padrão Shared AI.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/criar-rule` | Wizard interativo |
| `/criar-rule <nome>` | Nome kebab-case do arquivo (sem `.mdc`) |

## Perguntar (se faltar)

1. **Nome do arquivo** — ex.: `api-conventions` → `api-conventions.mdc`
2. **Destino**
   - **Projeto** → `.cursor/rules/<nome>.mdc` (default)
   - **Orquestrador shared-ai** → `packages/cursor/rules/skills-orchestrator-<nome>.mdc` (só no clone; raro)
3. **Escopo**
   - **Always** → `alwaysApply: true` (sem globs)
   - **Glob** → pedir padrões (ex.: `**/*.{ts,tsx}`, `src/catalog/**`)
4. **Description** — uma linha para o picker de rules
5. **Tipo**
   - **Projeto** — convenções do repo (template `rule-project.mdc`)
   - **Orquestrador** — só roteia skills (seguir rules `skills-orchestrator-*.mdc`: Responsabilidade + tabela + Composição)

## Gerar

Template: `$SHARED_AI_ROOT/packages/cursor/templates/rule-project.mdc`.

1. Preencher frontmatter (`description`, `globs` ou `alwaysApply`).
2. Corpo curto: bullets acionáveis (não copiar skill inteira).
3. Não sobrescrever rule existente sem confirmação.
4. Resumo: path + se precisa `npm run sync` (orquestrador global).

## Checklist

- [ ] `alwaysApply: true` **ou** `globs` definidos (não os dois ambíguos)
- [ ] description útil no picker
- [ ] rule de projeto versionável no git do repo
- [ ] orquestrador: só roteia; conteúdo na skill
