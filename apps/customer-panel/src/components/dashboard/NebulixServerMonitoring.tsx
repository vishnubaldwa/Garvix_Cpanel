import * as React from 'react';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Server,
} from 'lucide-react';
import { CountUp } from '@garvix/ui-components';

const BANDWIDTH_SERIES_7D = [
  { day: 'Mon', inboundGb: 18, outboundGb: 36, totalGb: 54 },
  { day: 'Tue', inboundGb: 22, outboundGb: 41, totalGb: 63 },
  { day: 'Wed', inboundGb: 16, outboundGb: 32, totalGb: 48 },
  { day: 'Thu', inboundGb: 25, outboundGb: 49, totalGb: 74 },
  { day: 'Fri', inboundGb: 21, outboundGb: 45, totalGb: 66 },
  { day: 'Sat', inboundGb: 19, outboundGb: 38, totalGb: 57 },
  { day: 'Sun', inboundGb: 17, outboundGb: 33, totalGb: 50 },
];

const BANDWIDTH_SERIES_14D = [
  { day: 'D1', inboundGb: 15, outboundGb: 30, totalGb: 45 },
  { day: 'D3', inboundGb: 20, outboundGb: 39, totalGb: 59 },
  { day: 'D5', inboundGb: 18, outboundGb: 35, totalGb: 53 },
  { day: 'D7', inboundGb: 24, outboundGb: 47, totalGb: 71 },
  { day: 'D9', inboundGb: 22, outboundGb: 42, totalGb: 64 },
  { day: 'D11', inboundGb: 26, outboundGb: 51, totalGb: 77 },
  { day: 'D14', inboundGb: 19, outboundGb: 38, totalGb: 57 },
];

const STORAGE_SEGMENTS = [
  { label: 'Websites & App Code', sizeGb: 8.1, color: 'bg-violet-600', pct: 57 },
  { label: 'PostgreSQL 16 & MariaDB', sizeGb: 3.4, color: 'bg-indigo-500', pct: 24 },
  { label: 'Mailboxes (Dovecot)', sizeGb: 1.9, color: 'bg-blue-500', pct: 13 },
  { label: 'Restic Snapshots', sizeGb: 0.8, color: 'bg-sky-400', pct: 6 },
];

const HEALTH_SERVICES = [
  { name: 'Nginx HTTP/3 Reverse Proxy', detail: 'v1.26 · 0ms config reload', status: 'Healthy' },
  { name: 'PHP-FPM 8.3 Isolated Pool', detail: 'UID 1004 (`garvixprod.sock`)', status: 'Healthy' },
  { name: 'PostgreSQL 16 Workload Node', detail: 'Port 5432 · Tenant Isolated', status: 'Healthy' },
  { name: 'MariaDB 10.11 Workload Node', detail: 'Port 3306 · InnoDB Pool', status: 'Healthy' },
  { name: 'Postfix + Dovecot + Rspamd', detail: '13/13 Preflight Checks Passed', status: 'Healthy' },
  { name: 'Garvix Go Agent Daemon', detail: 'UDS SO_PEERCRED Enforcing', status: 'Healthy' },
];

