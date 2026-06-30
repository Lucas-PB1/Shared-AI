# Regras de composição

## Direção de dependência

- Páginas → templates → organismos → moléculas → átomos
- Átomo não importa organismo
- Shared tokens/utilities na base, não no topo

## Props e slots

- Preferir composição (children, slots) a props booleanas explosivas (`isLargeWithIcon`)
- Variantes nomeadas com enum pequeno ou classes tokenizadas

## Estado

- Estado de UI local (aberto/fechado) em molécula/organismo quando isolável
- Estado de domínio ou sessão sobe para page ou container genérico acima

## Dados

- Átomos/moléculas recebem valores já formatados quando possível
- Formatação pesada ou i18n pode ficar em camada acima, não duplicada em cada átomo

## Documentação viva

- Catálogo por nível com estados: default, hover, disabled, erro, loading
- Exemplos de composição (“recipes”) para pares comuns

## Checklist prático

- [ ] Sem import circular entre níveis
- [ ] API pública estável para organismos usados em múltiplas pages
- [ ] Theming via tokens, não cores hardcoded espalhadas

## Exemplos mentais

- **Bom:** molécula `CampoTexto` usa átomos Label + Input + MensagemErro
- **Ruim:** page copia HTML de três telas com micro-diferenças

## Quando revisitar

- Props de organismo passam de ~10 — sinal para subdividir ou slot
- Performance: lista grande — virtualizar no organismo/lista, não no átomo
