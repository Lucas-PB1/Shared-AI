# Async e Promises

## async/await

- Preferir await sequencial claro; `Promise.all` para paralelo independente
- try/catch em fronteiras async; finally para cleanup

## Erros

- Rejeições sempre tratadas
- Evitar mix callback + Promise no mesmo fluxo

## Padrões

- AbortController para cancelar fetch
- Debounce/throttle em handlers frequentes

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

