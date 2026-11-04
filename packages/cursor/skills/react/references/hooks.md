# Hooks

## Rules

- Só no top level; só em React functions
- Custom hooks para lógica reutilizável com estado

## Comuns

- `useMemo`/`useCallback` quando referência estável importa
- `useEffect` para sync com sistemas externos — não para derivar estado

## Dependências

- Array de deps completo e honesto; eslint-plugin-react-hooks
