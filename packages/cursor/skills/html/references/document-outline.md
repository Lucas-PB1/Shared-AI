# Outline do documento

## Headings

- Hierarquia sem pular níveis (`h1` → `h2`, não `h1` → `h3`)
- Um tópico principal por página (`h1`)

## Landmarks

- Um `main` por view
- `nav` para blocos de navegação principais

## SEO e leitores

- Título (`title`) único e descritivo
- Meta description honesta ao conteúdo

## Skip links

- Link “pular para conteúdo” no topo quando layout complexo

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

