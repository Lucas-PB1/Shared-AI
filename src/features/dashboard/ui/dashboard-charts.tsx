'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import type { DashboardMetrics, NamedCount, ProjectPoint, WeekPoint } from '../model/types';

const COLORS = {
  primary: '#ff5800',
  ok: '#059669',
  danger: '#dc2626',
  muted: '#94a3b8',
  sky: '#0284c8',
  amber: '#d97706',
};

const VERDICT_COLORS: Record<string, string> = {
  aceito: COLORS.ok,
  rejeitado: COLORS.danger,
  'nao-aplicavel': COLORS.muted,
};

function ChartFrame({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardTitle className="text-base">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
      <div className="mt-4 h-64 w-full min-w-0">{children}</div>
    </Card>
  );
}

export function RunsOverTimeChart({ data }: { data: WeekPoint[] }) {
  if (data.length === 0) {
    return (
      <ChartFrame title="Atividade semanal" description="Runs e vereditos por semana">
        <EmptyChart />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Atividade semanal"
      description="Runs iniciados e decisões por semana"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="runs"
            name="Runs"
            stroke={COLORS.primary}
            fill="url(#runsFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="aceitos"
            name="Aceitos"
            stroke={COLORS.ok}
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="rejeitados"
            name="Rejeitados"
            stroke={COLORS.danger}
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function VerdictPieChart({ data }: { data: NamedCount[] }) {
  if (data.length === 0) {
    return (
      <ChartFrame title="Vereditos" description="Distribuição das decisões">
        <EmptyChart />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Vereditos" description="Distribuição das decisões">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={VERDICT_COLORS[entry.name] ?? COLORS.sky}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ProjectPerformanceChart({
  data,
  mode,
}: {
  data: ProjectPoint[];
  mode: 'all' | 'single';
}) {
  const chartData = data
    .filter((p) => p.runs > 0 || p.decisions > 0)
    .map((p) => ({
      name: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
      runs: p.runs,
      aceitos: p.aceitos,
      rejeitados: p.rejeitados,
      taxa: p.acceptanceRate ?? 0,
    }));

  if (chartData.length === 0) {
    return (
      <ChartFrame
        title={mode === 'all' ? 'Desempenho por projeto' : 'Desempenho do projeto'}
        description="Runs e vereditos"
      >
        <EmptyChart />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title={mode === 'all' ? 'Desempenho por projeto' : 'Desempenho do projeto'}
      description="Comparativo de runs, aceitos e rejeitados"
      className={mode === 'all' ? 'lg:col-span-2' : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={48} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip />
          <Legend />
          <Bar dataKey="runs" name="Runs" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          <Bar dataKey="aceitos" name="Aceitos" fill={COLORS.ok} radius={[4, 4, 0, 0]} />
          <Bar dataKey="rejeitados" name="Rejeitados" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SourceStatusCharts({
  bySource,
  byStatus,
}: {
  bySource: NamedCount[];
  byStatus: NamedCount[];
}) {
  return (
    <>
      <ChartFrame title="Origem dos runs" description="local · ci · agent…">
        {bySource.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySource} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" name="Runs" fill={COLORS.sky} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>
      <ChartFrame title="Status dos runs" description="completed · failed…">
        {byStatus.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" name="Runs" fill={COLORS.amber} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>
    </>
  );
}

export function KpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  const items = [
    { label: 'Runs CI', value: String(metrics.runs) },
    {
      label: 'Taxa de aceite',
      value:
        metrics.acceptanceRate == null
          ? '—'
          : `${metrics.acceptanceRate}%`,
    },
    { label: 'Aceitos', value: String(metrics.aceitos) },
    { label: 'Rejeitados', value: String(metrics.rejeitados) },
    { label: 'Decisões', value: String(metrics.decisions) },
    {
      label: 'N/A',
      value: String(metrics.naoAplicavel),
    },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <li
          key={item.label}
          className="rounded-hd-xl border border-hd-border bg-hd-canvas px-4 py-3 shadow-hd-md"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-hd-muted">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-hd-ink">{item.value}</p>
        </li>
      ))}
    </ul>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-hd-muted">
      Sem dados neste recorte
    </div>
  );
}
