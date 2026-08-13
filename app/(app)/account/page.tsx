import { getCurrentProfile } from '@/entities/profile';
import { AccountForm } from '@/features/auth/ui/account-form';

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <section className="hd-page-mesh overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas px-5 py-7 shadow-hd-md md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hd-primary">
          Perfil
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Conta
        </h1>
        <p className="mt-2 max-w-2xl text-hd-secondary">
          Foto, nome de exibição e senha — tudo neste lugar.
        </p>
      </section>

      <AccountForm
        displayName={profile?.display_name ?? null}
        email={profile?.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={Boolean(profile?.is_admin)}
        createdAt={profile?.created_at ?? null}
      />
    </div>
  );
}
