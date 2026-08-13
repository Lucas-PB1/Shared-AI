'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  saveConnection,
  switchTarget,
  syncFromCloud,
  testConnectionsAction,
  type SettingsActionState,
} from '@/features/settings/actions';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: SettingsActionState = {};

type PairStatus = {
  url: string;
  publishableKeySet: boolean;
  secretKeySet: boolean;
};

type Snapshot = {
  target: 'local' | 'cloud';
  local: PairStatus;
  cloud: PairStatus;
};

function pairReady(pair: PairStatus) {
  return Boolean(pair.url && pair.publishableKeySet && pair.secretKeySet);
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        ok
          ? 'inline-block h-2 w-2 rounded-full bg-emerald-500'
          : 'inline-block h-2 w-2 rounded-full bg-amber-500'
      }
      aria-hidden
    />
  );
}

function ConnectionSummaryRow({
  label,
  pair,
}: {
  label: string;
  pair: PairStatus;
}) {
  const ready = pairReady(pair);
  return (
    <div className="flex items-start justify-between gap-3 rounded-hd-xl border border-hd-border/80 bg-hd-surface/40 px-3.5 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <StatusDot ok={ready} />
          <span className="text-sm font-semibold text-hd-ink">{label}</span>
          <Badge
            className={
              ready
                ? undefined
                : 'border-amber-500/20 bg-amber-50 text-amber-800'
            }
          >
            {ready ? 'Salvo' : 'Incompleto'}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-hd-muted" title={pair.url}>
          {pair.url || '—'}
        </p>
        <p className="text-xs text-hd-muted">
          Publishable {pair.publishableKeySet ? 'definida' : 'vazia'} · Secret{' '}
          {pair.secretKeySet ? 'definida' : 'vazia'}
        </p>
      </div>
    </div>
  );
}

function ConnectionFields({
  prefix,
  title,
  pair,
}: {
  prefix: 'local' | 'cloud';
  title: string;
  pair: PairStatus;
}) {
  return (
    <fieldset className="space-y-3 rounded-hd-xl border border-hd-border p-4">
      <legend className="px-1 text-sm font-semibold text-hd-ink">{title}</legend>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}Url`}>URL</Label>
        <Input
          id={`${prefix}Url`}
          name={`${prefix}Url`}
          defaultValue={pair.url}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}PublishableKey`}>
          Publishable key {pair.publishableKeySet ? '(mantém a atual se vazio)' : ''}
        </Label>
        <Input
          id={`${prefix}PublishableKey`}
          name={`${prefix}PublishableKey`}
          type="password"
          placeholder={
            pair.publishableKeySet ? '•••••••• (já salva)' : 'sb_publishable_…'
          }
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}SecretKey`}>
          Secret key {pair.secretKeySet ? '(mantém a atual se vazio)' : ''}
        </Label>
        <Input
          id={`${prefix}SecretKey`}
          name={`${prefix}SecretKey`}
          type="password"
          placeholder={pair.secretKeySet ? '•••••••• (já salva)' : 'sb_secret_…'}
          autoComplete="off"
        />
      </div>
    </fieldset>
  );
}

export function SettingsPanel({
  snapshot,
}: {
  snapshot: Snapshot;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [switchState, switchAction, switchPending] = useActionState(
    switchTarget,
    initial,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveConnection,
    initial,
  );
  const [testState, testAction, testPending] = useActionState(
    testConnectionsAction,
    initial,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    async (_prev: SettingsActionState, _formData: FormData) => syncFromCloud(),
    initial,
  );

  useEffect(() => {
    for (const state of [switchState, saveState, testState, syncState]) {
      if (state.error) {
        toast.error(
          state.report ? `${state.error} — ${state.report}` : state.error,
        );
      }
      if (state.success) {
        toast.success(
          state.report ? `${state.success} — ${state.report}` : state.success,
        );
      }
    }
  }, [switchState, saveState, testState, syncState]);

  useEffect(() => {
    if (saveState.success) setEditOpen(false);
  }, [saveState]);

  const bothReady = pairReady(snapshot.local) && pairReady(snapshot.cloud);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Target ativo</CardTitle>
        <CardDescription>
          Agora: <strong>{snapshot.target}</strong> — gravado em{' '}
          <code>app_settings</code> + cookies (sem .env).
        </CardDescription>
        <form action={switchAction} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="target" value="local" />
          <Button
            type="submit"
            variant={snapshot.target === 'local' ? 'primary' : 'secondary'}
            disabled={switchPending}
          >
            Usar local
          </Button>
        </form>
        <form action={switchAction} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="target" value="cloud" />
          <Button
            type="submit"
            variant={snapshot.target === 'cloud' ? 'primary' : 'secondary'}
            disabled={switchPending}
          >
            Usar cloud
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Conexão</CardTitle>
            <CardDescription>
              Pares em <code>app_connections</code>. Secrets não aparecem na
              tela — só o status.
            </CardDescription>
          </div>
          <Badge
            className={
              bothReady
                ? undefined
                : 'border-amber-500/20 bg-amber-50 text-amber-800'
            }
          >
            {bothReady ? 'Configurado' : 'Pendente'}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ConnectionSummaryRow label="Local" pair={snapshot.local} />
          <ConnectionSummaryRow label="Cloud" pair={snapshot.cloud} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <form action={testAction}>
            <Button type="submit" variant="secondary" disabled={testPending}>
              {testPending ? 'Testando…' : 'Testar conexão'}
            </Button>
          </form>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar conexão</DialogTitle>
              <DialogDescription>
                Preferir <code>sb_publishable_*</code> /{' '}
                <code>sb_secret_*</code>. Campos de key vazios mantêm o valor
                já salvo.
              </DialogDescription>
            </DialogHeader>
            <form action={saveAction}>
              <input type="hidden" name="target" value={snapshot.target} />
              <DialogBody className="space-y-4">
                <ConnectionFields
                  prefix="local"
                  title="Local"
                  pair={snapshot.local}
                />
                <ConnectionFields
                  prefix="cloud"
                  title="Cloud"
                  pair={snapshot.cloud}
                />
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={savePending}>
                  {savePending ? 'Salvando…' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Card>

      <Card>
        <CardTitle>Sync cloud → local</CardTitle>
        <CardDescription>
          Copia projects, exclusions, conventions e memberships (por e-mail) do
          remoto para o Docker local. Só disponível com target local.
        </CardDescription>
        <form action={syncAction} className="mt-4">
          <Button
            type="submit"
            disabled={syncPending || snapshot.target !== 'local'}
          >
            {syncPending ? 'Sincronizando…' : 'Sincronizar do remoto'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
