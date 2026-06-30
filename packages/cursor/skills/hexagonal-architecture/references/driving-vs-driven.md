# Driving vs driven

## Driving (primary)

- Inicia interação com a aplicação
- Exemplos: controller HTTP, listener de fila, CLI, teste que chama caso de uso
- Converte protocolo externo em comando/query interno
- Não executa regras de domínio além de autorização de transporte

## Driven (secondary)

- Acionado pelo núcleo durante o fluxo
- Exemplos: repositório, gateway de pagamento, publicador de eventos
- Implementa porta definida pelo aplicativo

## Simetria

- Ambos são adaptadores; diferença é quem puxa o fio
- Diagrama hexagonal: driving à esquerda/top, driven à direita/bottom

## Múltiplos drivers

- Mesmo conjunto de casos de uso, vários adaptadores driving
- Evitar duplicar casos de uso por canal; divergir só na tradução de entrada

## Checklist prático

- [ ] Cada entrada nova = adaptador driving, não fork do domínio
- [ ] Portas driven mockáveis em teste de caso de uso
- [ ] Autenticação de canal no driving; autorização de negócio no núcleo

## Exemplos mentais

- **Bom:** REST e worker chamam `RegistrarEvento.executar`
- **Ruim:** worker com cópia da lógica porque “é assíncrono”

## Quando revisitar

- Canal batch precisa de semântica diferente (at-least-once, idempotência)
