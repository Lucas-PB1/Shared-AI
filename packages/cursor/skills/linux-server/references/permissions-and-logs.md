# Permissões e logs

## Modelo de permissão

- `usuário / grupo / outros`, com `r(4) w(2) x(1)`
- Diretório precisa de `x` para ser atravessado
- `chmod` numérico (`640`, `750`) ou simbólico (`u+rw,g+r`)

## Menor privilégio

- Usuário de serviço dedicado, dono só do que precisa
- Evitar `777`; secret com `600` (só dono lê)
- `chown -R app:app /var/www/app` no diretório da app, não em tudo

## sudo

- Conceder comandos específicos via `/etc/sudoers.d/`, não acesso total
- Nunca compartilhar conta root; auditar quem tem sudo

## Logs

- journald: `journalctl -u serviço`, `--since`, `-p err` (por prioridade)
- Apps que escrevem em arquivo: `/var/log/...`
- Logrotate para não encher disco: rotação por tamanho/tempo + compressão + retenção

## Disco e diagnóstico

- `df -h` (espaço), `du -sh *` (o que ocupa), `ncdu` para explorar
- Log sem rotação é causa comum de disco cheio

## Evitar

- `chmod -R 777` como "solução"
- Segredo legível por todos (permissão frouxa)
- Log infinito sem rotação
