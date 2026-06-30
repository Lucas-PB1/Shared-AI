# Quando usar repository

## Use quando

- Persistência não trivial (agregados, mapping, transações)
- Testes de domínio exigem substituir storage
- SQL/ORM não deve vazar para casos de uso

## Evite ou simplifique quando

- Aplicação CRUD fina com uma tabela e sem regras
- Active Record do framework já isola bem e time aceita trade-off
- Overhead de interface duplicada sem segundo implementação prevista

## Alternativas

- DAO genérico em apps pequenas
- Query side separado (read store) sem repo de escrita unificado
- Document store com repositório document-oriented explícito

## Com CQRS

- Command side: repositório de agregado
- Query side: projeções, views materializadas, sem reutilizar repo de escrita

## Checklist prático

- [ ] Benefício de teste ou troca de infra confirmado
- [ ] Não duplicar ORM API 1:1 na interface
- [ ] Ownership claro: quem mantém queries pesadas

## Quando revisitar

- Repo com >15 métodos sem novos casos de uso
- Performance exige bypass — considerar read model, não quebrar encapsulamento
