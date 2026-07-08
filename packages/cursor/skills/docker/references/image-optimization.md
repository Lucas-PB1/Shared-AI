# Imagem enxuta e cache

## Multi-stage build

- Stage de build com toolchain completo; stage final só com runtime + artefato
- `COPY --from=build /app/dist ./dist` traz só o necessário
- Reduz drasticamente tamanho e superfície de ataque

## Base mínima

- Preferir variantes `-slim` ou `alpine` quando compatível
- `distroless` para runtime sem shell/gerenciador de pacote (máxima redução)
- Cuidar de libs C (musl vs glibc) ao usar alpine

## Cache de layers

- Copiar manifesto de deps e instalar antes do código
- Agrupar `RUN` relacionados; limpar cache no mesmo `RUN`
  - `apt-get install ... && rm -rf /var/lib/apt/lists/*`
  - `pip install --no-cache-dir`, `npm ci && npm cache clean --force`

## .dockerignore

- Sempre presente: excluir `.git`, `node_modules`, `vendor`, `*.log`, `.env`, artefatos
- Reduz contexto enviado ao daemon e evita cache busting desnecessário

## Medir

- `docker image ls` para tamanho; `docker history <img>` para ver camadas pesadas
- Comparar antes/depois ao otimizar

## Evitar

- Uma camada gigante com tudo (dificulta cache e debug)
- Instalar deps de desenvolvimento na imagem final
