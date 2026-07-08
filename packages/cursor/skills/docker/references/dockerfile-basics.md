# Fundamentos do Dockerfile

## Estrutura mínima

- `FROM` com tag fixa (ex.: `python:3.12-slim`, não `latest`)
- `WORKDIR` explícito antes de copiar arquivos
- Instalar deps antes de copiar o código (aproveita cache)
- `CMD`/`ENTRYPOINT` claros: forma exec (`["cmd", "arg"]`), não shell

## Ordem das instruções

- Menos volátil no topo, mais volátil embaixo
- Manifesto de deps (`package.json`, `requirements.txt`, `composer.json`) antes do código-fonte
- Assim mudança de código não invalida a camada de instalação de deps

## Instruções comuns

- `RUN` — executa no build; encadear com `&&` e limpar cache do gerenciador de pacotes
- `COPY` — preferir a `ADD` (que faz coisas implícitas com URL/tar)
- `EXPOSE` — documenta a porta (não publica; publicação é no `run`/compose)
- `ENV` — valores padrão de config; segredo não vai aqui

## ENTRYPOINT vs CMD

- `ENTRYPOINT` = executável fixo do container
- `CMD` = argumentos padrão (sobrescrevíveis na linha de comando)
- Script de entrypoint útil para migração/espera de dependência antes de subir

## Evitar

- `RUN apt-get update` em camada separada do `install` (cache stale)
- Deixar arquivos temporários e cache de pacote na imagem final
- Hardcode de porta/host que deveria vir de env
