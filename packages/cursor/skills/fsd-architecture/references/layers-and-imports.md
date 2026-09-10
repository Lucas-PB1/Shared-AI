# Camadas e imports

## Camadas típicas (front Next)

```text
src/
├── app/        # rotas finas, providers, layouts Next
├── widgets/    # blocos compostos de página
├── features/   # ações do usuário (slices)
├── entities/   # modelos de negócio + UI de entidade
└── shared/     # api clients, ui kit, lib, config
```

## Matriz de imports

| Camada | Pode importar |
| --- | --- |
| `app` | widgets, features, entities, shared |
| `widgets` | features, entities, shared |
| `features` | entities, shared |
| `entities` | shared |
| `shared` | apenas npm |

**Proibido:** importar camada superior (ex.: `shared` → `features`).

## Next App Router

Rotas em `app/` (ou `src/app/`) devem ser finas: montar widgets/features, não esconder regras de negócio.
