# Unit of Work

## Propósito

- Agrupa mudanças de um ou mais repositórios em commit atômico
- Rastreia objetos alterados durante um caso de uso
- Evita commit parcial quando múltiplos agregados participam (com critério)

## Uso típico

```
uow.iniciar()
repoA.salvar(a)
repoB.salvar(b)
uow.confirmar()
```

- Rollback em falha de domínio ou infra

## Relação com agregado

- Preferir **um agregado por transação** quando possível
- Dois agregados no mesmo UoW: exceção documentada (saga/eventual consistency)

## Implementação

- Pode ser wrapper sobre transação de DB ou `DbContext` único
- Interface `UnidadeDeTrabalho` no application; impl na infra

## Checklist prático

- [ ] Casos de uso não chamam `commit` de driver direto
- [ ] Escopo de UoW = um request/comando na web típica
- [ ] Sagas para consistência entre BCs, não UoW distribuído fake

## Exemplos mentais

- **Bom:** transferência entre contas: um UoW, dois repos mesma DB
- **Ruim:** UoW global singleton sem escopo de request

## Quando revisitar

- Fluxo assíncrono multi-step
- Microserviços: trocar UoW local por outbox/saga
