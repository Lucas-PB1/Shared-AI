# Casos de uso

## Papel

- Orquestram fluxo de uma intenção do usuário ou sistema
- Coordenam entidades e portas; não contêm regras de baixo nível repetidas
- Um caso de uso ≈ uma operação nomeada no vocabulário do produto

## Estrutura sugerida

```
Entrada (comando/query)
  → validar permissões e pré-condições
  → carregar agregados via portas
  → aplicar regras (entidades)
  → persistir / publicar eventos
  → saída (resultado ou erro de domínio)
```

## Granularidade

- Preferir casos focados a “ApplicationService” monolítico
- Compartilhar helpers de domínio, não copiar sequências inteiras

## Erros

- Falhas de regra: tipos de domínio (não códigos HTTP na camada interna)
- Adaptador externo traduz para protocolo (404, 422, etc.)

## Checklist prático

- [ ] Nome reflete linguagem ubíqua (“ConfirmarReserva”, não “ProcessData”)
- [ ] Sem I/O direto: tudo via portas injetadas
- [ ] Idempotência considerada quando a operação pode repetir

## Exemplos mentais

- **Bom:** `TransferirFundos` debita/credita via entidades e unit of work
- **Ruim:** caso de uso com 400 linhas e SQL embutido

## Quando revisitar

- Caso de uso vira ponto de merge constante
- Lógica duplicada entre casos irmãos
