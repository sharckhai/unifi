"use client";

import Link from "next/link";
import { useState } from "react";
import { RobotThumbnail } from "@/components/robot-scene/RobotThumbnail";
import { ROBOT_COLOR_THEMES } from "@/components/robot-scene/sceneSetup";
import type { RobotColorTheme } from "@/components/robot-scene/types";

const SELECTED_THEME_STORAGE_KEY = "unifi:selectedRobotTheme";

function readStoredTheme(): RobotColorTheme {
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

function saveStoredTheme(theme: RobotColorTheme) {
  try {
    window.localStorage.setItem(SELECTED_THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still updates in memory if localStorage fails.
  }
}

export default function RobotsPage() {
  const [selectedTheme, setSelectedTheme] = useState<RobotColorTheme>(() =>
    typeof window === "undefined" ? ROBOT_COLOR_THEMES[0].id : readStoredTheme(),
  );
  const selectedRobot =
    ROBOT_COLOR_THEMES.find((theme) => theme.id === selectedTheme) ?? ROBOT_COLOR_THEMES[0];

  const handleSelectTheme = (theme: RobotColorTheme) => {
    setSelectedTheme(theme);
    saveStoredTheme(theme);
  };

  return (
    <div className="min-h-screen p-3 font-sans text-[#172033] lg:p-5">
      <main className="technical-blueprint technical-paper relative min-h-[calc(100vh-1.5rem)] overflow-hidden border border-blue-500/20 bg-[#f7f5ef]/80 shadow-[0_24px_90px_rgba(23,32,51,0.10)] lg:min-h-[calc(100vh-2.5rem)]">
        <header className="relative z-10 flex flex-col gap-5 border-b border-blue-500/15 bg-[#f7f5ef]/70 px-4 py-5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 skew-x-[-18deg] bg-blue-600" />
              <span className="text-xl font-bold tracking-[0.18em] text-[#172033]">UNIFI</span>
            </div>
            <div className="hidden h-8 w-px bg-blue-500/20 sm:block" />
            <div>
              <p className="micro-label text-slate-500">Robot Themes</p>
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

        <section className="relative z-10 grid gap-4 p-4 lg:grid-cols-[0.72fr_1.28fr] lg:p-6">
          <aside className="grid gap-3">
            {ROBOT_COLOR_THEMES.map((theme) => {
              const isSelected = theme.id === selectedTheme;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`panel-glass overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:border-blue-500/40 ${
                    isSelected ? "ring-2 ring-blue-600/30" : ""
                  }`}
                >
                  <RobotThumbnail theme={theme.id} className="h-32 w-full" />
                  <div className="border-t border-blue-500/15 p-4">
                    <div className="micro-label text-blue-600">Theme</div>
                    <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#172033]">
                      {theme.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="panel-glass relative min-h-[520px] overflow-hidden p-4">
            <div className="pointer-events-none absolute right-4 top-4 h-14 w-14 border-r border-t border-blue-500/20" />
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <div className="micro-label text-blue-600">Ausgewählter Roboter</div>
                <h2 className="mt-1 text-3xl font-semibold tracking-[-0.06em] text-[#172033]">
                  {selectedRobot.label}
                </h2>
              </div>
              <div className="border border-blue-500/20 bg-white/45 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                {selectedRobot.id}
              </div>
            </div>

            <RobotThumbnail
              key={selectedRobot.id}
              theme={selectedRobot.id}
              interactive
              className="h-[440px] w-full"
            />
          </section>
        </section>
      </main>
    </div>
  );
}
