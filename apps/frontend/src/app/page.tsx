"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Info,
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
import { RobotScene } from "@/components/RobotScene";
import { ROBOT_COLOR_THEMES } from "@/components/robot-scene/sceneSetup";
import type { SortedCubeEvent } from "@/components/RobotScene";
import type { PickCostEffectPayload, RobotColorTheme } from "@/components/robot-scene/types";

const telemetryData = [
  { label: "Pick 01", wear: 0.78, wearCost: 0.0058, energy: 0.005, capital: 0.0062, maintenance: 0.0038 },
  { label: "Pick 02", wear: 1.24, wearCost: 0.0072, energy: 0.0054, capital: 0.0064, maintenance: 0.004 },
  { label: "Pick 03", wear: 1.12, wearCost: 0.0069, energy: 0.0056, capital: 0.0065, maintenance: 0.0041 },
  { label: "Pick 04", wear: 1.43, wearCost: 0.0078, energy: 0.006, capital: 0.0067, maintenance: 0.0042 },
  { label: "Pick 05", wear: 1.3, wearCost: 0.0075, energy: 0.0059, capital: 0.0068, maintenance: 0.0042 },
  { label: "Pick 06", wear: 1.58, wearCost: 0.0083, energy: 0.0063, capital: 0.0069, maintenance: 0.0044 },
  { label: "Pick 07", wear: 1.39, wearCost: 0.0079, energy: 0.006, capital: 0.0069, maintenance: 0.0043 },
  { label: "Pick 08", wear: 1.52, wearCost: 0.0082, energy: 0.0062, capital: 0.007, maintenance: 0.0045 },
  { label: "Pick 09", wear: 1.46, wearCost: 0.0081, energy: 0.0064, capital: 0.007, maintenance: 0.0044 },
  { label: "Pick 10", wear: 1.81, wearCost: 0.0091, energy: 0.0067, capital: 0.0072, maintenance: 0.0047 },
  { label: "Pick 11", wear: 1.62, wearCost: 0.0085, energy: 0.0063, capital: 0.0071, maintenance: 0.0045 },
  { label: "Pick 12", wear: 2.18, wearCost: 0.0104, energy: 0.0072, capital: 0.0075, maintenance: 0.005 },
  { label: "Pick 13", wear: 1.82, wearCost: 0.0092, energy: 0.0068, capital: 0.0074, maintenance: 0.0048 },
  { label: "Pick 14", wear: 2.35, wearCost: 0.011, energy: 0.0075, capital: 0.0078, maintenance: 0.0052 },
  { label: "Pick 15", wear: 1.96, wearCost: 0.0098, energy: 0.007, capital: 0.0076, maintenance: 0.0049 },
  { label: "Pick 16", wear: 2.12, wearCost: 0.0102, energy: 0.0073, capital: 0.0077, maintenance: 0.0051 },
  { label: "Pick 17", wear: 1.76, wearCost: 0.009, energy: 0.0069, capital: 0.0075, maintenance: 0.0048 },
  { label: "Pick 18", wear: 2.04, wearCost: 0.0101, energy: 0.0072, capital: 0.0077, maintenance: 0.0051 },
  { label: "Pick 19", wear: 2.67, wearCost: 0.0122, energy: 0.0082, capital: 0.008, maintenance: 0.0056 },
  { label: "Pick 20", wear: 2.22, wearCost: 0.0106, energy: 0.0075, capital: 0.0078, maintenance: 0.0052 },
  { label: "Pick 21", wear: 2.48, wearCost: 0.0113, energy: 0.0078, capital: 0.008, maintenance: 0.0054 },
  { label: "Pick 22", wear: 1.88, wearCost: 0.0094, energy: 0.007, capital: 0.0076, maintenance: 0.0049 },
  { label: "Pick 23", wear: 2.73, wearCost: 0.0128, energy: 0.0084, capital: 0.0082, maintenance: 0.0058 },
  { label: "Pick 24", wear: 2.56, wearCost: 0.012, energy: 0.008, capital: 0.0081, maintenance: 0.0055 },
  { label: "Pick 25", wear: 3.12, wearCost: 0.0142, energy: 0.0088, capital: 0.0085, maintenance: 0.0061 },
];

const kpis = [
  { label: "Wear Factor Live", color: "#2563eb", dataKey: "wear", icon: Activity },
  { label: "Cost per Pick", color: "#0ea5e9", dataKey: "wearCost", icon: CircleDollarSign },
  { label: "Daily Revenue Projection", color: "#6366f1", dataKey: "dailyRevenue", icon: Gauge },
  { label: "Residual Robot Value", color: "#64748b", dataKey: "robotValue", icon: CheckCircle2 },
];

