import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/entities/profile';
import { getSettingsSnapshot, SettingsPanel } from '@/features/settings';
import { getConnectionPublicSnapshot } from '@/shared/config/connection';

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    redirect('/');
  }

  const snapshot = await getSettingsSnapshot().catch(() =>
    getConnectionPublicSnapshot(),
  );

  return (
    <div className="space-y-6">
      <section className="hd-page-mesh overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas px-5 py-7 shadow-hd-md md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hd-primary">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Configuração
        </h1>
        <p className="mt-2 max-w-2xl text-hd-secondary">
          Conexões em <code className="text-hd-ink">app_connections</code>,
          target em <code className="text-hd-ink">app_settings</code>. Bootstrap{' '}
          <code className="text-hd-ink">.env</code> só para subir o app.
        </p>
      </section>

      <SettingsPanel snapshot={snapshot} />
    </div>
  );
}
