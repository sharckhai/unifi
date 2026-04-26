"use client";

import Link from "next/link";
import { RobotThumbnail } from "@/components/robot-scene/RobotThumbnail";
import { ROBOT_COLOR_THEMES } from "@/components/robot-scene/sceneSetup";
import type { JointPose, RobotColorTheme } from "@/components/robot-scene/types";

const SELECTED_THEME_STORAGE_KEY = "unifi:selectedRobotTheme";

type RobotStatus = "running" | "idle";

type RobotCard = {
  theme: RobotColorTheme;
  assetId: string;
  callSign: string;
  fleetClass: string;
  mission: string;
  persona: string;
  signal: string;
  workload: string;
  accent: string;
  status: RobotStatus;
  ageMonths: number;
  generatedRevenueEur: number;
  assetValueEur: number;
};

const thumbnailPoses: JointPose[] = [
  { baseYaw: -18, shoulderPitch: -38, elbowPitch: 78, wrist1Pitch: -42, wrist2Yaw: 0, wrist3Roll: 0 },
  { baseYaw: 34, shoulderPitch: -24, elbowPitch: 52, wrist1Pitch: -68, wrist2Yaw: -24, wrist3Roll: 42 },
  { baseYaw: -54, shoulderPitch: -56, elbowPitch: 96, wrist1Pitch: -28, wrist2Yaw: 32, wrist3Roll: -72 },
  { baseYaw: 62, shoulderPitch: -18, elbowPitch: 42, wrist1Pitch: -82, wrist2Yaw: -38, wrist3Roll: 118 },
  { baseYaw: -82, shoulderPitch: -44, elbowPitch: 118, wrist1Pitch: -54, wrist2Yaw: 48, wrist3Roll: -30 },
  { baseYaw: 12, shoulderPitch: -66, elbowPitch: 104, wrist1Pitch: -20, wrist2Yaw: -10, wrist3Roll: 86 },
  { baseYaw: 88, shoulderPitch: -30, elbowPitch: 68, wrist1Pitch: -74, wrist2Yaw: -58, wrist3Roll: -112 },
  { baseYaw: -36, shoulderPitch: -12, elbowPitch: 44, wrist1Pitch: -92, wrist2Yaw: 20, wrist3Roll: 154 },
  { baseYaw: 48, shoulderPitch: -60, elbowPitch: 112, wrist1Pitch: -34, wrist2Yaw: -42, wrist3Roll: 24 },
  { baseYaw: -66, shoulderPitch: -28, elbowPitch: 58, wrist1Pitch: -76, wrist2Yaw: 54, wrist3Roll: -138 },
  { baseYaw: 24, shoulderPitch: -48, elbowPitch: 88, wrist1Pitch: -48, wrist2Yaw: -18, wrist3Roll: 64 },
  { baseYaw: -96, shoulderPitch: -36, elbowPitch: 74, wrist1Pitch: -64, wrist2Yaw: 68, wrist3Roll: -58 },
  { baseYaw: 72, shoulderPitch: -52, elbowPitch: 102, wrist1Pitch: -38, wrist2Yaw: -52, wrist3Roll: 132 },
  { baseYaw: -8, shoulderPitch: -22, elbowPitch: 56, wrist1Pitch: -84, wrist2Yaw: 8, wrist3Roll: -96 },
  { baseYaw: 104, shoulderPitch: -42, elbowPitch: 92, wrist1Pitch: -52, wrist2Yaw: -74, wrist3Roll: 18 },
  { baseYaw: -44, shoulderPitch: -70, elbowPitch: 120, wrist1Pitch: -24, wrist2Yaw: 34, wrist3Roll: 102 },
];

