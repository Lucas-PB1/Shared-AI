export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--hd-primary-soft),_var(--hd-surface)_55%)] px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center font-display text-2xl font-semibold text-hd-ink">
          HostDime <span className="text-hd-primary">Review</span>
        </p>
        {children}
      </div>
    </div>
  );
}
