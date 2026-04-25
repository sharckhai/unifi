# Offene Fragen — Research-Phase

Alles, was während der Recherche auftaucht und nicht sofort beantwortet werden kann. Jede Frage hat einen Status: **offen**, **geschlossen** (mit Entscheidung/Begründung) oder **vertagt**.

**Stand nach Konzept-v2 (2026-04-24):** Viele Fragen aus v1 sind durch die Architektur-Klärung obsolet oder entschieden. Die Liste ist entsprechend aufgeräumt. Autoritative Quellen: `docs/idea-concept/unifi_konzept_v2.md` und `docs/research/decisions.md`.

---

## Offene Fragen (Runde 2, vor Build)

### Datensatz-Wahl

- **Foreign-Datensatz: AI4I 2020 vs. Azure PdM.** Beide LLM-mappbar, beide kein Vision. AI4I ist kleiner und semantisch direkter (`Torque`, `Rotational speed`, `Tool wear`); Azure PdM hat Fleet-Setup (mehrere Maschinen). Entscheidung in `decisions.md` fixieren.
- **PHM Society 2021 SCARA — Lizenz formal:** Datensatz ist lokal unter `data/phm-society-2021/`. Lizenz ist als PHM-Society-Challenge-public angenommen, aber nicht formal geprüft. Vor Commit ins öffentliche Repo verifizieren (entweder öffentliches CC-Äquivalent oder nur verlinken statt committen).

### Modell-Entscheidungen

- **Wear-Rate-Modelltyp: LightGBM + SHAP oder kleines NN + SHAP.** Beide valid laut User-Entscheidung. Entscheidung fällt in Runde 2 vor dem Training — abhängig davon, was schneller zu trainieren und erklärbarer zu rendern ist. Kriterium: Training < 30 min, SHAP-Integration funktionsfähig.
- **Label-Konstruktions-Formel (physikalisch motiviert).** Vor Training fixieren: Exponent α für Basquin (Vorschlag: 2.5), Referenz-Temperatur T_ref (Vorschlag: CpuTemperature-Median aus class_0), Gewichtung des Zyklusrate-Faktors. Formel in `decisions.md` einchecken.
- **Normalisierung der Modell-Inputs.** Per-Feature Min/Max aus class_0-Statistiken, oder z-score? Auswirkung auf SHAP-Lesbarkeit prüfen.

### Wirtschaftslogik

- **IFRS-16-Simulator: deterministische Formel oder LLM-Narrative im Deal-Desk-Agent?** Option A (deterministisch): kleine Python-Funktion berechnet Verbindlichkeit + Nutzungsrecht + Covenant-Impact aus Rate und Laufzeit. Option B (narrativ): LLM erklärt die Auswirkungen in natürlicher Sprache, Zahlen kommen aus Option-A-Funktion. Entscheidung koppelt an Deal-Desk-Agent-Scope.
- **Robot Credit Score — Formel.** Konzept-v2 nennt „Wear Rate + Restwert + Cashflow". Konkrete Gewichte und Normalisierung (0–1, AAA–D, oder 0–100-Score) fehlen. Vor Bank-View-Rendering festlegen.
- **Abschreibungskurve für Restwert.** Degressiv mit welcher Rate? Doppelt-degressiv, exponentiell, linear-modulated-by-wear? Vorschlag: exponentieller Restwertverlauf mit Wear-Rate als Modulator auf die Zerfallsrate.

### UCS- und Deal-Desk-Agent

- **UCS-Mapping — Bestätigungs-UI.** Wie rendert der User die LLM-Vorschläge, bevor er sie bestätigt? Tabelle mit Dropdown pro Feld? Oder Free-Text-JSON-Edit? Entscheidung für Build-Phase.
- **Deal-Desk-Output-Schema.** Welche Felder hat das strukturierte Angebotsdokument? Mindestens: Header, Pay-per-Pick (Range + Mittelwert), Monatsprognose, Bilanz-Impact-Block, Covenant-Erklärung, Klausel-Vorschläge. Genaues Schema in `decisions.md` oder direkt als Python-Pydantic-Modell.
- **Deal-Desk-Tool-Aufrufe.** Welche Tools bekommt der LLM-Agent konkret? Mindestens: `calculate_cost_per_pick`, `simulate_ifrs16_impact`. Optional: `lookup_historical_volume` (Mock).

### Demo-Choreografie

