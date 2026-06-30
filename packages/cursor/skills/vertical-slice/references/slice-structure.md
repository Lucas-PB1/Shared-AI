# Estrutura da fatia

## Conteúdo típico de uma fatia

- Ponto de entrada (handler, rota, comando)
- Caso de uso ou orquestração da feature
- Modelo local (entidades/DTOs específicos)
- Persistência ou gateway só desta capacidade
- Testes co-localizados ou subpasta `tests/`

## Exemplo de layout (neutro)

```
features/
  emitir-relatorio/
    EmitirRelatorioHandler
    EmitirRelatorioCasoDeUso
    RelatorioRepositorio
    tipos.ts
    emitir-relatorio.test
```

## Fronteiras

- Fatia A não importa internals de fatia B; usar portas públicas ou eventos
- Dados compartilhados: anti-corruption layer na borda da fatia

## Tamanho

- Começar com fatia única até doer; dividir quando ownership ou deploy divergir
- Fatias muito pequenas geram ruído; muito grandes voltam ao monolito horizontal

## Checklist prático

- [ ] Mudança típica da feature toca poucas pastas
- [ ] Contrato público da fatia documentado (API, eventos)
- [ ] Testes da fatia rodam isolados na CI

## Exemplos mentais

- **Bom:** “checkout” contém pagamento + estoque + notificação da jornada
- **Ruim:** toda alteração passa por `services/` global de 200 arquivos

## Quando revisitar

- Merge conflicts recorrentes entre squads na mesma fatia
- Dependência circular entre features
