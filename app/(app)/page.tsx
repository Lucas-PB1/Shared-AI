import { DashboardPanel, getDashboardSnapshot } from '@/features/dashboard';

export default async function HomePage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-6">
      <section className="hd-page-mesh overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas px-5 py-7 shadow-hd-md md:px-8 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hd-primary">
          Desempenho
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-hd-secondary md:text-base">
          Taxa de aceite, volume de runs CI e vereditos — visão geral ou por
          projeto. Só dados remotos (CI) após merge.
        </p>
      </section>

      <DashboardPanel snapshot={snapshot} />
    </div>
  );
}
