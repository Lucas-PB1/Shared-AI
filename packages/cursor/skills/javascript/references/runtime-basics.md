# Runtime básico

## Tipos e coerção

- `===` por default; entender falsy values
- Optional chaining e nullish coalescing

## Event loop

- Microtasks vs macrotasks — ordem de then/setTimeout
- Não bloquear main thread com trabalho pesado (worker se needed)

## Coleções

- `Map`/`Set` quando chave não-string ou unicidade
- Spread/immutability para updates previsíveis

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

