"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Info,
  Pause,
  Play,
  Settings,
  Activity,
  CircleDollarSign,
  Gauge,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RobotScene, TIMELINE_DURATION } from "@/components/RobotScene";

const telemetryData = [
  { label: "-60 min", wear: 0.78, wearCost: 0.0058, energy: 0.005, capital: 0.0062, maintenance: 0.0038 },
  { label: "-58 min", wear: 1.24, wearCost: 0.0072, energy: 0.0054, capital: 0.0064, maintenance: 0.004 },
  { label: "-55 min", wear: 1.12, wearCost: 0.0069, energy: 0.0056, capital: 0.0065, maintenance: 0.0041 },
  { label: "-52 min", wear: 1.43, wearCost: 0.0078, energy: 0.006, capital: 0.0067, maintenance: 0.0042 },
  { label: "-50 min", wear: 1.3, wearCost: 0.0075, energy: 0.0059, capital: 0.0068, maintenance: 0.0042 },
  { label: "-47 min", wear: 1.58, wearCost: 0.0083, energy: 0.0063, capital: 0.0069, maintenance: 0.0044 },
  { label: "-45 min", wear: 1.39, wearCost: 0.0079, energy: 0.006, capital: 0.0069, maintenance: 0.0043 },
  { label: "-42 min", wear: 1.52, wearCost: 0.0082, energy: 0.0062, capital: 0.007, maintenance: 0.0045 },
  { label: "-40 min", wear: 1.46, wearCost: 0.0081, energy: 0.0064, capital: 0.007, maintenance: 0.0044 },
  { label: "-37 min", wear: 1.81, wearCost: 0.0091, energy: 0.0067, capital: 0.0072, maintenance: 0.0047 },
  { label: "-35 min", wear: 1.62, wearCost: 0.0085, energy: 0.0063, capital: 0.0071, maintenance: 0.0045 },
  { label: "-32 min", wear: 2.18, wearCost: 0.0104, energy: 0.0072, capital: 0.0075, maintenance: 0.005 },
  { label: "-30 min", wear: 1.82, wearCost: 0.0092, energy: 0.0068, capital: 0.0074, maintenance: 0.0048 },
  { label: "-27 min", wear: 2.35, wearCost: 0.011, energy: 0.0075, capital: 0.0078, maintenance: 0.0052 },
  { label: "-25 min", wear: 1.96, wearCost: 0.0098, energy: 0.007, capital: 0.0076, maintenance: 0.0049 },
  { label: "-22 min", wear: 2.12, wearCost: 0.0102, energy: 0.0073, capital: 0.0077, maintenance: 0.0051 },
  { label: "-20 min", wear: 1.76, wearCost: 0.009, energy: 0.0069, capital: 0.0075, maintenance: 0.0048 },
  { label: "-17 min", wear: 2.04, wearCost: 0.0101, energy: 0.0072, capital: 0.0077, maintenance: 0.0051 },
  { label: "-15 min", wear: 2.67, wearCost: 0.0122, energy: 0.0082, capital: 0.008, maintenance: 0.0056 },
  { label: "-12 min", wear: 2.22, wearCost: 0.0106, energy: 0.0075, capital: 0.0078, maintenance: 0.0052 },
  { label: "-10 min", wear: 2.48, wearCost: 0.0113, energy: 0.0078, capital: 0.008, maintenance: 0.0054 },
  { label: "-8 min", wear: 1.88, wearCost: 0.0094, energy: 0.007, capital: 0.0076, maintenance: 0.0049 },
  { label: "-5 min", wear: 2.73, wearCost: 0.0128, energy: 0.0084, capital: 0.0082, maintenance: 0.0058 },
  { label: "-3 min", wear: 2.56, wearCost: 0.012, energy: 0.008, capital: 0.0081, maintenance: 0.0055 },
  { label: "Now", wear: 3.12, wearCost: 0.0142, energy: 0.0088, capital: 0.0085, maintenance: 0.0061 },
];

const kpis = [
  { label: "Avg. Wear Factor (1h)", value: "1.72 x", color: "#2563eb", dataKey: "wear", icon: Activity },
  { label: "Cost per Pick", value: "€0.0213", color: "#0ea5e9", dataKey: "wearCost", icon: CircleDollarSign },
  { label: "Daily Operating Cost", value: "€306.72", color: "#6366f1", dataKey: "energy", icon: Gauge },
  { label: "Projected Lifetime", value: "62% of nominal", color: "#64748b", dataKey: "capital", icon: CheckCircle2 },
];

type TelemetryPoint = (typeof telemetryData)[number];
type LiveTelemetryPoint = Omit<TelemetryPoint, "wear" | "wearCost" | "energy" | "capital" | "maintenance"> & {
  wear: number | null;
  wearCost: number | null;
  energy: number | null;
  capital: number | null;
  maintenance: number | null;
};

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
  label?: string;
  unit?: string;
  currency?: boolean;
};

function formatCurrency(value: number) {
  return `€${value.toFixed(4)}`;
}