const SELECTED_THEME_STORAGE_KEY = "unifi:selectedRobotTheme";
const UNIFI_API_BASE_URL =
  process.env.NEXT_PUBLIC_UNIFI_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const LIVE_CHART_WINDOW_SIZE = telemetryData.length;
const DAILY_PICK_PROJECTION = 14400;
const PAY_PER_PICK_REVENUE_MULTIPLIER = 1.15 * 1.25;

function readInitialRobotTheme(): RobotColorTheme {
  if (typeof window === "undefined") {
    return ROBOT_COLOR_THEMES[0].id;
  }

  const queryTheme = new URLSearchParams(window.location.search).get("theme");

  if (ROBOT_COLOR_THEMES.some((theme) => theme.id === queryTheme)) {
    return queryTheme as RobotColorTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(SELECTED_THEME_STORAGE_KEY);

    if (ROBOT_COLOR_THEMES.some((theme) => theme.id === storedTheme)) {
      return storedTheme as RobotColorTheme;
    }
  } catch {
    // Keep the demo usable even when localStorage is unavailable.
  }

  return ROBOT_COLOR_THEMES[0].id;
}

type TelemetryPoint = (typeof telemetryData)[number];
type LiveTelemetryPoint = Omit<TelemetryPoint, "wear" | "wearCost" | "energy" | "capital" | "maintenance"> & {
  wear: number | null;
  wearCost: number | null;
  energy: number | null;
  capital: number | null;
  maintenance: number | null;
  robotValue: number | null;
};

type ApiCostBreakdown = {
  energy_eur: number;
  wear_eur: number;
  capital_eur: number;
  maintenance_eur: number;
  total_eur: number;
  wear_rate_multiplier: number;
};

type ApiSimulatePickResponse = {
  wear_rate_multiplier: number;
  cost: ApiCostBreakdown;
  live_residual: {
    residual_value_eur: number;
  };
};

type LiveWearCostResponse = {
  pickNumber: number;
  cubeId: number;
  kind: SortedCubeEvent["kind"];
  weightKg: number;
  sortDurationSeconds: number;
  wear: number;
  wearCost: number;
  energy: number;
  capital: number;
  maintenance: number;
  robotValue: number;
};

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
  label?: string;
  unit?: string;
  currency?: boolean;
};

function formatNumber(value: number, fractionDigits: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatCurrency(value: number, fractionDigits = 4) {
  return `${formatNumber(value, fractionDigits)} €`;
}

function formatWholeCurrency(value: number) {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(value)} €`;
}

function calculateAllInCost(
  point: Pick<LiveTelemetryPoint, "wearCost" | "energy" | "capital" | "maintenance">,
) {
  return (point.wearCost ?? 0) + (point.energy ?? 0) + (point.capital ?? 0) + (point.maintenance ?? 0);
}

function calculatePayPerPickRevenue(
  point: Pick<LiveTelemetryPoint, "wearCost" | "energy" | "capital" | "maintenance">,
) {
  return calculateAllInCost(point) * PAY_PER_PICK_REVENUE_MULTIPLIER;
}

function useAnimatedNumber(targetValue: number, durationMs = 520) {
  const [animatedValue, setAnimatedValue] = useState(targetValue);
  const animatedValueRef = useRef(targetValue);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frameId = requestAnimationFrame(() => {
        animatedValueRef.current = targetValue;
        setAnimatedValue(targetValue);
      });

      return () => cancelAnimationFrame(frameId);
    }

    const startValue = animatedValueRef.current;
    const delta = targetValue - startValue;

    if (Math.abs(delta) < 0.000001) {
      return undefined;
    }

    const startedAt = performance.now();
    let frameId = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = startValue + delta * easedProgress;

      animatedValueRef.current = nextValue;
      setAnimatedValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      animatedValueRef.current = targetValue;
      setAnimatedValue(targetValue);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [durationMs, targetValue]);

  return animatedValue;
}

function createEmptyTelemetryPoint(point: TelemetryPoint): LiveTelemetryPoint {
  return {
    ...point,
    wear: null,
    wearCost: null,
    energy: null,
    capital: null,
    maintenance: null,
    robotValue: null,
  };
}

function formatPickLabel(pickNumber: number) {
  return `Pick ${pickNumber.toString().padStart(2, "0")}`;
}

async function postSimulatedPick(event: SortedCubeEvent): Promise<LiveWearCostResponse> {
  const response = await fetch(`${UNIFI_API_BASE_URL}/simulate/pick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      component_weight_kg: event.weightKg,
      pick_duration_s: event.sortDurationSeconds,
      seed: event.id,
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;

    try {
      const errorBody = (await response.json()) as { detail?: string };
      detail = errorBody.detail ?? detail;
    } catch {
      // Keep the HTTP status text if the backend did not return JSON.
    }

    throw new Error(`FastAPI ${response.status}: ${detail}`);
  }

  const body = (await response.json()) as ApiSimulatePickResponse;

  return {
    pickNumber: event.totalSorted,
    cubeId: event.id,
    kind: event.kind,
    weightKg: event.weightKg,
    sortDurationSeconds: event.sortDurationSeconds,
    wear: body.wear_rate_multiplier,
    wearCost: body.cost.wear_eur,
    energy: body.cost.energy_eur,
    capital: body.cost.capital_eur,
    maintenance: body.cost.maintenance_eur,
    robotValue: body.live_residual.residual_value_eur,
  };
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
              {currency ? formatCurrency(item.value ?? 0) : `${formatNumber(item.value ?? 0, 2)}${unit}`}
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
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-slate-700">
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
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} tickFormatter={(value) => `${formatNumber(value, 1)}x`} />
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
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#687385" }} tickFormatter={(value) => `${formatNumber(value, 3)} €`} />
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
  data: Array<LiveTelemetryPoint & { dailyRevenue?: number }>;
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

