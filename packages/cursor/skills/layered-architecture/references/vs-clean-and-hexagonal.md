# Camadas clássicas vs clean e hexagonal

## Semelhanças

- Separação entre regras e detalhes técnicos
- Testabilidade melhor quando o núcleo não depende de infra

## Diferenças

| Aspecto | Camadas clássicas | Clean / hexagonal |
| --- | --- | --- |
| Eixo | Horizontal (níveis) | Núcleo + bordas |
| Dependência | Top-down comum | Sempre para dentro |
| Persistência | Camada “de baixo” | Adapter driven |
| Evolução | Risco de camadas grossas | Ports explícitos |

## Quando manter camadas clássicas

- Time pequeno, domínio simples, prazo curto
- Ferramentas que já impõem MVC (framework web tradicional)

## Quando evoluir

- Múltiplas entradas (API, batch, eventos) sobre mesmas regras
- Troca frequente de integrações ou persistência
- Domínio rico que não cabe em “service layer” única

## Migração gradual

1. Extrair casos de uso da apresentação
2. Introduzir interfaces de repositório no negócio
3. Renomear camada de dados em adapters concretos
4. Opcional: renomear pacotes para slices ou hexágono

## Checklist prático

- [ ] Núcleo de regras identificável sem imports de infra
- [ ] Decisão documentada: camadas vs hexágono para este produto
- [ ] Não duplicar conceito “service” em três camadas diferentes

## Quando revisitar

- Novo canal de entrada (mobile, parceiro, fila)
- Incidente causado por lógica na camada errada
