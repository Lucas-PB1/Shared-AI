---
name: layered-architecture
description: >-
  Orienta organização em camadas clássicas (apresentação, negócio, dados). Use ao estruturar aplicações monolíticas, separar responsabilidades por nível ou comparar com clean/hexagonal.
---

# Arquitetura em camadas

## Quando usar

- Monolito ou serviço com fronteiras de deploy únicas
- Equipe acostumada a MVC ou three-tier tradicional
- Necessidade de separar UI, regras e persistência de forma explícita

## Princípios

- Dependências descem: apresentação → negócio → dados
- Camada de negócio não conhece detalhes de UI ou SQL
- Cada camada expõe contratos estáveis para a de cima

## Referências

| Tópico | Arquivo |
| --- | --- |
| Camadas clássicas | [references/classic-layers.md](references/classic-layers.md) |
| vs clean e hexagonal | [references/vs-clean-and-hexagonal.md](references/vs-clean-and-hexagonal.md) |

## Como aplicar

1. Mapear fluxo de uma operação do usuário até a persistência
2. Colocar regras invariantes na camada de negócio, não na apresentação
3. Isolar acesso a dados atrás de interfaces na camada de dados
4. Evitar chamadas que “pulam” camadas (UI → banco direto)

## Anti-padrões comuns

- Camada de negócio anêmica: só DTOs e validação superficial
- Lógica de negócio espalhada em handlers de entrada
- Dependência circular entre camadas (negócio importando UI)
- “Camada de serviço” gigante que faz tudo

## Relacionado

- `clean-architecture` — regra de dependência para o núcleo
- `hexagonal-architecture` — ports/adapters em vez de camadas rígidas
- `vertical-slice` — organização por feature em vez de horizontal
- `repository` — abstração de persistência na camada de dados
- `solid` — SRP e DIP dentro de cada camada
