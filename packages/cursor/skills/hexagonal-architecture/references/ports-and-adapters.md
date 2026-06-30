# Portas e adaptadores

## Porta

- Interface (ou contrato explícito) owned pelo domínio ou camada de aplicação
- Nome orientado ao domínio: `Notificador`, `RepositorioCliente`, não `PostgresDao`
- Mínimo necessário para o caso de uso; evitar CRUD genérico na porta

## Adaptador

- Traduz entre porta e tecnologia concreta
- Pode ser substituído sem alterar núcleo (outro DB, mock, fake)
- Responsável por retries, mapping, erros de infra — não regras de negócio

## Composição (composition root)

```
adaptadorHttp → CasoDeUso(repositorio: adaptadorSql, relogio: adaptadorSistema)
```

- Wiring fica fora do núcleo (main, módulo DI, factory)

## Tamanho dos adaptadores

- Preferir um adaptador por integração externa
- Compartilhar utilitários de infra, não portas diferentes fundidas

## Checklist prático

- [ ] Portas definidas onde o caso de uso as consome
- [ ] Adaptadores testados com contrato da porta (contract tests)
- [ ] Núcleo sem imports de SDK de terceiros

## Exemplos mentais

- **Bom:** `AdaptadorEmailSes implements EnviarEmail`
- **Ruim:** interface com 40 métodos espelhando ORM

## Quando revisitar

- Nova integração exige estender porta ou criar porta nova
- Adaptador cresce com branches por ambiente
