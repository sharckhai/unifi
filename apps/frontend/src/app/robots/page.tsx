"use client";

import Link from "next/link";
import { RobotThumbnail } from "@/components/robot-scene/RobotThumbnail";
import { ROBOT_COLOR_THEMES } from "@/components/robot-scene/sceneSetup";
import type { RobotColorTheme } from "@/components/robot-scene/types";

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
};

const robotCards: RobotCard[] = [
  {
    theme: "tesla",
    assetId: "RaaS-ASSET-01",
    callSign: "Atlas Finch",
    fleetClass: "UR5 Prime",
    mission: "E-Commerce Picks",
    persona: "Anna sieht faire Stueckkosten",
    signal: "Wear 0.92x",
    workload: "12 kg Mix",
    accent: "#2563eb",
    status: "running",
  },
  {
    theme: "graphite",
    assetId: "RaaS-ASSET-02",
    callSign: "Night Ledger",
    fleetClass: "Shadow Reserve",
    mission: "Nachtschicht Reserve",
    persona: "Marie prueft Restwert-Puffer",
    signal: "Idle Bond",
    workload: "Standby",
    accent: "#475569",
    status: "idle",
  },
  {
    theme: "ice",
    assetId: "RaaS-ASSET-03",
    callSign: "Frostbyte",
    fleetClass: "Cold Chain Cobot",
    mission: "Kuehlketten-Linie",
    persona: "Jonas verkauft SLA-Stabilitaet",
    signal: "Temp +3C",
    workload: "Pharma",
    accent: "#38bdf8",
    status: "running",
  },
  {
    theme: "copper",
    assetId: "RaaS-ASSET-04",
    callSign: "Midas Clamp",
    fleetClass: "Heavy Payload",
    mission: "Grenzlast-Kommissionierung",
    persona: "Anna zahlt nur echte Last",
    signal: "Wear 1.84x",
    workload: "45 lb Run",
    accent: "#c47a4a",
    status: "running",
  },
  {
    theme: "cobalt",
    assetId: "RaaS-ASSET-05",
    callSign: "Blue Audit",
    fleetClass: "Returns Forensics",
    mission: "Retouren-Zelle",
    persona: "Marie liest Asset-Historie",
    signal: "Trace OK",
    workload: "Mixed SKU",
    accent: "#2563eb",
    status: "idle",
  },
  {
    theme: "mint",
    assetId: "RaaS-ASSET-06",
    callSign: "Peppermint",
    fleetClass: "Light Pick Pool",
    mission: "Kosmetik & Kleinteile",
    persona: "Jonas skaliert Billig-Picks",
    signal: "Wear 0.48x",
    workload: "50 g - 300 g",
    accent: "#34d399",
    status: "running",
  },
  {
    theme: "ember",
    assetId: "RaaS-ASSET-07",
    callSign: "Afterburner",
    fleetClass: "Peak Load Sprinter",
    mission: "Black-Friday Burst",
    persona: "Anna sieht Peak-Preis fair",
    signal: "Heat Watch",
    workload: "Fullspeed",
    accent: "#f97316",
    status: "running",
  },
  {
    theme: "violet",
    assetId: "RaaS-ASSET-08",
    callSign: "Violet Canary",
    fleetClass: "QA Sampling",
    mission: "Randomisierte Pruef-Picks",
    persona: "Marie findet Risiko-Fruehsignale",
    signal: "Drift 0.03",
    workload: "Audit",
    accent: "#8b5cf6",
    status: "idle",
  },
  {
    theme: "aurora",
    assetId: "RaaS-ASSET-09",
    callSign: "Aurora Loop",
    fleetClass: "Green Shift Optimizer",
    mission: "Solarstrom-Zeitfenster",
    persona: "Anna senkt Energieanteil",
    signal: "Grid -18%",
    workload: "Eco Wave",
    accent: "#06b6d4",
    status: "running",
  },
  {
    theme: "nebula",
    assetId: "RaaS-ASSET-10",
    callSign: "Nebula Scout",
    fleetClass: "UCS Drop-in Probe",
    mission: "Fremdroboter-Mapping",
    persona: "Jonas onboardet neue Flotten",
    signal: "Schema 97%",
    workload: "Foreign Top",
    accent: "#d946ef",
    status: "running",
  },
  {
    theme: "wasabi",
    assetId: "RaaS-ASSET-11",
    callSign: "Wasabi Snap",
    fleetClass: "Micro Fulfillment",
    mission: "Innenstadt-Speed-Picks",
    persona: "Anna testet Mini-Hub-OpEx",
    signal: "Cycle 0.8s",
    workload: "Fast Light",
    accent: "#84cc16",
    status: "running",
  },
  {
    theme: "sandstorm",
    assetId: "RaaS-ASSET-12",
    callSign: "Desert Mule",
    fleetClass: "Rugged Yard Bot",
    mission: "Staubige Wareneingaenge",
    persona: "Marie bewertet Outdoor-Risiko",
    signal: "Seal OK",
    workload: "Rough Dock",
    accent: "#d97706",
    status: "idle",
  },
  {
    theme: "abyss",
    assetId: "RaaS-ASSET-13",
    callSign: "Abyss Picker",
    fleetClass: "Dark Warehouse",
    mission: "Lights-out Fulfillment",
    persona: "Jonas verkauft 24/7-Kapazitaet",
    signal: "Night 99%",
    workload: "No-Light",
    accent: "#0284c7",
    status: "running",
  },
  {
    theme: "orchid",
    assetId: "RaaS-ASSET-14",
    callSign: "Orchid Glove",
    fleetClass: "Fragile Goods",
    mission: "Beauty & Glaswaren",
    persona: "Anna reduziert Bruchkosten",
    signal: "Grip Soft",
    workload: "Fragile",
    accent: "#db2777",
    status: "running",
  },
  {
    theme: "racing",
    assetId: "RaaS-ASSET-15",
    callSign: "Redline",
    fleetClass: "Deal-Desk Demo Star",
    mission: "Investor Pitch Mode",
    persona: "Marie sieht Cashflow-Sprint",
    signal: "APR Sim",
    workload: "Showcase",
    accent: "#dc2626",
    status: "running",
  },
  {
    theme: "prism",
    assetId: "RaaS-ASSET-16",
    callSign: "Prism Router",
    fleetClass: "Multi-Tenant Switcher",
    mission: "Drei Kunden, eine Zelle",
    persona: "UNIFI trennt Cashflows",
    signal: "Split Live",
    workload: "Pool",
    accent: "#7c3aed",
    status: "idle",
  },
];

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
          <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="micro-label text-blue-600">Live View Starten</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Waehle einen Roboter aus der UNIFI-Flotte. Jeder Klick oeffnet die Live-Demo mit
                passendem 3D-Theme, Asset-Story und Pay-per-Pick-Perspektive.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <div className="border border-blue-500/15 bg-white/55 px-3 py-2">
                <div className="font-mono text-lg tracking-[-0.05em] text-[#172033]">16</div>
                Bots
              </div>
              <div className="border border-blue-500/15 bg-white/55 px-3 py-2">
                <div className="font-mono text-lg tracking-[-0.05em] text-[#172033]">8</div>
                Neue Themes
              </div>
              <div className="border border-blue-500/15 bg-white/55 px-3 py-2">
                <div className="font-mono text-lg tracking-[-0.05em] text-[#172033]">3</div>
                Personas
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {robotCards.map((robot) => {
              const theme =
                ROBOT_COLOR_THEMES.find((item) => item.id === robot.theme) ??
                ROBOT_COLOR_THEMES[0];
              const isRunning = robot.status === "running";
              const statusLabel = isRunning ? "Running" : "Idle";

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
                    <RobotThumbnail theme={robot.theme} className="h-40 w-full" />
                  </div>
                  <div className="border-t border-blue-500/15 p-4">
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
