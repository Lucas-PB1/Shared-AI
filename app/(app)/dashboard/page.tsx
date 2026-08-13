import { redirect } from 'next/navigation';

/** Rota antiga — Dashboard é a home. */
export default function DashboardRedirectPage() {
  redirect('/');
}