- **Welcher Datensatz ist primär sichtbar im CFO-View?** Einer (PHM SCARA als Hauptroboter), oder simulierte Flotte (mehrere Roboter abgeleitet aus PHM-SCARA-Daten)? Bank-View braucht Flotte, CFO-View reicht ein Roboter.
- **UCS-Live-Demo im Pitch-Flow.** Zwischen CFO- und Bank-View? Vor beiden? Empfehlung: nach CFO-View (erst Hauptstory, dann „…und das funktioniert auch mit anderen Datensätzen").

### Lizenz & Veröffentlichung

- **Datensätze committen oder verlinken?** Wahrscheinlich verlinken (kleinere Repo-Größe, Lizenz-Risiko geringer). Für PHM SCARA lokal behalten, im Pitch-Repo nur Instruktionen zum Download.

---

## Geschlossen (mit Entscheidung)

- ~~**UCS-Kanonisches Schema:**~~ → **geschlossen.** Wird pragmatisch aus PHM-SCARA-Feldern abgeleitet: `cycle_index`, `motor_current`, `motor_position`, `motor_velocity`, `pick_duration_s`, `cycle_duration_s`, `process_quality_metric`, `vacuum_pressure`, `pressure`, `temperature_delta`. Erweiterbar, nicht normativ.
- ~~**Zyklus-Definition „1 Zyklus = 1 Pick":**~~ → **geschlossen.** Das PHM-SCARA-Feld `DurationPickToPick` ist direkt Pick-zu-Pick-Dauer. Kein Konvertierungs-Problem.
- ~~**RUL-Einheit (Zyklen oder Stunden):**~~ → **geschlossen.** Wir lernen nicht direkt RUL. RUL wird aus kumulierter Wear Rate ÷ `nominal_picks_lifetime` abgeleitet. Einheit: verbleibende Picks.
- ~~**Health Score 0–100:**~~ → **geschlossen (vereinfacht).** Im MVP-Bank-View wird ein Score aus Wear Rate (inverted, normalisiert) gebildet. Anomaly-Komponente später. Konkrete Formel in `decisions.md`.
- ~~**Feature-Importance im Drilldown:**~~ → **geschlossen.** SHAP auf Wear-Rate-Modell (LightGBM oder NN).
- ~~**Wertverlust pro Zyklus / Abschreibungskurve:**~~ → **geschlossen (Prinzip).** Degressiv, moduliert mit kumulierter Wear Rate. Konkrete Parameter offen (siehe oben).
- ~~**Kapitalkosten im Cost-per-Pick:**~~ → **geschlossen.** Bezugsgröße ist `nominal_picks_lifetime` aus Datasheet (Normalisierung, nicht Wear-Multiplier).
- ~~**C-MAPSS vs. Bearing-Daten:**~~ → **geschlossen.** Beides verworfen. PHM SCARA ist primary.
- ~~**PHM SCARA 2021 verfügbar?**~~ → **geschlossen.** Lokal vorhanden unter `data/phm-society-2021/`.
- ~~**Video-Pipeline?**~~ → **geschlossen.** Nein. Tabular-only. Alle Vision-Datensätze verworfen.
- ~~**Narrative: stationär oder mobil?**~~ → **geschlossen.** Stationärer Industrieroboter (SCARA in Sicherungs-Sortierung, gerahmt als Logistik/E-Commerce-Analogie mit variablem Paket-Gewicht). Mobile-Roboter-Branch und NASA Li-ion verworfen.
- ~~**Kitting Anomaly Preprocessing-Aufwand:**~~ → **geschlossen.** Verworfen (37 GB + ROS-Bag-Overhead).
- ~~**Comprehensive Dynamic Stability für mechanics:**~~ → **geschlossen.** Verworfen (IEEE-DataPort-Paywall, nur statische Parameter).
- ~~**Welches CASPER:**~~ → **geschlossen.** Nicht verfolgt.
- ~~**Lizenz-Priorisierung:**~~ → **geschlossen.** Relevant ist nur noch PHM SCARA (primary) + Foreign-Kandidat.
- ~~**IEEE-DataPort-Zugang:**~~ → **geschlossen.** Alle IEEE-DataPort-Kandidaten verworfen, kein Zugang nötig.
- ~~**UCS-Demo-Paar:**~~ → **teilweise geschlossen.** Paar ist PHM SCARA (primary) ↔ AI4I 2020 oder Azure PdM (foreign). Entscheidung AI4I vs. Azure noch offen (siehe oben).
- ~~**Wie viele Mechanik-Profile:**~~ → **geschlossen.** 1 für primary (CSEM SCARA) + 3–4 synthetische für Bank-View-Fleet.
- ~~**MTBF findbar:**~~ → **geschlossen.** Nicht mehr nötig. Siehe `mechanics.md`.
- ~~**Neupreis-Quelle:**~~ → **geschlossen (pragmatisch).** Plausibler Schätzwert, im Pitch transparent gekennzeichnet. Reale Datasheet-Werte optional.
- ~~**Welcher Datensatz im CFO-View:**~~ → **geschlossen (Default).** PHM SCARA. Simulierte Flotte im Bank-View-Panel.
- ~~**Anomaly Detection jetzt bauen?**~~ → **geschlossen.** Nein, postponed nach Hackathon.

## Vertagt auf Post-Hackathon

- **Anomaly-Detection-Modell (Autoencoder oder One-Class auf class_0).** Konzeptionell dokumentiert in v2. Nach Hackathon Iteration 2.
- **Echte Hersteller-Datasheet-Integration** (UR, FANUC, ABB APIs für Live-Datasheet-Lookup).
- **Multi-Roboter-Real-Data** (mehrere echte Datensätze statt synthetischer Flotte).
- **IFRS-16-Simulator nach Standard A.1** inkl. Diskontierung — im MVP nur vereinfachte Version.
