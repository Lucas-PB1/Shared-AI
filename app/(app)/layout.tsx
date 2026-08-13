import { getCurrentProfile } from '@/entities/profile';
import { getTarget } from '@/shared/config/connection';
import { AppShell } from '@/widgets/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  const target = await getTarget();

  return (
    <AppShell
      displayName={profile?.display_name}
      email={profile?.email}
      avatarUrl={profile?.avatar_url}
      isAdmin={Boolean(profile?.is_admin)}
      target={target}
    >
      {children}
    </AppShell>
  );
}
