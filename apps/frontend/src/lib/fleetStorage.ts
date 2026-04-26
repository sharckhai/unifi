/**
 * Local persistence for robots added to the fleet via the Deal-Desk
 * "Add to Fleet" CTA. Stored under `unifi:fleetRobots` in localStorage.
 *
 * Hackathon-only: no backend, no sync between devices, no deduplication.
 * Reset for a clean demo via:
 *     localStorage.removeItem("unifi:fleetRobots")
 */

import type { Offer } from "@/lib/dealDeskStream";
import { ROBOT_COLOR_THEMES } from "@/components/robot-scene/sceneSetup";
import type { RobotColorTheme } from "@/components/robot-scene/types";

const STORAGE_KEY = "unifi:fleetRobots";

export type FleetRobotEntry = {
  theme: RobotColorTheme;
  assetId: string;
  callSign: string;
  fleetClass: string;
  mission: string;
  persona: string;
  signal: string;
  workload: string;
  accent: string;
  status: "running" | "idle";
  ageMonths: number;
  generatedRevenueEur: number;
  assetValueEur: number;
  customer: string;
  addedAt: string;
};

// Mirrors `cost_new_eur` from `apps/backend/src/unifi/deal_desk/catalog.py`.
// If the backend catalog changes, update these too.
const ROBOT_COST_NEW_EUR: Record<string, number> = {
  UR5: 35_000,
  SCARA: 22_000,
};

const ROBOT_CALL_SIGN: Record<string, string> = {
  UR5: "Universal Robots UR5e",
  SCARA: "Generic SCARA-S2",
};

const ROBOT_FLEET_CLASS: Record<string, string> = {
  UR5: "Collaborative Cobot",
  SCARA: "SCARA Pick Arm",
};

const STATIC_ROBOT_COUNT = 14;

export function loadFleetRobots(): FleetRobotEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FleetRobotEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendFleetRobot(entry: FleetRobotEntry): void {
  if (typeof window === "undefined") return;
  const current = loadFleetRobots();
  current.push(entry);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // localStorage unavailable — silently skip; the demo simply forgets
    // the new robot on the next page load.
  }
}

export function buildFleetEntryFromOffer(offer: Offer): FleetRobotEntry {
  const existing = loadFleetRobots();
  const themeIndex = existing.length % ROBOT_COLOR_THEMES.length;
  const theme = ROBOT_COLOR_THEMES[themeIndex];

  const robotKey = offer.header.robot_chosen.toUpperCase().includes("SCARA")
    ? "SCARA"
    : "UR5";
  const costNew = ROBOT_COST_NEW_EUR[robotKey] ?? 35_000;
  const callSign = ROBOT_CALL_SIGN[robotKey] ?? offer.header.robot_chosen;
  const fleetClass = ROBOT_FLEET_CLASS[robotKey] ?? "Cobot";

  const fleetSize = offer.header.fleet_size;
  const unit = fleetSize > 1 ? "units" : "unit";
  const workload = `${fleetSize} ${unit} · €${offer.pricing.eur_per_pick_median.toFixed(4)}/pick`;

  return {
    theme: theme.id,
    assetId: `RaaS-ASSET-${STATIC_ROBOT_COUNT + 1 + existing.length}`,
    callSign,
    fleetClass,
    mission: `${offer.header.customer_name} · Pay-per-Pick`,
    persona: offer.header.customer_name,
    signal: "Just onboarded",
    workload,
    accent: "#1f55ff",
    status: "running",
    ageMonths: 0,
    generatedRevenueEur: 0,
    assetValueEur: costNew * fleetSize,
    customer: offer.header.customer_name,
    addedAt: new Date().toISOString(),
  };
}