function ChartTooltip({ active, payload, label, unit = "", currency }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="panel-glass rounded-none px-3 py-2 text-[11px] shadow-lg">
      <div className="mb-1 font-mono font-semibold text-slate-700">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-slate-500">
            <span
              className="h-1.5 w-1.5"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
            <span className="font-mono text-slate-800">
              {currency ? formatCurrency(item.value ?? 0) : `${(item.value ?? 0).toFixed(2)}${unit}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardCard({
  id,
  title,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`panel-glass relative overflow-hidden p-4 ${className}`}>
      <div className="pointer-events-none absolute right-3 top-3 h-10 w-10 border-r border-t border-blue-500/20" />
      <div className="mb-3 flex items-center gap-2 micro-label text-slate-600">
        <span className="h-1.5 w-1.5 bg-blue-600" />
        {title}
        <Info className="h-3 w-3 text-blue-500/50" aria-hidden="true" />
      </div>
      {children}
    </section>
  );
}

function WearFactorChart({
  data,
  activeIndex,
}: {
  data: LiveTelemetryPoint[];
  activeIndex: number;
}) {
  const activeLabel = data[activeIndex]?.label;

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="rgba(31,85,255,0.16)" strokeDasharray="2 6" />
          <XAxis dataKey="label" interval={5} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} tickFormatter={(value) => `${value.toFixed(1)}x`} />
          <Tooltip content={<ChartTooltip unit="x" />} />
          {activeLabel ? <ReferenceLine x={activeLabel} stroke="#1f55ff" strokeOpacity={0.36} strokeDasharray="4 4" /> : null}
          <Line isAnimationActive={false} type="monotone" dataKey="wear" name="Wear Factor" stroke="#1f55ff" strokeWidth={2} dot={{ r: 2, fill: "#f7f5ef", strokeWidth: 1.5 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CostStackChart({
  data,
  activeIndex,
}: {
  data: LiveTelemetryPoint[];
  activeIndex: number;
}) {
  const activeLabel = data[activeIndex]?.label;

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="rgba(31,85,255,0.16)" strokeDasharray="2 6" />
          <XAxis dataKey="label" interval={5} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} tickFormatter={(value) => `€${value.toFixed(3)}`} />
          <Tooltip content={<ChartTooltip currency />} />
          {activeLabel ? <ReferenceLine x={activeLabel} stroke="#1f55ff" strokeOpacity={0.36} strokeDasharray="4 4" /> : null}
          <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="wearCost" name="Wear & Tear" stroke="#1f55ff" fill="#1f55ff" fillOpacity={0.86} />
          <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="energy" name="Energy" stroke="#5678ff" fill="#5678ff" fillOpacity={0.56} />
          <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="capital" name="Capital" stroke="#8ea2ff" fill="#8ea2ff" fillOpacity={0.44} />
          <Area isAnimationActive={false} type="monotone" stackId="1" dataKey="maintenance" name="Maintenance" stroke="#172033" fill="#172033" fillOpacity={0.16} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Sparkline({
  data,
  dataKey,
  color,
}: {
  data: TelemetryPoint[];
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={32} minWidth={0}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TimelineControls({
  time,
  isPlaying,
  onPlayToggle,
  onTimeChange,
}: {
  time: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onTimeChange: (time: number) => void;
}) {
  const progress = `${(time / TIMELINE_DURATION) * 100}%`;

  return (
    <div className="panel-glass absolute bottom-4 left-4 right-4 z-30 bg-white/78 p-2.5 shadow-[0_18px_50px_rgba(23,32,51,0.14)]">
      <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          onClick={onPlayToggle}
          className="inline-grid h-9 w-9 place-items-center border border-blue-500/30 bg-blue-600 text-white shadow-[0_10px_28px_rgba(31,85,255,0.22)] transition hover:bg-blue-700"
          aria-label={isPlaying ? "Live-Stream pausieren" : "Live-Stream abspielen"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
          )}
        </button>
        <div className="hidden min-w-24 sm:block">
          <div className="flex items-center gap-2 micro-label text-slate-600">
            <span className="h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
            Live Stream
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            T-{Math.round(60 - (time / TIMELINE_DURATION) * 60).toString().padStart(2, "0")} min
          </div>
        </div>
        <div className="min-w-0">
          <input
            type="range"
            min="0"
            max={TIMELINE_DURATION}
            step="0.05"
            value={time}
            onChange={(event) => onTimeChange(Number(event.target.value))}
            className="timeline-range"
            style={{ "--timeline-progress": progress } as React.CSSProperties}
            aria-label="Live-Zeitachse scrubben"
          />
          <div className="flex justify-between px-0.5 font-mono text-[9px] text-slate-400">
            <span>-60</span>
            <span>-45</span>
            <span>-30</span>
            <span>-15</span>
            <span>NOW</span>
          </div>
        </div>
        <span className="border border-blue-500/15 bg-white/55 px-2 py-1 font-mono text-[10px] text-slate-500">
          1x
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const currentIndex = useMemo(
    () =>
      Math.min(
        telemetryData.length - 1,
        Math.round((time / TIMELINE_DURATION) * (telemetryData.length - 1)),
      ),
    [time],
  );
  const currentPoint = telemetryData[currentIndex];
  const liveTelemetryData = useMemo(
    () =>
      telemetryData.map((point, index) => ({
        ...point,
        wear: index <= currentIndex ? point.wear : null,
        wearCost: index <= currentIndex ? point.wearCost : null,
        energy: index <= currentIndex ? point.energy : null,
        capital: index <= currentIndex ? point.capital : null,
        maintenance: index <= currentIndex ? point.maintenance : null,
      })),
    [currentIndex],
  );
  const liveSparklineData = useMemo(
    () =>
      telemetryData.slice(
        0,
        Math.min(
          telemetryData.length,
          Math.max(
            2,
            currentIndex + 1,
          ),
        ),
      ),
    [currentIndex],
  );
  const costPerPick =
    currentPoint.wearCost + currentPoint.energy + currentPoint.capital + currentPoint.maintenance;

  return (
    <div className="h-screen w-screen overflow-hidden p-3 font-sans text-[#172033] lg:p-5">
      <main className="technical-blueprint technical-paper relative flex h-full w-full flex-col overflow-hidden border border-blue-500/20 bg-[#f7f5ef]/80 shadow-[0_24px_90px_rgba(23,32,51,0.10)]">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-blue-500/15 bg-[#f7f5ef]/70 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 skew-x-[-18deg] bg-blue-600" />
              <span className="text-xl font-bold tracking-[0.18em] text-[#172033]">UNIFI</span>
            </div>
            <div className="hidden h-8 w-px bg-blue-500/20 sm:block" />
            <p className="hidden text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-slate-500 sm:block">
              Financial Layer
              <br />
              for RaaS
            </p>
          </div>

          <nav className="hidden items-center gap-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 md:flex" aria-label="Hauptnavigation">
            <a className="transition hover:text-blue-600" href="#robot">Live Demo</a>
            <a className="transition hover:text-blue-600" href="#pricing">Pricing</a>
            <a className="transition hover:text-blue-600" href="#risk">Bank View</a>
            <a className="transition hover:text-blue-600" href="#ucs">UCS</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border border-blue-500/20 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]" />
              Live Telemetrie
            </div>
            <button id="ucs" type="button" className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Report Export
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center border border-blue-500/20 bg-white/45 text-slate-600 transition hover:text-blue-600" aria-label="Einstellungen">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="z-10 grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[1.55fr_0.72fr] lg:p-4">
          <section id="robot" className="relative min-h-0 overflow-hidden border border-blue-500/20 bg-white/35">
            <div className="absolute left-4 top-4 z-20 hidden border border-blue-500/20 bg-[#f7f5ef]/80 px-3 py-2 font-mono text-[10px] text-blue-700 lg:block">
              A217:SCARA / RaaS-ASSET-04
            </div>
            <RobotScene
              time={time}
              isPlaying={isPlaying}
              onTimeChange={setTime}
              className="h-full border-0 bg-none bg-transparent shadow-none"
              canvasClassName="h-full w-full"
            />
            <TimelineControls
              time={time}
              isPlaying={isPlaying}
              onPlayToggle={() => setIsPlaying((current) => !current)}
              onTimeChange={(nextTime) => {
                setIsPlaying(false);
                setTime(nextTime);
              }}
            />
          </section>

          <aside className="grid min-h-0 gap-3 lg:grid-rows-2">
            <DashboardCard id="pricing" title="Wear Factor" className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-4xl font-semibold tracking-[-0.06em] text-blue-700">
                    {currentPoint.wear.toFixed(2)} x
                  </div>
                  <div className="micro-label mt-1 text-blue-600">High Stress Window</div>
                </div>
                <Activity className="h-5 w-5 text-blue-500/70" aria-hidden="true" />
              </div>
              <WearFactorChart data={liveTelemetryData} activeIndex={currentIndex} />
            </DashboardCard>

            <DashboardCard title="Cost Stack" className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-4xl font-semibold tracking-[-0.06em] text-blue-700">
                    {formatCurrency(costPerPick)}
                  </div>
                  <div className="micro-label mt-1 text-slate-500">All-in per Pick</div>
                </div>
                <CircleDollarSign className="h-5 w-5 text-blue-500/70" aria-hidden="true" />
              </div>
              <CostStackChart data={liveTelemetryData} activeIndex={currentIndex} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                {[
                  ["Wear", "#1f55ff"],
                  ["Energy", "#5678ff"],
                  ["Capital", "#8ea2ff"],
                  ["Maintenance", "#172033"],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-2 w-2" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </DashboardCard>

          </aside>
        </section>

        <section id="risk" className="z-10 grid shrink-0 gap-0 border-t border-blue-500/15 bg-[#f7f5ef]/70 backdrop-blur-md md:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;

            return (
              <div key={kpi.label} className="border-blue-500/15 px-4 py-3 md:border-r md:last:border-r-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center border border-blue-500/20 bg-white/45 text-blue-600">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">{kpi.label}</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-[#172033]">{kpi.value}</div>
                  </div>
                  <div className="hidden h-8 w-20 sm:block">
                    <Sparkline data={liveSparklineData} dataKey={kpi.dataKey} color={kpi.color} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
