# Produzir conteúdo OKF

## Antes de escrever

1. Definir **escopo do bundle** (domínio: produto, dados, runbooks, etc.)
2. Quebrar conhecimento em **concepts atômicos** — uma ideia, tabela, API ou playbook por arquivo
3. Criar ou atualizar `index.md` no diretório afetado
4. Registrar mudança relevante em `log.md` (opcional mas útil para agentes)

## Novo concept

1. Escolher caminho estável — o **concept ID** é o path sem `.md` (ex.: `apis/checkout.md` → `apis/checkout`)
2. Frontmatter mínimo:

```yaml
---
type: API Endpoint
title: Checkout API
description: Cria sessão de pagamento.
---
```

3. Body estruturado; citar fontes em `# Citations` se houver claims externos
4. Linkar concepts relacionados com paths `/` na raiz do bundle

## Refatorar documento longo

1. Extrair unidades (métricas, tabelas, decisões, playbooks) em arquivos separados
2. Deixar no arquivo original um resumo + links para os novos concepts, ou remover após migração
3. Atualizar `index.md` e `log.md`
4. Revisar `timestamp` nos concepts alterados

## Nomenclatura de arquivos

- kebab-case ou snake_case consistente no bundle
- Evitar espaços no path
- Subpasta `references/` para espelhar material externo como concepts

## Checklist antes de commitar

- [ ] Todo concept tem `type`
- [ ] `index.md` lista concepts novos ou movidos
- [ ] Links absolutos `/…` apontam para paths corretos no bundle
- [ ] Sem frontmatter em `index.md` (exceto `okf_version` na raiz)
- [ ] UTF-8, uma concept por arquivo

## Template rápido

```markdown
---
type: 
title: 
description: 
tags: []
timestamp: 
---

## Contexto

## Detalhes

## Relacionados

- [Outro concept](/caminho/outro.md)

# Citations

[1] 
```