const robotCards: RobotCard[] = [
  {
    theme: "white",
    assetId: "RaaS-ASSET-01",
    callSign: "Universal Robots UR5e",
    fleetClass: "Collaborative Cobot",
    mission: "E-Commerce Picks",
    persona: "Anna sieht faire Stueckkosten",
    signal: "Wear 0.92x",
    workload: "12 kg Mix",
    accent: "#2563eb",
    status: "running",
    ageMonths: 18,
    generatedRevenueEur: 248000,
    assetValueEur: 118000,
  },
  {
    theme: "graphite",
    assetId: "RaaS-ASSET-02",
    callSign: "FANUC CRX-10iA",
    fleetClass: "Lightweight Cobot",
    mission: "Nachtschicht Reserve",
    persona: "Marie prueft Restwert-Puffer",
    signal: "Idle Bond",
    workload: "Standby",
    accent: "#475569",
    status: "idle",
    ageMonths: 31,
    generatedRevenueEur: 174000,
    assetValueEur: 92000,
  },
  {
    theme: "ice",
    assetId: "RaaS-ASSET-03",
    callSign: "KUKA LBR iiwa 14",
    fleetClass: "Sensitive Arm",
    mission: "Kuehlketten-Linie",
    persona: "Jonas verkauft SLA-Stabilitaet",
    signal: "Temp +3C",
    workload: "Pharma",
    accent: "#38bdf8",
    status: "running",
    ageMonths: 14,
    generatedRevenueEur: 216000,
    assetValueEur: 126000,
  },
  {
    theme: "copper",
    assetId: "RaaS-ASSET-04",
    callSign: "ABB GoFa CRB 15000",
    fleetClass: "Payload Cobot",
    mission: "Grenzlast-Kommissionierung",
    persona: "Anna zahlt nur echte Last",
    signal: "Wear 1.84x",
    workload: "45 lb Run",
    accent: "#c47a4a",
    status: "running",
    ageMonths: 26,
    generatedRevenueEur: 302000,
    assetValueEur: 108000,
  },
  {
    theme: "cobalt",
    assetId: "RaaS-ASSET-05",
    callSign: "Yaskawa HC10DTP",
    fleetClass: "Human-Collab Arm",
    mission: "Retouren-Zelle",
    persona: "Marie liest Asset-Historie",
    signal: "Trace OK",
    workload: "Mixed SKU",
    accent: "#2563eb",
    status: "idle",
    ageMonths: 22,
    generatedRevenueEur: 189000,
    assetValueEur: 101000,
  },
  {
    theme: "mint",
    assetId: "RaaS-ASSET-06",
    callSign: "Omron TM5-900",
    fleetClass: "Vision Cobot",
    mission: "Kosmetik & Kleinteile",
    persona: "Jonas skaliert Billig-Picks",
    signal: "Wear 0.48x",
    workload: "50 g - 300 g",
    accent: "#34d399",
    status: "running",
    ageMonths: 9,
    generatedRevenueEur: 132000,
    assetValueEur: 137000,
  },
  {
    theme: "ember",
    assetId: "RaaS-ASSET-07",
    callSign: "Doosan M1013",
    fleetClass: "High-Reach Cobot",
    mission: "Black-Friday Burst",
    persona: "Anna sieht Peak-Preis fair",
    signal: "Heat Watch",
    workload: "Fullspeed",
    accent: "#f97316",
    status: "running",
    ageMonths: 17,
    generatedRevenueEur: 276000,
    assetValueEur: 121000,
  },
  {
    theme: "violet",
    assetId: "RaaS-ASSET-08",
    callSign: "Franka Research 3",
    fleetClass: "Force-Sensing Arm",
    mission: "Randomisierte Pruef-Picks",
    persona: "Marie findet Risiko-Fruehsignale",
    signal: "Drift 0.03",
    workload: "Audit",
    accent: "#8b5cf6",
    status: "idle",
    ageMonths: 35,
    generatedRevenueEur: 158000,
    assetValueEur: 86000,
  },
  {
    theme: "aurora",
    assetId: "RaaS-ASSET-09",
    callSign: "Techman TM12",
    fleetClass: "AI Vision Cobot",
    mission: "Solarstrom-Zeitfenster",
    persona: "Anna senkt Energieanteil",
    signal: "Grid -18%",
    workload: "Eco Wave",
    accent: "#06b6d4",
    status: "running",
    ageMonths: 12,
    generatedRevenueEur: 204000,
    assetValueEur: 132000,
  },
  {
    theme: "nebula",
    assetId: "RaaS-ASSET-10",
    callSign: "Universal Robots UR10e",
    fleetClass: "UCS Drop-in Arm",
    mission: "Fremdroboter-Mapping",
    persona: "Jonas onboardet neue Flotten",
    signal: "Schema 97%",
    workload: "Foreign Top",
    accent: "#d946ef",
    status: "running",
    ageMonths: 6,
    generatedRevenueEur: 98000,
    assetValueEur: 146000,
  },
  {
    theme: "wasabi",
    assetId: "RaaS-ASSET-11",
    callSign: "Staubli TX2-60",
    fleetClass: "Fast Pick Arm",
    mission: "Innenstadt-Speed-Picks",
    persona: "Anna testet Mini-Hub-OpEx",
    signal: "Cycle 0.8s",
    workload: "Fast Light",
    accent: "#84cc16",
    status: "running",
    ageMonths: 11,
    generatedRevenueEur: 185000,
    assetValueEur: 134000,
  },
  {
    theme: "sandstorm",
    assetId: "RaaS-ASSET-12",
    callSign: "Kawasaki duAro2",
    fleetClass: "Dual-Arm Cobot",
    mission: "Staubige Wareneingaenge",
    persona: "Marie bewertet Outdoor-Risiko",
    signal: "Seal OK",
    workload: "Rough Dock",
    accent: "#d97706",
    status: "idle",
    ageMonths: 29,
    generatedRevenueEur: 167000,
    assetValueEur: 97000,
  },
  {
    theme: "abyss",
    assetId: "RaaS-ASSET-13",
    callSign: "Epson C8XL",
    fleetClass: "6-Axis Pick Arm",
    mission: "Lights-out Fulfillment",
    persona: "Jonas verkauft 24/7-Kapazitaet",
    signal: "Night 99%",
    workload: "No-Light",
    accent: "#0284c7",
    status: "running",
    ageMonths: 20,
    generatedRevenueEur: 241000,
    assetValueEur: 116000,
  },
  {
    theme: "orchid",
    assetId: "RaaS-ASSET-14",
    callSign: "Denso Cobotta Pro",
    fleetClass: "Precision Cobot",
    mission: "Beauty & Glaswaren",
    persona: "Anna reduziert Bruchkosten",
    signal: "Grip Soft",
    workload: "Fragile",
    accent: "#db2777",
    status: "running",
    ageMonths: 15,
    generatedRevenueEur: 193000,
    assetValueEur: 128000,
  },
  {
    theme: "racing",
    assetId: "RaaS-ASSET-15",
    callSign: "Nachi MZ07",
    fleetClass: "Compact 6-Axis Arm",
    mission: "Investor Pitch Mode",
    persona: "Marie sieht Cashflow-Sprint",
    signal: "APR Sim",
    workload: "Showcase",
    accent: "#dc2626",
    status: "running",
    ageMonths: 8,
    generatedRevenueEur: 121000,
    assetValueEur: 141000,
  },
  {
    theme: "prism",
    assetId: "RaaS-ASSET-16",
    callSign: "Mitsubishi MELFA RV-8CRL",
    fleetClass: "Industrial Cobot",
    mission: "Drei Kunden, eine Zelle",
    persona: "UNIFI trennt Cashflows",
    signal: "Split Live",
    workload: "Pool",
    accent: "#7c3aed",
    status: "idle",
    ageMonths: 24,
    generatedRevenueEur: 229000,
    assetValueEur: 112000,
  },
];

