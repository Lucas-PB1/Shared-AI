# ARIA

## Regra de ouro

- Não usar ARIA se elemento nativo já comunica papel e estado

## Comum

- `aria-label`, `aria-labelledby`, `aria-describedby`
- `aria-expanded`, `aria-controls` em disclosure
- `role` só quando semântica nativa insuficiente

## Live regions

- `aria-live="polite"` para atualizações não urgentes
- Evitar anunciar demais

## Anti-padrões

- `role="button"` em div sem teclado completo
- aria-hidden em foco ainda tabbable
