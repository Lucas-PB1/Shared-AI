# Vertical slice vs camadas horizontais

## Horizontal (tradicional)

```
/controllers
/services
/repositories
```

- Fácil encontrar “todos os repos”
- Mudança de feature atravessa muitas pastas
- Ownership difuso entre times

## Vertical

```
/feature-a/...
/feature-b/...
/shared/...
```

- Feature completa em um lugar
- Risco de duplicação se shared mal governado
- Melhor alinhamento a entrega incremental

## Híbrido comum

- Vertical no topo; dentro da fatia, camadas ou clean rings leves
- Infra cross-cutting (logging, auth middleware) em shared técnico

## Critérios de escolha

| Sinal | Preferir vertical |
| --- | --- |
| Times por produto/feature | Sim |
| Domínio único simples | Horizontal pode bastar |
| Alta taxa de mudança por área | Sim |
| Biblioteca técnica sem features | Horizontal |

## Checklist prático

- [ ] Decisão registrada no README ou ADR do repositório
- [ ] Lint de dependências entre fatias (opcional)
- [ ] Shared revisado em PR dedicado

## Quando revisitar

- Reorganização de squads
- Extração de microserviço a partir de fatia madura
