# Fatias no frontend (variante FSD)

## Ideia

- Organizar UI por camadas de **propósito**, não só por tipo de arquivo
- Variante conhecida: Feature-Sliced Design (FSD) — vocabulário abaixo

## Camadas FSD (de baixo para cima)

| Camada | Papel |
| --- | --- |
| `shared` | UI kit, utils, API client genérico |
| `entities` | conceitos de negócio reutilizáveis (sem fluxo completo) |
| `features` | ações do usuário com valor (login, filtrar, favoritar) |
| `pages` | composição para rota/tela |
| `app` | providers, router, estilos globais |

## Regra de importação (FSD)

- Camada superior importa inferior; não o contrário
- Slices na mesma camada não se importam diretamente (usar shared ou composição na page)

## Relação com vertical slice backend

- Uma fatia backend pode mapear a `features/` + `entities/` no client
- Evitar espelhar 1:1 pastas backend no frontend se UX agrupa diferente

## Checklist prático

- [ ] Widget reutilizável em `shared`; lógica de negócio de ação em `features`
- [ ] Page fina: monta features, não implementa regra pesada
- [ ] Public API por slice (`index` export controlado)

## Exemplos mentais

- **Bom:** `features/adicionar-carrinho` usa `entities/produto`
- **Ruim:** `shared` importa `pages/checkout` por atalho

## Quando revisitar

- Árvore de imports circular entre features
- `entities` inchado com fluxos completos
