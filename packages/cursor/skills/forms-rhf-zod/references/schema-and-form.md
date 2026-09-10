# Schema e form

```ts
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
type Values = z.infer<typeof schema>;
```

- Defaults alinhados ao schema (evitar `undefined` vs empty string inconsistente)
- `.refine` / `.superRefine` para regras cross-field
