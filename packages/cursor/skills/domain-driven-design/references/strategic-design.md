# Design estratégico

## Linguagem ubíqua

- Termos únicos por contexto; mesmo palavra pode significar coisas diferentes em outro BC
- Renomear código quando o negócio corrige vocabulário
- Testes e docs usam os mesmos nomes

## Bounded context (BC)

- Fronteira onde modelo e linguagem são consistentes
- Time, codebase ou deploy podem alinhar a um BC
- Dentro do BC, regras são coerentes; fora, não assumir igualdade de conceitos

## Subdomínios

- **Core** — diferencial competitivo; investir modelagem
- **Supporting** — necessário, customizado moderado
- **Generic** — comprar ou usar solução pronta (email, pagamento genérico)

## Context map (relações)

- Partnership, customer-supplier, conformist, anti-corruption layer, open host
- ACL traduz modelo externo para modelo local sem contaminar núcleo

## Checklist prático

- [ ] Glossário vivo ligado ao código (não só slide)
- [ ] BCs com owners e interfaces de integração documentadas
- [ ] Core domain identificado; generic não over-engineered

## Exemplos mentais

- **Bom:** “Catálogo” e “Envio” com definições distintas de `Item`
- **Ruim:** um `Item` ORM único para todos os departamentos

## Quando revisitar

- Fusão de produtos ou aquisição
- Termos novos em contrato legal ou regulatório
