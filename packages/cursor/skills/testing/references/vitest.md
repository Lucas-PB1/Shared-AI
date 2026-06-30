# Vitest

## Setup

- `jsdom` ou happy-dom para componentes
- `setupFiles` para matchers (@testing-library/jest-dom)

## Estrutura

- `describe`/`it` por comportamento
- `vi.mock` para módulos pesados; preferir injeção quando possível

## Async

- `await waitFor`, `findBy*` para updates async

## Checklist prático

- [ ] Comportamento atual documentado ou coberto por teste antes de mudar
- [ ] Nomes e contratos claros para quem lê o código pela primeira vez
- [ ] Edge cases relevantes considerados (vazio, erro, mobile, teclado)
- [ ] Nenhum segredo ou dado sensível exposto inadvertidamente

## Exemplos mentais

- **Bom:** mudança pequena, intenção evidente no diff, fácil de reverter
- **Ruim:** abstração genérica usada uma vez, ou fix local que duplica regra global

## Quando revisitar

- Após feedback de review, bug em produção ou mudança de requisito
- Quando o mesmo padrão aparecer pela terceira vez (considerar extrair)

