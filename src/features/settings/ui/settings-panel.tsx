'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  saveConnection,
  switchTarget,
  syncFromCloud,
  type SettingsActionState,
} from '@/features/settings/actions';
import { Button } from '@/shared/ui/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const initial: SettingsActionState = {};

type Snapshot = {
  target: 'local' | 'cloud';
  allowEnvWrite: boolean;
  local: { url: string; publishableKeySet: boolean; secretKeySet: boolean };
  cloud: { url: string; publishableKeySet: boolean; secretKeySet: boolean };
};

export function SettingsPanel({
  snapshot,
}: {
  snapshot: Snapshot;
}) {
  const [switchState, switchAction, switchPending] = useActionState(
    switchTarget,
    initial,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveConnection,
    initial,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    async (_prev: SettingsActionState, _formData: FormData) => syncFromCloud(),
    initial,
  );

  useEffect(() => {
    for (const state of [switchState, saveState, syncState]) {
      if (state.error) toast.error(state.error);
      if (state.success) {
        toast.success(
          state.report ? `${state.success} — ${state.report}` : state.success,
        );
      }
    }
  }, [switchState, saveState, syncState]);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Target ativo</CardTitle>
        <CardDescription>
          Agora: <strong>{snapshot.target}</strong>
          {!snapshot.allowEnvWrite
            ? ' — ALLOW_ENV_WRITE não está 1; gravação de .env bloqueada.'
            : null}
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
        <CardTitle>Conexão</CardTitle>
        <CardDescription>
          Preferir <code>sb_publishable_*</code> e <code>sb_secret_*</code> no
          cloud. Local Docker ainda pode usar JWT legado. Secret nunca vai no
          bundle do browser. Campos vazios não sobrescrevem.
        </CardDescription>
        <form action={saveAction} className="mt-5 space-y-5">
          <input type="hidden" name="target" value={snapshot.target} />

          <fieldset className="space-y-3 rounded-hd-xl border border-hd-border p-4">
            <legend className="px-1 text-sm font-semibold text-hd-ink">
              Local
            </legend>
            <div className="space-y-2">
              <Label htmlFor="localUrl">URL</Label>
              <Input
                id="localUrl"
                name="localUrl"
                defaultValue={snapshot.local.url}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localPublishableKey">
                Publishable key{' '}
                {snapshot.local.publishableKeySet ? '(definida)' : '(vazia)'}
              </Label>
              <Input
                id="localPublishableKey"
                name="localPublishableKey"
                type="password"
                placeholder="sb_publishable_…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localSecretKey">
                Secret key{' '}
                {snapshot.local.secretKeySet ? '(definida)' : '(vazia)'}
              </Label>
              <Input
                id="localSecretKey"
                name="localSecretKey"
                type="password"
                placeholder="sb_secret_… ou service_role local"
                autoComplete="off"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-hd-xl border border-hd-border p-4">
            <legend className="px-1 text-sm font-semibold text-hd-ink">
              Cloud
            </legend>
            <div className="space-y-2">
              <Label htmlFor="cloudUrl">URL</Label>
              <Input
                id="cloudUrl"
                name="cloudUrl"
                defaultValue={snapshot.cloud.url}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudPublishableKey">
                Publishable key{' '}
                {snapshot.cloud.publishableKeySet ? '(definida)' : '(vazia)'}
              </Label>
              <Input
                id="cloudPublishableKey"
                name="cloudPublishableKey"
                type="password"
                placeholder="sb_publishable_…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloudSecretKey">
                Secret key{' '}
                {snapshot.cloud.secretKeySet ? '(definida)' : '(vazia)'}
              </Label>
              <Input
                id="cloudSecretKey"
                name="cloudSecretKey"
                type="password"
                placeholder="sb_secret_…"
                autoComplete="off"
              />
            </div>
          </fieldset>

          <Button type="submit" disabled={savePending || !snapshot.allowEnvWrite}>
            {savePending ? 'Salvando…' : 'Salvar conexão'}
          </Button>
        </form>
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
