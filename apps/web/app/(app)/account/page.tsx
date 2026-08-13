import { getCurrentProfile } from '@/entities/profile';
import { AccountForm } from '@/features/auth/ui/account-form';

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Conta</h1>
        <p className="mt-2 text-hd-muted">Atualize seu perfil no review store.</p>
      </div>
      <AccountForm
        displayName={profile?.display_name ?? null}
        email={profile?.email ?? null}
      />
    </div>
  );
}
