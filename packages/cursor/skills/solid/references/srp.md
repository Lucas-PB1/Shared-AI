# Single Responsibility Principle

## Ideia

- Um módulo/classe deve ter uma razão principal para mudar
- Separar persistência, UI, regras de negócio e integrações externas

## Na prática

- Componente de UI não calcula imposto nem grava no banco
- Serviço de domínio não formata HTML

## Sinais de violação

- Arquivo gigante com seções “Utils”, “API”, “UI” misturadas
- Mudança em layout quebra teste de regra de negócio

## React funcional

- Container vs apresentacional quando simplifica testes
- Hooks customizados para lógica reutilizável, não para tudo

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

