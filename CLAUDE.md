# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **WICHTIG — Single Source of Truth für Architektur, Modelle und Demo-Flow:**
> **[`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md)**
>
> Dieses Dokument ist vor jeder nennenswerten Änderung zu lesen. Es definiert u.a. Wear-Rate-Modell, UCS-Drop-in-Flow, Datasheet-Normalisierung, CFO-/Bank-View-Verhalten, UCS- und Deal-Desk-Agent.
>
> Ergänzend:
> - **`docs/research/decisions.md`** — getroffene Architektur-Beschlüsse mit Datum und Begründung (append-only). Vor einer eigenen Design-Entscheidung dort reinschauen.
> - **`docs/research/open-questions.md`** — explizit offene Fragen der Runde 2.
> - **`docs/idea-concept/archive/unifi_hackathon_konzept.md`** (v1) — nur historische Referenz. Bei Widerspruch gilt v2.

## Projektkontext — UNIFI

Hackathon-Projekt. UNIFI ist ein **horizontaler Financial Layer für Robotics-as-a-Service (RaaS)**: die Plattform übersetzt Roboter-Telemetrie in bankenfähige Finanzdaten, damit Hersteller, Software-Anbieter und Integratoren Pay-per-Pick anbieten können, ohne selbst zur Bank zu werden.

Positionierung (wichtig für Design- und Namensentscheidungen): *Wir bauen nicht RaaS — wir ermöglichen RaaS.* Analogie: „Visa-Netzwerk für automatisierte Arbeit".

Drei Kernprodukte, an denen sich Domain-Modelle und UI-Flächen orientieren:

1. **Abrechnungs-Engine** — exakte Kosten pro Pick/Werkstück (Energie, Verschleiß, Kapital, Wartung)
2. **Robot Credit Score** — dynamischer Restwert & Restlebensdauer in Echtzeit aus Nutzungsdaten
3. **RaaS-Konfigurator** — generiert Pay-per-Pick-Angebote inkl. bilanzieller Auswirkungsanalyse (OpEx vs. IFRS 16)

Weiterer Begriff, der im Code auftauchen kann: **UCS (Unifi Certification Standard)** — einheitliches Schema für Telemetrie/Verschleiß-Metriken, auf das eingehende Roboterdaten normalisiert werden.

Volltext siehe `docs/idea-concept/archive/project-overview.md`, `docs/idea-concept/archive/elevator_pitch`, `docs/idea-concept/archive/unifi-pitch-chat.md` (alle nach Aufräumen am 2026-04-25 ins `archive/`-Verzeichnis verschoben). Bei Konflikt zwischen Doku und Code ist Code autoritativ; bei Konflikt zwischen Doku und dem Pitch-Storyboard gilt `docs/idea-concept/archive/project-overview.md`.

## Repo-Struktur

Monorepo mit zwei App-Verzeichnissen und einem geteilten Datenverzeichnis:

```
apps/backend/src/   # Python-Backend (Python 3.12, uv) — noch leer
apps/frontend/      # Next.js-Frontend — noch leer
data/               # lokale Datasets und Fixtures — GITIGNORED
docs/idea-concept/  # Konzept, Pitch, One-Pager
docs/research/      # Daten-Discovery, Entscheidungen, offene Fragen
```

Stand: Quellverzeichnisse sind leer. Wenn du die ersten Dateien anlegst, halte dich an die Ordnerteilung (Python-Code nur unter `apps/backend/src/`, Frontend nur unter `apps/frontend/`) und lege geteilte Mock-/Fixture-Daten in `data/` ab statt sie in App-Ordnern zu duplizieren.

**`data/` ist gitignored.** Große Datasets (z.B. NIST UR5-Degradation unter `data/nist-ur5-degradation/`, PHM Society 2021 SCARA unter `data/phm-society-2021/`) werden nicht committet — stattdessen Download-Instruktionen im Doc ablegen. Kleine Fixtures/Mocks können bei Bedarf explizit per `-f` geforced werden.

Build-, Lint-, Test- und Dev-Run-Befehle sind noch nicht definiert. Bevor du welche in diese Datei schreibst, müssen sie tatsächlich existieren (`pyproject.toml`, `package.json`). Nicht vorab erfinden.

## Primary-Datensatz

**NIST UR5-Degradation**, lokal unter `data/nist-ur5-degradation/`. 6-DOF Universal-Robots-Cobot, 73 Sensor-Felder bei 125 Hz, 18 Test-Konfigurationen × 3 Wiederholungen mit expliziter Payload-Stratifikation (16 lb / 45 lb), Speed-Stratifikation (fullspeed / halfspeed) und Coldstart-Variante. Kern-Felder pro Joint J1–J6: `actual_current_J{1..6}`, `actual_position_J{1..6}`, `actual_velocity_J{1..6}`, `target_torque_J{1..6}`, `joint_temperature_J{1..6}`; plus TCP-Pose und TCP-Wrench. Keine expliziten Failure-Labels — Degradation manifestiert sich implizit über Run-Index 1/2/3 und Coldstart-Flag.

Das Wear-Rate-Modell wird auf diesen Daten trainiert — Ziel ist ein kontinuierlicher Wear-Rate-Multiplier (nicht RUL-Regression, nicht Fault-Classification). Trainingsbasis: Run 1 aller Konfigurationen (frischer Zustand). Foreign-Top für UCS-Demo: PHM Society 2021 SCARA. Siehe Konzept-v2 für Architektur, `docs/research/datasets.md` für Datensatz-Details, `docs/research/mechanics.md` für Normalisierungs-Schema.

## Hackathon-spezifische Erwartungen

- **Demo schlägt Vollständigkeit.** Ziel ist ein vorführbares Szenario entlang der drei Kernprodukte, nicht Produktionsreife. Mocks, Seed-Daten und Fixtures in `data/` sind ausdrücklich erwünscht.
- **Drei Personas als Akzeptanztest.** Jede nennenswerte UI-Fläche sollte für mindestens eine der drei Zielrollen einen klaren Wert liefern: Anna (CFO/Endkunde), Jonas (Software-Anbieter/Vermieter), Marie (Kreditanalystin/Bank). Wenn unklar, für wen ein Screen ist — Screen nochmal anschauen.
- **Sprache:** Produkt- und UI-Texte auf Deutsch, technische Identifier (Klassen, Felder, Endpoints) auf Englisch.
