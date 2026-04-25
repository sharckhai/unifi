# Datensätze — aktiver Stand

**Stand: 2026-04-25.** Primary ist **NIST UR5-Degradation**, Foreign-Top ist **PHM Society 2021 SCARA**.

> Dieses Dokument enthält ausschließlich **aktive** Kandidaten in voller Detailtiefe. Alle anderen Datensätze (Backup-Pool, verworfene Kandidaten aus der Discovery-Phase) sind in der Vergleichs-Übersicht gelistet, aber nicht mehr im Detail dokumentiert. Vollständige Discovery-Historie und alle Detail-Blöcke der ausgemusterten Kandidaten liegen unter `archive/2026-04-24-discovery/`.

---

## Vergleichs-Übersicht

### Gewählt — Primary

| Datensatz | Status | Rolle | Score | Nächste Schritte |
|---|---|---|---|---|
| **NIST UR5-Degradation** | **gewählt** | **primary** | tbd | Pick-Detektion fixieren; Label-Formel auf Joint-Aggregator entscheiden; Lizenz formal verifizieren |

### Shortlist — Foreign (Entscheidung in `decisions.md` fixieren)

| Datensatz | Status | Rolle | Score | Kernrisiko |
|---|---|---|---|---|
| **PHM Society 2021 SCARA (CSEM)** | **shortlist** | **foreign-Top** | ~20/21 | Lizenz formal offen — sonst sehr starker Schema-Kontrast |
| AI4I 2020 (UCI) | shortlist | foreign-Alternative-1 | tbd | nur Binär-Failure — als UCS-Mapping-Demo aber egal |
| Microsoft Azure PdM | shortlist | foreign-Alternative-2 | tbd | Multi-Tabellen-Preprocessing |

### Backup — nur falls primary/foreign fehlschlagen

Im Detail dokumentiert in `archive/2026-04-24-discovery/datasets.md`. Hier nur Liste:

NASA C-MAPSS · N-CMAPSS · Kitting Anomaly (Baxter) · FEMTO/PRONOSTIA · IMS Bearing · CWRU Bearing · XJTU-SY · CARE Wind Turbine · MetroPT2 · NASA Milling · NASA Li-ion Battery.

### Verworfen

Im Detail dokumentiert in `archive/2026-04-24-discovery/datasets.md`. Verworfen sind insbesondere alle Vision-Datensätze (ViFailback, RoboFAC, Humanoid Everyday, ARMBench, Handover Failure, I-FailSense, EJUST-PdM-1, MIMII), Comprehensive Dynamic Stability (Paywall + keine Zeitreihen), Robot Execution Failures (zu klein), sowie diverse generisch-industrielle Kandidaten ohne klare Robotik-Story.

---

## Kandidaten

### NIST UR5-Degradation *(primary)*

- **Status:** gewählt — **lokal vorhanden** unter `data/nist-ur5-degradation/`
- **Quelle / Link:** tbd — NIST-Datenkatalog (DOI/Originalseite im Repo nicht hinterlegt; vermutet: NIST Manufacturing Systems Integration / Robotic Performance Datasets)
- **Version / Stand:** tbd (lokal kopiert; kein Versions-Manifest)
- **Lizenz:** tbd — keine LICENSE im Repo. Standardannahme NIST: U.S.-Government-Work, Public Domain. **Formale Verifikation ausstehend.**
- **Format & Größe:** CSV (`raw` + `_flat`), 406 MB gesamt, 40 Daten-Files (18 Test-Konfigurationen × 2 Formate + 4 Repetitions-Pendants), je File ~8.6k Zeilen × 73 Spalten

**Was ist drin**
- Entitäten: 1 Roboter (UR5, 6-DOF Cobot) unter 18 stratifizierten Test-Konfigurationen
- Zeit-/Zyklusachse: `ROBOT_TIME` in Sekunden, **125 Hz Sampling**, ~69 s pro Run
- Sensor-Felder (alle 6 Joints J1–J6, soweit nicht anders vermerkt):
  - Joint-Position: Target + Actual (rad)
  - Joint-Velocity: Target + Actual (rad/s)
  - Joint-Current: Target + Actual (A)
  - Joint-Acceleration: Target (rad/s²)
  - Joint-Torque: Target (Nm)
  - Joint-Control-Current (A)
  - Joint-Temperatur (°C)
  - TCP: Position (x, y, z, rx, ry, rz)
  - TCP: Kraft/Moment (Fx, Fy, Fz, Trx, Try, Trz)
