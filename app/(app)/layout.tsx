import { getCurrentProfile } from '@/entities/profile';
import { AppShell } from '@/widgets/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <AppShell
      displayName={profile?.display_name}
      email={profile?.email}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </AppShell>
  );
}
