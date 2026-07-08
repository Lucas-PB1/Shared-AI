# systemd e serviços

## Unit de serviço

- Arquivo `.service` em `/etc/systemd/system/`
- Seções: `[Unit]` (descrição, dependências), `[Service]` (como rodar), `[Install]` (quando habilitar)
- `ExecStart` com caminho absoluto do binário

## Ciclo de vida

- `systemctl daemon-reload` após editar unit
- `systemctl enable --now app` habilita no boot e inicia agora
- `systemctl status/restart/stop app`
- `Restart=on-failure` + `RestartSec` para auto-recuperação

## Segurança da unit

- `User=`/`Group=` dedicados, não root
- Hardening: `NoNewPrivileges=true`, `ProtectSystem=strict`, `PrivateTmp=true`
- `WorkingDirectory` e `EnvironmentFile=` para config (env fora do unit)

## Dependências e ordem

- `After=network-online.target`, `Requires=`/`Wants=` para dependências
- `WantedBy=multi-user.target` no `[Install]` para subir no boot

## Timers (alternativa a cron)

- `.timer` + `.service` para agendamento gerenciado pelo systemd
- Vantagem: log no journald, dependências, `OnBootSec`/`OnCalendar`, catch-up com `Persistent=true`

## Logs

- `journalctl -u app -f` para acompanhar; `-e` para o fim; `--since` para janela

## Evitar

- `ExecStart` com caminho relativo
- Serviço rodando como root sem necessidade
- Esquecer `daemon-reload` após editar a unit
