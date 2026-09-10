# Módulos e DI

- `@Module({ imports, controllers, providers, exports })` — exportar só o contrato para outros módulos
- Preferir `providedIn` / providers explícitos no módulo do BC
- Evitar circular dependency: extrair shared module ou inverter dependência
- Feature modules por pasta (`src/catalog`, `src/identity`, `src/game`)
