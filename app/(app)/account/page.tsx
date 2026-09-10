import { getCurrentProfile } from '@/entities/profile';
import { AccountForm } from '@/features/auth/ui/account-form';

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sa-primary">
          Perfil
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Conta
        </h1>
        <p className="mt-1 text-sm text-sa-muted">
          Foto, nome e senha — edite só o que precisar.
        </p>
      </header>

      <AccountForm
        displayName={profile?.display_name ?? null}
        email={profile?.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        createdAt={profile?.created_at ?? null}
      />
    </div>
  );
}
