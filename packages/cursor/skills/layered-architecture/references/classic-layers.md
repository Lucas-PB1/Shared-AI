# Camadas clássicas

## Apresentação

- Entrada/saída: HTTP, CLI, filas, eventos de UI
- Formatação, validação de formato, autenticação de transporte
- Não decide regras de domínio; delega à camada de negócio

## Negócio (domínio / aplicação)

- Casos de uso, políticas, cálculos, invariantes
- Orquestra transações de alto nível
- Depende de abstrações para dados e serviços externos

## Dados (infraestrutura de persistência)

- Implementa repositórios, mapeamento ORM, queries
- Detalhes de banco, cache, arquivos
- Não expõe tipos de persistência para a apresentação

## Fluxo típico

```
Entrada → CasoDeUso → Repositório → Store
         ← Resultado ← Entidade   ←
```

## Checklist prático

- [ ] Nenhuma regra de negócio exclusiva na camada de apresentação
- [ ] Casos de uso testáveis sem UI nem banco real
- [ ] Contratos de repositório definidos no negócio ou em portas
- [ ] Mudança de banco não exige alterar handlers de entrada

## Exemplos mentais

- **Bom:** handler chama `RegistrarPedido.executar(dto)`; repositório persiste
- **Ruim:** handler calcula desconto e grava linhas SQL inline

## Quando revisitar

- Acoplamento entre camadas após novas integrações
- Testes lentos ou frágeis por dependência de infra na UI