- Labels: **keine Failure-/RUL-Labels.** Degradation nur implizit über (a) Run-Index 1/2/3 und (b) Coldstart vs. warm
- Metadaten: Payload {16 lb, 45 lb}, Speed {fullspeed, halfspeed}, Coldstart-Flag, Run-Index — alles aus dem Dateinamen ableitbar; UR5-Datenblatt unter `datasheets/`

**Was fehlt** *(gemessen am UNIFI-Idealbild)*
- Keine expliziten Run-to-Failure-Trajektorien — pro Konfiguration nur 3 Snapshots à ~69 s
- Keine RUL- oder Klassen-Labels
- Keine native `DurationPickToPick`-Aggregation — Pick-Zyklen müssen aus TCP-Z + Joint-Velocity detektiert werden
- Keine README/LICENSE/DOI im lokalen Snapshot

**Pros für UNIFI**
- **Echter Cobot (UR5)** — pitch-stark, beweist UCS-Mapping über SCARA-Topologie hinaus
- **Explizite Payload-Stratifikation (16 lb / 45 lb)** in den Daten — direkter Treffer für den „variable Last"-Use-Case
- **6-DOF Joint-Telemetrie** mit semantisch klaren Feldnamen (Position/Velocity/Current/Torque/Temp pro Joint) — exzellent für LLM-Function-Call-Mapping
- **Stratifikation Payload × Speed × Coldstart** liefert eine implizite Wear-Achse, ohne dass Labels nötig sind
- **125 Hz Sampling** → reichere Spektral-Features als PHM SCARA
- **Offizielles UR5-Datenblatt** im Datensatz-Bundle — keine Stellvertreter-Recherche mehr nötig
- **NIST-Branding** stärkt Glaubwürdigkeit im Pitch
- Lokal vorhanden, kein Download-Risiko

**Cons / Risiken**
- Keine expliziten Failure-Labels — Demo nutzt Run-Index als Pseudo-Wear-Achse
- Kurze Snapshots (~69 s pro Run) — keine Run-to-Failure-Geschichte
- 73 Spalten ohne Einheiten-Header in CSV (Einheiten nur in `ur5testresultheader.xlsx`) — Mapping-Skript muss diese Datei mitlesen
- Lizenz nicht explizit dokumentiert — NIST-Annahme plausibel, formal offen

**UCS-Mapping (kanonisch)**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `actual_current_J{1..6}` | `joint_currents` | Stack über Joints; Aggregator (max/mean/p95) für Modell-Input |
| `actual_position_J{1..6}` | `joint_positions` | identity nach Stack |
| `actual_velocity_J{1..6}` | `joint_velocities` | identity |
| `target_torque_J{1..6}` | `joint_torques` | identity (Nm) |
| `joint_temperature_J{1..6}` | `thermal_stress` | Max/Mean über Joints |
| `tcp_force_{x,y,z}`, `tcp_torque_{x,y,z}` | `tcp_wrench` | Vector6 |
| `tcp_position_{x,y,z,rx,ry,rz}` | `tcp_pose` | identity |
| `ROBOT_TIME` | `time_s` | identity |
| Filename-Tag `payload{16\|45}lb` | `payload_kg` | 16 lb → 7.26 kg; 45 lb → 20.41 kg |
| Filename-Tag `{full\|half}speed` | `speed_factor` | 1.0 / 0.5 |
| Filename-Tag `coldstart` | `thermal_state` | enum: `cold` \| `warm` |
| Filename-Tag Run-Index | `run_index` | 1..3 (implizite Degradations-Achse) |

**Aufwand bis nutzbar:** ~1–2 h (CSV bereits flat-normalisiert; Headerdatei einlesen, Filename-Parser ergänzen).

