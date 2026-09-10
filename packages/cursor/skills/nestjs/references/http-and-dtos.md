# HTTP e DTOs

- Controllers: rotas, status codes, decorators Swagger (`@ApiTags`, `@ApiOkResponse`)
- DTOs com `class-validator` / `class-transformer`; não reutilizar entity TypeORM como DTO de entrada
- `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted` quando seguro
- Separar query params / body / path em classes distintas