export const NebulixServerMonitoring: React.FC = () => {
  const [range, setRange] = React.useState<'7D' | '14D'>('7D');
  const [hoveredBarIndex, setHoveredBarIndex] = React.useState<number | null>(3);

  const series = range === '7D' ? BANDWIDTH_SERIES_7D : BANDWIDTH_SERIES_14D;
  const maxTotal = Math.max(...series.map((d) => d.totalGb), 80);

  return (
    <section aria-label="Server Monitoring and Health" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Server Monitoring &amp; Telemetry
          </h2>
          <p className="text-xs text-slate-500">
            AlmaLinux 10.0 Node (`almalinux10-mum-prod01.garvix.in`) · systemd cgroup v2 slice
          </p>
        </div>

        {/* Explicit Mock Data Disclosure */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          <span>MOCK / PLACEHOLDER TELEMETRY (`isMockData: true`)</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left 5 Columns: CPU, RAM & Storage Breakdown */}
        <div className="min-w-0 space-y-5 lg:col-span-5">
          {/* CPU & RAM Utilization Card */}
          <div className="rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">
                CPU &amp; Memory Utilization
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Sample Readings
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* CPU Gauge */}
              <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-b from-[#F8F7FF] to-white p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-violet-600" />
                    CPU Load
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">4 vCPU</span>
                </div>
                <div className="mt-3 font-display text-2xl font-extrabold text-slate-900">
                  <CountUp to={24} suffix="%" />
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-700"
                    style={{ width: '24%' }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Load Avg: 0.42 · 0.38 · 0.31</p>
              </div>

              {/* RAM Gauge */}
              <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-b from-[#F5F8FF] to-white p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <MemoryStick className="h-4 w-4 text-blue-600" />
                    RAM Usage
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">16 GB</span>
                </div>
                <div className="mt-3 font-display text-2xl font-extrabold text-slate-900">
                  <CountUp to={33.8} decimals={1} suffix="%" />
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-700"
                    style={{ width: '33.8%' }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">5.4 GB / 16 GB DDR5 ECC</p>
              </div>
            </div>

            {/* Segmented Storage Allocation */}
            <div className="mt-5 border-t border-indigo-50 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <HardDrive className="h-4 w-4 text-indigo-600" />
                  NVMe Storage Allocation
                </span>
                <span className="font-mono font-bold text-indigo-700">14.2 GB / 50.0 GB</span>
              </div>

              {/* Multi-segment bar */}
              <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5">
                {STORAGE_SEGMENTS.map((seg) => (
                  <div
                    key={seg.label}
                    className={`h-full first:rounded-l-full last:rounded-r-full ${seg.color}`}
                    style={{ width: `${seg.pct}%` }}
                    title={`${seg.label}: ${seg.sizeGb} GB`}
                  />
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {STORAGE_SEGMENTS.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${seg.color}`} />
                      <span className="truncate">{seg.label}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{seg.sizeGb}G</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Animated Bandwidth Chart + Server Health Indicators */}
        <div className="min-w-0 space-y-5 lg:col-span-7">
          {/* Bandwidth Chart Card */}
          <div className="rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Bandwidth Traffic Analytics (Sample Series)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inbound &amp; Outbound HTTP/3 + Mail Transfer (GB / Day)
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-xl border border-indigo-100 bg-[#F7F6FD] p-1">
                {(['7D', '14D'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      range === r
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-indigo-900'
                    }`}
                  >
                    {r === '7D' ? 'Last 7 Days' : 'Last 14 Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Animated Bar Chart */}
            <div className="mt-5 grid grid-cols-7 items-end gap-3 pt-4 h-44 px-2 border-b border-indigo-100/80">
              {series.map((point, idx) => {
                const heightPct = Math.round((point.totalGb / maxTotal) * 100);
                const isHovered = hoveredBarIndex === idx;
                return (
                  <div
                    key={point.day}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    className="group flex h-full flex-col items-center justify-end cursor-pointer"
                  >
                    <div
                      className={`mb-1.5 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold transition-all ${
                        isHovered
                          ? 'bg-slate-900 text-white shadow-sm scale-105'
                          : 'bg-indigo-50 text-indigo-700 opacity-85'
                      }`}
                    >
                      {point.totalGb}G
                    </div>
                    <div className="relative flex w-full max-w-[38px] items-end justify-center h-28 rounded-t-xl bg-indigo-50/70 overflow-hidden">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-500 animate-nebulix-bar ${
                          isHovered
                            ? 'bg-gradient-to-t from-violet-600 via-indigo-500 to-blue-500 shadow-[0_0_20px_rgba(99,102,241,0.45)]'
                            : 'bg-gradient-to-t from-indigo-500/85 to-blue-400/85'
                        }`}
                      />
                    </div>
                    <span className="mt-2 pb-2 text-[11px] font-semibold text-slate-600">
                      {point.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Server Health Indicators Strip */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Server className="h-3.5 w-3.5 text-indigo-600" />
                  Managed Service Health Indicators
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  All 6 Services Operational
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {HEALTH_SERVICES.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between rounded-xl border border-indigo-100/70 bg-[#FAF9FE] px-3 py-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-bold text-slate-800">{svc.name}</div>
                      <div className="truncate text-[10px] text-slate-500">{svc.detail}</div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {svc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