export default function Home() {
  const [sortedPickCount, setSortedPickCount] = useState(0);
  const [selectedRobotTheme] = useState<RobotColorTheme>(() => readInitialRobotTheme());
  const [liveTelemetryData, setLiveTelemetryData] = useState<LiveTelemetryPoint[]>([]);
  const [lastRequest, setLastRequest] = useState<SortedCubeEvent | null>(null);
  const [lastApiResult, setLastApiResult] = useState<LiveWearCostResponse | null>(null);
  const [pickCostEffect, setPickCostEffect] = useState<PickCostEffectPayload | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [initialRobotValue, setInitialRobotValue] = useState<number | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${UNIFI_API_BASE_URL}/residual/live`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ residual: { residual_value_eur: number } }>)
      .then((body) => setInitialRobotValue(body.residual.residual_value_eur))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const handleCubeSorted = useCallback((event: SortedCubeEvent) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setSortedPickCount(event.totalSorted);
    setLastRequest(event);
    setApiError(null);

    void postSimulatedPick(event)
      .then((response) => {
        setLiveTelemetryData((currentData) => {
          const templatePoint = telemetryData[(response.pickNumber - 1) % telemetryData.length];

          return [
            ...currentData,
            {
              ...templatePoint,
              label: formatPickLabel(response.pickNumber),
              wear: response.wear,
              wearCost: response.wearCost,
              energy: response.energy,
              capital: response.capital,
              maintenance: response.maintenance,
              robotValue: response.robotValue,
            },
          ];
        });

        if (latestRequestIdRef.current === requestId) {
          setLastApiResult(response);
          setPickCostEffect({
            cubeId: response.cubeId,
            kind: response.kind,
            totalCostEur: calculateAllInCost(response),
          });
        }
      })
      .catch((error: unknown) => {
        if (latestRequestIdRef.current === requestId) {
          setApiError(error instanceof Error ? error.message : "FastAPI request failed.");
        }
      });
  }, []);
  const visibleTelemetryData = useMemo(
    () =>
      liveTelemetryData.length > 0
        ? liveTelemetryData.slice(-LIVE_CHART_WINDOW_SIZE)
        : telemetryData.map(createEmptyTelemetryPoint),
    [liveTelemetryData],
  );
  const activeChartIndex = useMemo(
    () => (liveTelemetryData.length > 0 ? visibleTelemetryData.length - 1 : 0),
    [liveTelemetryData.length, visibleTelemetryData.length],
  );
  const liveSparklineData = useMemo(() => {
    const accumulated = liveTelemetryData.reduce<{
      runningRevenue: number;
      points: Array<LiveTelemetryPoint & { dailyRevenue: number }>;
    }>(
      (current, point, index) => {
        const runningRevenue =
          current.runningRevenue + calculatePayPerPickRevenue(point);

        return {
          runningRevenue,
          points: [
            ...current.points,
            {
              ...point,
              dailyRevenue: (runningRevenue / (index + 1)) * DAILY_PICK_PROJECTION,
            },
          ],
        };
      },
      { runningRevenue: 0, points: [] },
    );

    return accumulated.points.slice(-LIVE_CHART_WINDOW_SIZE);
  }, [liveTelemetryData]);
  const costPerPick = lastApiResult ? calculateAllInCost(lastApiResult) : 0;
  const totalRevenue = liveTelemetryData.reduce(
    (total, point) => total + calculatePayPerPickRevenue(point),
    0,
  );
  const projectedDailyRevenue =
    liveTelemetryData.length > 0 ? (totalRevenue / liveTelemetryData.length) * DAILY_PICK_PROJECTION : 0;
  const animatedCostPerPick = useAnimatedNumber(costPerPick);
  const animatedTotalRevenue = useAnimatedNumber(totalRevenue);
  const displayedWearFactor = lastApiResult?.wear ?? null;
  const animatedWearFactor = useAnimatedNumber(displayedWearFactor ?? 0);
  const lastPickNumber = lastRequest?.totalSorted ?? sortedPickCount;
  const lastWeightLabel = lastRequest ? `${formatNumber(lastRequest.weightKg, 0)} kg` : "-";
  const lastDurationLabel = lastRequest ? `${formatNumber(lastRequest.sortDurationSeconds, 2)} s` : "-";

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

          <div className="hidden flex-1 md:block" />

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border border-blue-500/20 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]" />
              Live Telemetry
            </div>
            <Link href="/robots" className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50">
              Robots
            </Link>
            <Link href="/deal-desk" className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50">
              Deal Desk
            </Link>
            <button id="ucs" type="button" className="inline-flex items-center gap-2 border border-blue-500/30 bg-white/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition hover:bg-blue-50">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Report Export
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center border border-blue-500/20 bg-white/45 text-slate-600 transition hover:text-blue-600" aria-label="Settings">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="z-10 grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[1.55fr_0.72fr] lg:p-4">
          <section id="robot" className="relative min-h-0 overflow-hidden border border-blue-500/20 bg-white/35">
            <RobotScene
              onCubeSorted={handleCubeSorted}
              pickCostEffect={pickCostEffect}
              robotTheme={selectedRobotTheme}
              className="h-full border-0 bg-none bg-transparent shadow-none"
              canvasClassName="h-full w-full"
            />
          </section>

          <aside className="grid min-h-0 gap-3 lg:grid-rows-2">
            <DashboardCard title="Revenue Stack" className="flex min-h-0 flex-col">
              <div className="mb-3 grid grid-cols-2 items-end gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-4xl font-semibold tracking-[-0.06em] text-blue-700">
                    {formatCurrency(animatedCostPerPick)}
                  </div>
                  <div className="micro-label mt-1 text-slate-500">
                    All-in per Pick
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-4xl font-semibold tracking-[-0.06em] text-emerald-700">
                    {formatCurrency(animatedTotalRevenue)}
                  </div>
                  <div className="micro-label mt-1 text-slate-500">
                    Total Revenue
                  </div>
                </div>
              </div>
              <CostStackChart data={visibleTelemetryData} activeIndex={activeChartIndex} />
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

            <DashboardCard id="pricing" title="Wear Factor" className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="font-mono text-4xl font-semibold tracking-[-0.06em] text-blue-700">
                    {`${formatNumber(animatedWearFactor, 2)} x`}
                  </div>
                  <div className="micro-label mt-1 text-blue-600">
                    Pick #{Math.max(1, lastPickNumber)}
                  </div>
                  {apiError ? (
                    <div className="mt-2 max-w-[260px] text-[10px] font-semibold text-red-600">
                      {apiError}
                    </div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-600">
                    <div className="border border-blue-500/15 bg-white/45 px-2 py-1">
                      <span className="mr-1 text-slate-400">kg</span>
                      {lastWeightLabel}
                    </div>
                    <div className="border border-blue-500/15 bg-white/45 px-2 py-1">
                      <span className="mr-1 text-slate-400">time</span>
                      {lastDurationLabel}
                    </div>
                  </div>
                </div>
                <Activity className="h-5 w-5 text-blue-500/70" aria-hidden="true" />
              </div>
              <WearFactorChart data={visibleTelemetryData} activeIndex={activeChartIndex} />
            </DashboardCard>

          </aside>
        </section>

        <section id="risk" className="z-10 grid shrink-0 gap-0 border-t border-blue-500/15 bg-[#f7f5ef]/70 backdrop-blur-md md:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const value =
              kpi.dataKey === "wear"
                ? displayedWearFactor === null
                  ? `${formatNumber(0, 2)} x`
                  : `${formatNumber(displayedWearFactor, 2)} x`
                : kpi.dataKey === "wearCost"
                  ? formatCurrency(costPerPick)
                  : kpi.dataKey === "dailyRevenue"
                    ? formatCurrency(projectedDailyRevenue, 2)
                    : formatWholeCurrency(lastApiResult?.robotValue ?? initialRobotValue ?? 0);

            return (
              <div key={kpi.label} className="border-blue-500/15 px-4 py-3 md:border-r md:last:border-r-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center border border-blue-500/20 bg-white/45 text-blue-600">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">{kpi.label}</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-[#172033]">{value}</div>
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
