import { getCurrentProfile } from '@/entities/profile';
import { AccountForm } from '@/features/auth/ui/account-form';
import { Card } from '@/shared/ui/card';

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
        <p className="mt-2 text-hd-secondary">
          Nome de exibição usado no dashboard e nos convites.
        </p>
      </section>
      <Card className="max-w-lg">
        <AccountForm
          displayName={profile?.display_name ?? null}
          email={profile?.email ?? null}
        />
      </Card>
    </div>
  );
}
