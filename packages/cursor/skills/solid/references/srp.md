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