**Offene Fragen:**
- Lizenz formal verifizieren (NIST-Datenkatalog/DOI ermitteln)
- Pick-Detektion: TCP-Z-Heuristik vs. Joint-Velocity-Muster vs. Run-Index-Aggregation
- Wird `calculateddeviationofactualpositiontonominalposition.xlsx` als Pseudo-Wear-Label genutzt?

**Kriterien-Score** *(1 = schwach, 2 = ok, 3 = stark; bei tbd → `?`)*

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | NIST-Standard wahrscheinlich Public Domain, formal offen |
| RUL-Labels | 1 | keine — nur implizite Run-Index-Achse |
| Sensor-Felder | 3 | 73 sprechende Spalten, multi-modal (Position/Velocity/Current/Torque/Temp/Force) |
| Mapping-Distanz zu UCS | 2 | als Primary nicht relevant |
| Robotik-Nähe | 3 | echter UR5-Cobot |
| Größe/Handling | 2 | 406 MB CSV — handhabbar |
| Use-Case-Fit (variable Last) | 3 | explizite Payload-Stratifikation in den Daten |
| **Summe** | **?/21** | Lizenz-Score offen → endgültige Summe ausstehend |

---

### PHM Society 2021 SCARA (CSEM) *(foreign-Top)*

- **Status:** shortlist — **lokal vorhanden** unter `data/phm-society-2021/`
- **Quelle / Link:** PHM Society 2021 Europe Data Challenge, CSEM (Swiss Center for Electronics and Microtechnology)
- **Version / Stand:** Challenge-Release 2021
- **Lizenz:** tbd — formal verifizieren vor öffentlichem Commit
- **Format & Größe:** ~143 CSV-Files (je ~1 MB), insgesamt ~170 h Betrieb, ~170k Pick-Events

**Was ist drin**
- Entitäten: 1 SCARA-Roboter (Sicherungs-Sortierung) mit Feeder + Test Bench
- Zeit-/Zyklusachse: 361 Zeitfenster à 10 s pro File → ~60 min Roboterbetrieb pro File
- Sensor-Felder: 51 Roboter-semantische Felder, u.a. `EPOSCurrent`, `EPOSPosition`, `EPOSVelocity`, `SmartMotorSpeed`, `SmartMotorPositionError`, `DurationPickToPick`, `DurationRobotFromFeederToTestBench`, `FuseCycleDuration`, `Vacuum`, `VacuumFusePicked`, `VacuumValveClosed`, `Pressure`, `CpuTemperature`, `Temperature`, `TemperatureThermoCam`, `Humidity`
- Aggregat-Statistiken pro Fenster: `vCnt`, `vFreq`, `vMax`, `vMin`, `vStd`, `vTrend`, `value`
- Labels: **Klassen-Labels pro File** — `class_0` (gesund, ~106 Files) + `class_2/3/4/5/7/9/11/12` (verschiedene Fehlertypen, ~37 Files)

**Pros für UNIFI (in Foreign-Rolle)**
- **Schärfster Schema-Kontrast zu UR5-NIST:** 4-DOF SCARA-Pick-Cycle-Aggregate vs. UR5 6-DOF kontinuierlicher Joint-Stream. Eingebaute `DurationPickToPick`-Semantik vs. UR5-Pick-Detektion-Heuristik. Class-basierte Fault-Labels vs. Run-Index-Heuristik.
- **Sprechende Feldnamen** — exzellent für LLM-Function-Call-Mapping
- **Demo-Aha-Moment:** „selbes Modell, völlig andere Roboter-Topologie und Schema-Form, Cost-per-Pick funktioniert"
- Großer Datenumfang (~170 h) erlaubt belastbare Out-of-Distribution-Validierung der Anomaly-Pipeline

**Cons / Risiken**
- Lizenz formal nicht verifiziert
- Keine kontinuierliche RUL-Trajektorie pro Roboter — Klassen-Labels sind diskret

