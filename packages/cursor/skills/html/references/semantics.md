# Semântica

## Elementos

- `header`, `nav`, `main`, `footer`, `article`, `section` conforme papel
- `button` para ações; `a` para navegação
- Listas reais: `ul`/`ol`/`dl`

## Texto

- `strong` vs `b`, `em` vs `i` quando ênfase importa
- `time` com `datetime` para datas machine-readable

## Imagens

- `alt` descritivo ou vazio decorativo (`alt=""`)
- `figure` + `figcaption` quando legenda agrega

## Evitar

- Div soup sem landmarks
- Headings só para tamanho de fonte

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

