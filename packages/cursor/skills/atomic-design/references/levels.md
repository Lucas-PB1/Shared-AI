# Níveis (átom → página)

## Átomos

- Blocos indivisíveis de UI: botão, ícone, input, heading
- Props mínimas; sem margem de layout de página
- Estilo via tokens (cor, espaçamento, tipografia)

## Moléculas

- Grupos funcionais simples: busca (input + botão), label + campo + hint
- Comportamento local (toggle visibilidade) ok; sem fluxo de negócio completo

## Organismos

- Seções reconhecíveis: barra de navegação, formulário de login, lista com filtros
- Compõem moléculas e átomos; podem ter layout interno

## Templates

- Esqueleto de página: regiões e placeholders, conteúdo fictício ou sample
- Foco em estrutura responsiva e grid, não dados reais

## Pages

- Instância concreta: template + conteúdo + estado de rota
- Onde dados reais e integrações de apresentação se conectam (via props/hooks genéricos)

## Checklist prático

- [ ] Cada nível tem exemplos no catálogo/documentação
- [ ] Átomos acessíveis isoladamente (teclado, leitor de tela)
- [ ] Page não redefine estilos que organismo já encapsula

## Exemplos mentais

- **Bom:** organismo `CardNoticia` recebe title, body, actions
- **Ruim:** átomo `Button` que dispara `submitPedidoCompleto`

## Quando revisitar

- Novo padrão visual global (rebrand)
- Organismo usado só uma vez — avaliar descer para molécula ou subir lógica
