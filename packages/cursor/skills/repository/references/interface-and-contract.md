# Interface e contrato

## Forma da interface

```
interface RepositorioPedido {
  obterPorId(id: IdPedido): Pedido | null
  salvar(pedido: Pedido): void
  // métodos adicionais só se usados por casos de uso reais
}
```

## Naming

- Verbos de domínio: `reservar`, `publicar`, não `updateRow`
- Coleções: retornar agregados ou read models nomeados, não `List<Map>`

## Escopo

- Métodos alinhados a casos de uso evitam interface inflada
- Especificações ou query objects para buscas complexas opcionais

## Onde declarar

- Domínio ou application layer (clean/hexagonal)
- Infra apenas implementa

## Checklist prático

- [ ] Cada método tem caller real em caso de uso
- [ ] Tipos de retorno são entidades/VOs ou IDs, não rows
- [ ] Null/optional documentado para “não encontrado”

## Exemplos mentais

- **Bom:** `obterPorId` reidrata agregado com invariantes
- **Ruim:** `findAll` paginado usado só em admin no repo de domínio

## Quando revisitar

- Novo caso de uso exige método ou query object separado
