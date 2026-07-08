# Logs estruturados

## Formato

- JSON com campos fixos: `timestamp`, `level`, `message`, `service`, `context`
- Máquina consegue filtrar/agregar; texto livre não
- Um evento por linha (JSON Lines) para ingestão

## Níveis

- `debug` (dev), `info` (eventos normais), `warn` (anomalia recuperável), `error` (falha)
- Nível configurável por ambiente via env; produção normalmente em `info`
- Não usar `error` para coisa esperada (polui alertas)

## Correlação

- `request_id`/`trace_id` propagado por toda a requisição
- Permite juntar todos os logs de uma mesma operação
- Incluir identificadores úteis (sem expor PII completa)

## O que logar

- Entrada/saída de operação relevante, decisões, falhas com causa
- Contexto suficiente para reproduzir sem abrir debugger
- Erro com stack no `error`, mensagem clara no `message`

## O que NÃO logar

- Senha, token, chave, cartão, PII completa
- Payload gigante inteiro; logar resumo/tamanho
- Segredo em query string

## Destino

- `stdout`/`stderr` em container (coletor externo agrega) — 12-factor
- journald/arquivo com rotação em servidor tradicional

## Evitar

- Concatenar dados em string em vez de campos
- Log excessivo em caminho quente (custo e ruído)
