# Hooks

## Rules

- Só no top level; só em React functions
- Custom hooks para lógica reutilizável com estado

## Comuns

- `useMemo`/`useCallback` quando referência estável importa
- `useEffect` para sync com sistemas externos — não para derivar estado

## Dependências

- Array de deps completo e honesto; eslint-plugin-react-hooks

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

