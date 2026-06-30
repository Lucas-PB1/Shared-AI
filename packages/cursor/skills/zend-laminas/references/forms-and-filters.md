# Forms e Input Filters

## Laminas Form

- Form class com elements e input filter spec
- Bind object (hydrator) para populate/edit

## Validação

- InputFilter com validators (`NotEmpty`, `EmailAddress`, etc.)
- Mensagens customizadas por campo

## CSRF

- Element `Csrf` em forms web state-changing

## Fluxo

```
POST → Form → setData($request->getPost()) → isValid()
     → getData() ou bind → Service → persist
```

## API vs web

- APIs JSON: validar com InputFilter standalone ou middleware
- Não reutilizar form HTML cegamente para JSON sem adaptar

## Evitar

- Validar só no client
- Ignorar `isValid()` e usar raw POST

## Relacionado

- skill `php/references/security-basics.md`
- skill `laravel/references/http-layer.md` — FormRequest (contraste)