**UCS-Mapping-Skizze (Foreign → UCS)**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `EPOSCurrent.*` | `joint_currents` | als 1-elementiger „Joint-Stream"; Aggregator wie bei UR5 |
| `EPOSPosition.*` | `joint_positions` | identity (1-DOF) |
| `EPOSVelocity.*` | `joint_velocities` | identity |
| `Temperature.value`, `CpuTemperature.value` | `thermal_stress` | Max der relevanten Temperaturkanäle |
| `DurationPickToPick.value` | `cycle_duration_s` | identity |
| `Vacuum.*`, `Pressure.*` | `pneumatic_state` | optional, SCARA-spezifisch |

**Aufwand bis nutzbar als Foreign-Demo:** ~2 h (LLM-Mapping + Validierung dass Wear-Rate-Ausgabe in plausiblem Bereich landet).

**Offene Fragen:**
- Formale Lizenz-Verifikation
- Wie weit lässt sich das auf UR5-NIST-Features trainierte Modell auf das stark abweichende SCARA-Schema übertragen, ohne dass die Wear-Rate-Verteilung kollabiert?

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | formal offen |
| Sensor-Felder | 3 | 51 Roboter-semantische Felder mit sprechenden Namen |
| Mapping-Distanz zu UCS (Foreign-Sicht) | 3 | scharfer Schema-Kontrast zum UR5-Primary |
| Robotik-Nähe | 3 | echter Industrieroboter |
| Größe/Handling | 3 | ~143 MB CSV, handhabbar |
| UCS-Demo-Tauglichkeit | 3 | bestmöglicher Drop-in-Moment |
| **Summe** | **?/21** | nur Lizenz offen — sonst sehr stark |

---

### AI4I 2020 (UCI) *(foreign-Alternative-1)*

- **Status:** shortlist
- **Quelle / Link:** UCI Machine Learning Repository
- **Lizenz:** tbd — UCI-üblich liberal, bestätigen
- **Format & Größe:** CSV, 10.000 Zeilen, kein Zeitverlauf pro Entität (Snapshots)
- **Sensor-Felder:** `Air temperature`, `Process temperature`, `Rotational speed`, `Torque`, `Tool wear`. Labels: binär `Machine failure` + 5 Failure-Type-Flags.

**Rolle:** generisch-industrielles Komplement zur Robotik-Robotik-Foreign-Demo (PHM SCARA). Beweist „funktioniert auch außerhalb der Robotik".

**Aufwand:** ~1 h (Mapping + Demo).

**Score:** Lizenz `?`, Sensor-Felder `3`, Mapping-Distanz `3`, Robotik-Nähe `2`, Größe `3`, UCS-Demo `3` — Summe `?/21`.

---

### Microsoft Azure PdM *(foreign-Alternative-2)*

- **Status:** shortlist
- **Quelle / Link:** Azure AI Gallery / GitHub-Forks (autoritative Variante tbd)
- **Lizenz:** tbd (je Fork)
- **Format & Größe:** Multi-CSV (telemetry, errors, maintenance, failures, machines), 100 Maschinen × 1 Jahr stündlich ≈ 876k Telemetrie-Rows
- **Sensor-Felder:** `volt`, `rotate`, `pressure`, `vibration` + Failure-/Maintenance-/Error-Events
- **Rolle:** Fleet-Komplement (100 Maschinen, Multi-Model) — würde Bank-View-Flotten-Demo aufwerten
- **Aufwand:** ~3–4 h (Multi-Tabellen-Join)

**Score:** Lizenz `?`, RUL-Ableitung aus Events `2`, Sensor-Felder `3`, Mapping-Distanz `2`, Robotik-Nähe `2`, Größe `2`, UCS-Demo `3` — Summe `?/21`.

---

## Entscheidungs-Checkliste

- [ ] Lizenz UR5-NIST formal verifizieren
- [ ] Lizenz PHM SCARA formal verifizieren (für öffentlichen Repo-Commit)
- [ ] Foreign-Reihenfolge fixieren: PHM SCARA als Top + AI4I als Sekundär-Demo
- [ ] Pick-Detektion in UR5-NIST entscheiden (vor Training)
- [ ] Aggregator über die 6 Joint-Ströme/-Temperaturen entscheiden (max / mean / p95)