const totalGeneratedRevenueEur = robotCards.reduce(
  (sum, robot) => sum + robot.generatedRevenueEur,
  0,
);
const totalAssetValueEur = robotCards.reduce((sum, robot) => sum + robot.assetValueEur, 0);

function formatCompactEur(value: number) {
  if (value >= 1_000_000) {
    return `EUR ${(value / 1_000_000).toFixed(2)}M`;
  }

  return `EUR ${Math.round(value / 1_000)}k`;
}

function formatRobotAge(months: number) {
  if (months < 12) {
    return `${months} Mon.`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return remainingMonths === 0 ? `${years} J.` : `${years} J. ${remainingMonths} M.`;
}

function saveStoredTheme(theme: RobotColorTheme) {
  try {
    window.localStorage.setItem(SELECTED_THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still updates in memory if localStorage fails.
  }
}

export default function RobotsPage() {
  return (
    <div className="min-h-screen p-3 font-sans text-[#172033] lg:p-5">
      <main className="technical-blueprint technical-paper relative min-h-[calc(100vh-1.5rem)] overflow-hidden border border-blue-500/20 bg-[#f7f5ef]/80 shadow-[0_24px_90px_rgba(23,32,51,0.10)] lg:min-h-[calc(100vh-2.5rem)]">
        <header className="relative z-10 flex flex-col gap-4 border-b border-blue-500/15 bg-[#f7f5ef]/70 px-4 py-5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 skew-x-[-18deg] bg-blue-600" />
              <span className="text-xl font-bold tracking-[0.18em] text-[#172033]">UNIFI</span>
            </div>
            <div className="hidden h-8 w-px bg-blue-500/20 sm:block" />
            <div>
              <p className="micro-label text-slate-500">Robot Fleet</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#172033]">
                Roboter auswählen
              </h1>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600" aria-label="Hauptnavigation">
            <Link className="border border-blue-500/20 bg-white/45 px-3 py-2 transition hover:text-blue-600" href="/">
              Live Demo
            </Link>
            <Link className="border border-blue-500/30 bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700" href="/robots">
              Roboter
            </Link>
          </nav>
        </header>

        <section className="relative z-10 p-4 lg:p-6">
          <div className="mb-5">
            <div className="max-w-3xl">
              <p className="micro-label text-blue-600">Live View Starten</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Waehle einen Roboter aus der UNIFI-Flotte. Jeder Klick oeffnet die Live-Demo mit
                passendem 3D-Theme, Asset-Story und Pay-per-Pick-Perspektive.
              </p>
            </div>
          </div>

          <div className="mb-6 grid w-full gap-3 sm:grid-cols-3">
              <div className="border border-blue-500/15 bg-white/70 px-6 py-5 shadow-[0_18px_45px_rgba(23,32,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Fleet Size
                </p>
                <div className="mt-2 font-mono text-4xl font-semibold tracking-[-0.08em] text-[#172033]">
                  {robotCards.length}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Bots online
                </p>
              </div>
              <div className="border border-blue-500/15 bg-white/70 px-6 py-5 shadow-[0_18px_45px_rgba(23,32,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Total Revenue
                </p>
                <div className="mt-2 font-mono text-4xl font-semibold tracking-[-0.08em] text-[#172033]">
                  {formatCompactEur(totalGeneratedRevenueEur)}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Generated cashflow
                </p>
              </div>
              <div className="border border-blue-500/15 bg-white/70 px-6 py-5 shadow-[0_18px_45px_rgba(23,32,51,0.08)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Fleet Value
                </p>
                <div className="mt-2 font-mono text-4xl font-semibold tracking-[-0.08em] text-[#172033]">
                  {formatCompactEur(totalAssetValueEur)}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Residual asset base
                </p>
              </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {robotCards.map((robot, index) => {
              const theme =
                ROBOT_COLOR_THEMES.find((item) => item.id === robot.theme) ??
                ROBOT_COLOR_THEMES[0];
              const isRunning = robot.status === "running";
              const statusLabel = isRunning ? "Running" : "Idle";
              const thumbnailPose = thumbnailPoses[index % thumbnailPoses.length];

              return (
                <Link
                  key={robot.assetId}
                  href={`/?theme=${robot.theme}#robot`}
                  onClick={() => saveStoredTheme(robot.theme)}
                  className="panel-glass group overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-[0_22px_55px_rgba(23,32,51,0.12)]"
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 20% 18%, ${robot.accent}33, transparent 9rem), linear-gradient(135deg, rgba(255,255,255,0.8), ${robot.accent}12)`,
                    }}
                  >
                    <div className="absolute left-3 top-3 z-10 border border-white/65 bg-white/70 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                      {robot.fleetClass}
                    </div>
                    <RobotThumbnail
                      theme={robot.theme}
                      pose={thumbnailPose}
                      className="h-60 w-full sm:h-64 xl:h-56"
                    />
                  </div>
                  <div className="border-t border-blue-500/15 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {robot.assetId}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                          isRunning
                            ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
                            : "border-slate-300/60 bg-white/60 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isRunning
                              ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]"
                              : "bg-slate-400"
                          }`}
                        />
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold tracking-[-0.04em] text-[#172033]">
                          {robot.callSign}
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Theme {theme.label}
                        </p>
                      </div>
                      <div
                        className="h-9 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: robot.accent }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">{robot.mission}</p>
                    <p className="mt-1 min-h-[2.25rem] text-xs leading-5 text-slate-500">
                      {robot.persona}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                      <div className="border border-blue-500/15 bg-white/55 px-2 py-2 text-slate-500">
                        Signal
                        <div className="mt-1 font-mono text-xs normal-case tracking-[-0.02em] text-[#172033]">
                          {robot.signal}
                        </div>
                      </div>
                      <div className="border border-blue-500/15 bg-white/55 px-2 py-2 text-slate-500">
                        Workload
                        <div className="mt-1 font-mono text-xs normal-case tracking-[-0.02em] text-[#172033]">
                          {robot.workload}
                        </div>
                      </div>
                      <div className="border border-blue-500/15 bg-white/55 px-2 py-2 text-slate-500">
                        Alter
                        <div className="mt-1 font-mono text-xs normal-case tracking-[-0.02em] text-[#172033]">
                          {formatRobotAge(robot.ageMonths)}
                        </div>
                      </div>
                      <div className="border border-blue-500/15 bg-white/55 px-2 py-2 text-slate-500">
                        Umsatz
                        <div className="mt-1 font-mono text-xs normal-case tracking-[-0.02em] text-[#172033]">
                          {formatCompactEur(robot.generatedRevenueEur)}
                        </div>
                      </div>
                      <div className="border border-blue-500/15 bg-white/55 px-2 py-2 text-slate-500">
                        Wert
                        <div className="mt-1 font-mono text-xs normal-case tracking-[-0.02em] text-[#172033]">
                          {formatCompactEur(robot.assetValueEur)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                      <span className="transition group-hover:translate-x-1">Live oeffnen</span>
                      <span className="font-mono text-slate-400">/{robot.theme}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
