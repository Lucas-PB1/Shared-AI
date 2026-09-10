import { Suspense } from 'react';

import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-sa-muted">Carregando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
