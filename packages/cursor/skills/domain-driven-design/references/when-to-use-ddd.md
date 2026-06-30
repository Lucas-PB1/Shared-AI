# Quando usar DDD

## Sinais favoráveis

- Especialistas de domínio disponíveis para colaborar
- Regras que mudam por regulamentação, contrato ou estratégia
- Alto custo de erro (financeiro, saúde, compliance)
- Integração entre áreas com modelos conflitantes

## Sinais desfavoráveis

- CRUD com poucas regras e prazo de MVP curto
- Time só técnico sem acesso a negócio
- “DDD” como buzzword sem event storming ou glossário

## Escopo gradual

- Começar estratégico leve (BC + linguagem) no core subdomínio
- Táticos só onde invariantes justificam agregados
- Generic subdomains: integração simples, sem agregado rico

## Métricas de sucesso

- Menos “telefone quebrado” entre PO e dev nos mesmos termos
- Mudanças de regra localizadas em agregado/contexto certo
- Integrações explícitas no context map, não imports cruzados

## Checklist prático

- [ ] Complexidade de negócio documentada (não assumida)
- [ ] Alternativa mais simples (camadas + CRUD) descartada com razão
- [ ] Plano de envolvimento contínuo do domínio, não workshop único

## Quando revisitar

- Produto pivotou para commodity
- Complexidade migrou para escala técnica, não regra de negócio
