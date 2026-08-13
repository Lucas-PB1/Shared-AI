export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hd-surface"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-hd-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-hd-secondary/10 blur-3xl"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-hd-xl bg-hd-primary font-display text-lg font-bold text-white shadow-hd-accent">
            H
          </span>
          <p className="font-display text-3xl font-semibold tracking-tight text-hd-ink">
            HostDime <span className="text-hd-primary">Review</span>
          </p>
          <p className="mt-2 text-sm text-hd-muted">
            Acesso ao review store da HostDime
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
