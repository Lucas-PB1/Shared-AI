# Context API

## Quando usar

- Tema, locale, auth session — dados estáveis ou pouco frequentes
- Evitar context para todo estado global

## Performance

- Split contexts por frequência de update
- Memoizar value object ou passar dispatch separado
