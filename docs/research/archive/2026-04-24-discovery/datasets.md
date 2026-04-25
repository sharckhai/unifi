# Datensatz-Research

**Stand nach Konzept-v2 (2026-04-24):**
- **Primary ist entschieden:** PHM Society 2021 SCARA (CSEM), lokal unter `data/phm-society-2021/`. Volle Evaluation weiter unten.
- **Foreign noch offen:** Fokus auf AI4I 2020 (Top) und Azure PdM (Alternative) — beide LLM-mappbar, semantische Feldnamen, Schema-Kontrast zu PHM SCARA.
- Alle ursprünglichen Primary-Alternativen und sämtliche Vision-Datensätze sind **verworfen** (siehe Tabelle).
- Konzept-Referenz: `docs/idea-concept/unifi_konzept_v2.md`. Bewertungskriterien aktualisiert in `scope.md`.

---

## Vergleichs-Übersicht

_(Sortiert nach finalem Status: gewählt → shortlist-foreign → Backup → verworfen. Runde-1-Discovery-Funde vom 2026-04-24 mit ⚡ markiert. **Diese Tabelle ist die autoritative Status-Quelle** — einzelne H3-Blöcke weiter unten können im Detail abweichende Status-Zeilen haben und werden ggf. nicht mehr gepflegt.)_

### Gewählt — Primary

| Datensatz | Status | Rolle | Score | Nächste Schritte |
|---|---|---|---|---|
| ⚡ **PHM Society 2021 Europe (SCARA, CSEM)** | **gewählt** | **primary** | ~20/21 | Lizenz formal verifizieren; Label-Formel fixieren; Modelltyp wählen |

### Shortlist — Foreign (Entscheidung in `decisions.md` fixieren)

| Datensatz | Status | Rolle | Score | Kernrisiko |
|---|---|---|---|---|
| AI4I 2020 (UCI) | **shortlist** | foreign-Top | tbd | nur Binär-Failure — als UCS-Mapping-Demo aber egal, weil wir nicht trainieren |
| Microsoft Azure PdM | shortlist | foreign-Alternative | tbd | Multi-Tabellen-Preprocessing, aber Fleet-Struktur pitch-wertvoll |
| UR5-NIST-Degradation (lokal) | shortlist | foreign-Roboter-Komplement | tbd | Roboter-zu-Roboter-Mapping schwächt Schema-Kontrast — Lizenz formal offen |

### Backup — nur falls primary/foreign fehlschlagen

| Datensatz | Status | Rolle | Begründung |
|---|---|---|---|
| NASA C-MAPSS (FD001–FD004) | Backup | primary-Notfall | falls PHM SCARA Lizenz-Blocker hat — aber Turbofan-Framing passt nicht zu Logistik-Narrativ |
| ⚡ N-CMAPSS | Backup | — | wie C-MAPSS, größere Scale — selbes Narrativ-Problem |
| ⚡ Kitting Anomaly Dataset (Baxter) | Backup | primary-Notfall | 37 GB + ROS-Bag-Overhead — nur wenn PHM SCARA ausfällt |
| FEMTO / PRONOSTIA Bearing (PHM'12) | Backup | primary-Notfall | Lager, nicht Roboter; Zitation statt Lizenz |
| IMS Bearing | Backup | primary-Notfall | GB-Scale |
| CWRU Bearing | Backup | foreign-Notfall | nur Binär, Rohsignal-Overhead |
| ⚡ XJTU-SY Rolling Bearing | Backup | primary-Notfall | 25.6 kHz Rohsignal |
| ⚡ CARE Wind Turbine SCADA | Backup | foreign-Notfall | industrieübergreifend interessant, aber pitch-ferner |
| ⚡ MetroPT2 / MetroPT | Backup | foreign-Notfall | Metro-Kompressor — narrativ weit |
| ⚡ NASA Milling | Backup | foreign-Notfall | CNC-Tool-Wear, Multi-Modal |
| ⚡ NASA Li-ion Battery | Backup | optional-addon | passt zu mobile-Roboter-Branch, nicht zu SCARA-Demo |

### Verworfen (bleiben dokumentiert)

| Datensatz | Begründung für Verwerfung |
|---|---|
| ⚡ Comprehensive Dynamic Stability (ABB/FANUC/KUKA/UR5) | IEEE-DataPort-Subscription nötig + keine Zeitreihen, nur statische Parameter |
| ⚡ ViFailback (HuggingFace) | Video-Daten — Vision-Pipeline nicht im 24-h-Scope |
| ⚡ RoboFAC (HuggingFace) | Video-Daten — dito |
| ⚡ Humanoid Everyday | Video-Daten, Manipulation-Fokus, keine Fault-Labels — dito |
| ⚡ ARMBench | Video-/RGB-/Depth-basiert — dito |
| ⚡ Handover Failure Detection | Multi-Modal mit Vision-Fokus, kein kontinuierliches RUL |
| ⚡ I-FailSense | Vision-heavy, Sim-Simulation |
| ⚡ EJUST-PdM-1 | Video-basiert |
| ⚡ IBM IoT Predictive Analytics | Datensatz-Details nicht transparent; unsicher ob echt herunterladbar |
| ⚡ Lenze Motor Bearing Fault | zu wenig Information zu Größe/Aufbau — für Foreign unnötig |
| ⚡ PyScrew Industrial Screw Driving | interessant narrativ, aber SCARA deckt Zyklus-Story schon ab |
| ⚡ NASA IGBT Aging | Halbleiter-Aging — zu spezifisch, passt nicht in MVP-Scope |
| ⚡ Edge-AI Sensor (Smart Manufacturing) | Simulation-unklar, generisch |
| ⚡ Rotating Electromechanical System | generisches Benchmark, keine Robotik-Story |
| ⚡ PHM 2009 Gearbox Challenge | nur Multi-Klasse-Fault, kein Wear-Rate-Input |
| ⚡ COMFAULDA | Multi-Label-Fault, kein Wear-Rate-Fit |
| ⚡ Vibration Signal (CWRU-Refinement) | Refinement von CWRU — redundant |
| ⚡ SUBF v1.0 Bearing Fault | Lab-Daten, keine Run-to-Failure |
| ⚡ Machine Failure Prediction (Kaggle, umerrtx) | Details unklar, generisch |
| ⚡ TCM Steel Manufacturing | Stahl-Industrie zu weit vom Robotik-Narrativ |
| ⚡ Nigerian Energy & Utilities PdM | Energie-Infrastruktur, untypisch |
| ⚡ MIMII / MIMII DUE | Audio-Daten, keine Tabular-Pipeline vorhanden |
| CASPER | Name uneindeutig, nicht verfolgt |
| Robot Execution Failures (UCI) | zu klein (~88 Instanzen), keine Zeitreihe pro Entität |
| LeRobot Hub (HF) Subsets | Imitation Learning — keine Fault-Subsets gefunden |
| Open X-Embodiment / DROID / RoboNet / RoboMIMIC | Block-Check negativ: keine Fault-/Degradation-Labels |
| ⚡ Robo-Mani-Failure-Data Registry | nur Meta-Index, keine eigenen Daten |
| Nvidia Isaac Sim Fault-Datasets | keine offiziellen Fault-Datensätze — Selbstgenerierung out-of-scope |
| Fraunhofer / FZI / Siemens Industrial Edge | Software/Frameworks, keine fertigen PHM-Datensätze |

**Discovery-Status 2026-04-24 (abgeschlossen):** alle Discovery-Quellen aus `scope.md` wurden in der Discovery-Runde abgearbeitet. Ergebnis: ein starker primary-Kandidat (PHM SCARA), keine weiteren Priorität-1-Treffer im Tabular-Segment. Vision-Segment bewusst ausgeschlossen.

---

## Kandidaten

### Robot Execution Failures (UCI)

- **Status:** seed
- **Quelle / Link:** tbd — UCI ML Repository, Suche „Robot Execution Failures"
- **Version / Stand:** ~1999, klein und alt
- **Lizenz:** tbd — UCI-typisch
- **Kommentar:** Tatsächlich Roboter (nicht Lager/Turbinen) mit gelabelten Fehlklassifikationen des Ausführungserfolgs. Vermutlich zu klein und zu alt für den Hauptfluss, aber als Robotik-Näher-Fremddatensatz in der UCS-Demo denkbar. **Vor Evaluation:** Sample-Größe prüfen und ob Zeitreihen-Struktur vorhanden ist.

---

### LeRobot Hub (HuggingFace) — Subsets scannen

- **Status:** seed
- **Quelle / Link:** tbd — huggingface.co/lerobot
- **Kommentar:** HuggingFace-Hub für Robotik-Daten. Primär Imitation Learning (Demonstrationen für Policy-Training), nicht PdM. **Discovery-Ziel:** prüfen, ob irgendein Subset Fault-/Failure-Episoden enthält oder ob Torque-/Vibrations-Verläufe für selbst-abgeleitetes RUL brauchbar sind. Wahrscheinlich negativ — dann dokumentieren und streichen, aber nicht ohne Blick.

---

### Open X-Embodiment / RT-X / DROID / RoboNet / RoboMIMIC

- **Status:** seed (Block-Prüfung)
- **Quelle / Link:** tbd — robotics-transformer-x, droid-dataset, robonet, robomimic
- **Kommentar:** Große moderne Robotik-Datensätze, gebaut für Manipulation-Policy-Learning. Kamera- und Proprioceptions-Streams, keine expliziten Fault-/Degradations-Labels bekannt. **Discovery-Ziel:** in einem Durchgang gemeinsam abchecken, ob Subsets mit Abnutzung / Ausfall markiert sind. Erwartung: nein. Dann als Block streichen und im Pitch-Sprech *trotzdem* verwenden können („diese Policy-Daten sind auch Telemetrie — UCS könnte sie einlesen").

---

### HuggingFace Datasets — Robotics/Time-Series Sweep

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** Systematischer Sweep über HF Datasets mit Tags `robotics`, `time-series`, `anomaly-detection` und Keyword-Suchen (`predictive maintenance`, `RUL`, `fault`, `degradation`). Jeder Einzeltreffer bekommt einen eigenen H3-Block.

---

### Nvidia Isaac Sim — Backup-Option via Simulation

- **Status:** seed (Backup)
- **Quelle / Link:** tbd — Isaac Sim Docs
- **Kommentar:** Nicht ein Datensatz, sondern eine Simulationsumgebung, in der wir theoretisch selbst Degradations-Szenarien generieren könnten (künstliche Motor-Last-Verläufe, induzierte Gelenk-Drift). **Nur ziehen**, wenn die Discovery komplett leer für echte Roboter-PHM-Daten ausgeht. Eigener Datensatz in 24h realistisch unterschätzt — als Backup markieren, nicht als Erstwahl.

---

### FEMTO / PRONOSTIA Bearing (PHM 2012 Data Challenge)

- **Status:** seed
- **Quelle / Link:** tbd — FEMTO-ST / IEEE PHM 2012 Data Challenge
- **Kommentar:** Run-to-Failure-Experimente an Lagern, entwickelt für die PHM'12 Challenge. Robotik-angrenzend (Lager in Gelenken). Vorteil gegenüber IMS/CWRU: als RUL-Benchmark in der Literatur gesetzt, also Standard-Baseline verfügbar. **Vor Evaluation:** Lizenz FEMTO-ST verifizieren.

---

### PHM Society Data Challenges (jährlich)

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** Die PHM Society veranstaltet jährliche Data Challenges. Einige Jahre haben Robotik-nahe Themen (Industrieroboter, CNC, Servomotoren). **Discovery-Ziel:** Liste der letzten 5 Jahre durchgehen, jeden robotik-nahen Challenge-Datensatz als eigenen H3-Block aufnehmen.

---

### Kaggle „Robot Arm PdM"-Suche

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** Kaggle-Keyword-Sweep mit `robot arm`, `robotic manipulation + maintenance`, `industrial robot failure`. Pro Treffer H3-Block anlegen. Qualität variabel.

---

### IEEE DataPort Robotics-Sweep

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** IEEE DataPort führt mehrere industrielle Sensordaten-Sets. Robotics-Kategorie durchsuchen, speziell nach Fault-/Degradation-Tags.

---

### Zenodo Industrial-Robot-Failure-Sweep

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** Zenodo hostet viele EU-geförderte Forschungs-Datensätze — oft mit `industrial robot` + `failure/degradation/RUL`-Keywords findbar. Lizenzlage CC-BY meist gut.

---

### Fraunhofer / FZI / Siemens / IBM PMQ

- **Status:** seed (Discovery-Platzhalter)
- **Kommentar:** Öffentliche Industrie-Demo-Daten: Fraunhofer IPA-Publikationen, FZI Karlsruhe, Siemens Industrial Edge Sample Data, IBM Predictive Maintenance & Quality Demo. Oft vorhanden, oft schlecht auffindbar. Pro Fund eigener H3-Block.

---

### NASA C-MAPSS

- **Status:** prüfen
- **Quelle / Link:** tbd — NASA Prognostics Data Repository (PCoE)
- **Version / Stand:** tbd (üblicherweise FD001–FD004 aus 2008, teils Updates)
- **Lizenz:** tbd — typischerweise NASA PDS public, muss final bestätigt werden
- **Format & Größe:** tbd — Textfiles mit Zeitreihen, pro Subset ~100 Runs, MB-Bereich

**Was ist drin**
- Entitäten: simulierte Turbofan-Engine-Runs (pro Subset 100+)
- Zeit-/Zyklusachse: Operationszyklen bis Ausfall
- Sensor-Felder: 21 Sensor-Kanäle + 3 operational settings (numerisch)
- Labels: **kontinuierliches RUL** je Zyklus — sauberste verfügbare Label-Qualität im PdM-Space
- Metadaten: pro Subset 1 oder 6 Betriebsbedingungen, 1 oder 2 Fehlermoden

**Was fehlt**
- Keine Roboter-Kontextdaten (Payload, Duty Cycle, Pick-Rate)
- Keine wirklichen Timestamps — nur Zyklus-Index
- Keine Finanzkontext-Felder (Kosten, Wartung) — müssen wir synthetisieren

**Pros für UNIFI**
- Beste RUL-Labels im Feld → Modell-Qualität hoch ohne eigenes Labeling
- Umfangreiche Benchmark-Literatur → wir können auf „Baseline LightGBM RMSE" verweisen ohne Eigenvalidierung
- „1 Zyklus = 1 Pick"-Framing funktioniert, weil Zyklen klar abgegrenzt sind
- Feature-Importance erzählt sich gut („Sensor 12 dominiert die Degradation")

**Cons / Risiken**
- Null Robotik-Nähe — Pitch-Framing muss das auffangen (Konzept-PDF argumentiert das bereits)
- „Noch ein C-MAPSS-Demo"-Ermüdung bei erfahrenen PdM-Publikum möglich
- Keine echten Ausfallmoden, die auf Roboter übertragbar wären — für ML ok, für Narrative leicht angreifbar

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `cycle` | `cycle_index` | identity |
| `op_setting_*` | `load_cumulative` (derived) | aggregieren / erst klären |
| `sensor_*` (ausgewählt) | `vibration_rms`, `temperature_delta` | Sensor-Subset noch zu wählen |
| — | `pick_count` | = `cycle_index` laut Framing |

**Rolle-Kandidat:** primary
**Aufwand bis nutzbar:** ~2h (Download + Inspect + erste UCS-Mapping-Version)
**Offene Fragen:**
- Welches Subset (FD001 einfach vs. FD004 realistisch-komplex)?
- Lizenztext exakt prüfen, bevor wir ins Repo committen
- Welche der 21 Sensoren haben überhaupt Varianz, welche sind konstant? (bekannt aus Literatur: viele sind konstant)

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | NASA PDS wird als public angenommen, muss bestätigt werden |
| RUL-Labels | 3 | Goldstandard im Feld |
| Sensor-Felder | 2 | breit aber anonymisiert, keine Semantik |
| Mapping-Distanz zu UCS | 2 | generische Feldnamen, wir definieren die Zuordnung selbst |
| Robotik-Nähe | 1 | Turbinen, nicht Roboter |
| Größe/Handling | 3 | klein, CSV, schnell verarbeitbar |
| UCS-Demo-Tauglichkeit | 2 | nur als primary — braucht einen andersartigen foreign daneben |
| **Summe** | **?/21** | ausstehend bis Lizenz verifiziert |

---

### AI4I 2020 Predictive Maintenance

- **Status:** prüfen
- **Quelle / Link:** tbd — UCI Machine Learning Repository
- **Version / Stand:** 2020
- **Lizenz:** tbd — UCI üblich research-/commercial-freundlich, bestätigen
- **Format & Größe:** CSV, 10.000 Zeilen

**Was ist drin**
- Entitäten: synthetisch generierte Maschinen-Operationen (keine echten Runs, kein Zeitverlauf pro Entität)
- Zeit-/Zyklusachse: keine — jede Zeile ist ein unabhängiger Snapshot
- Sensor-Felder: Air temperature, Process temperature, Rotational speed, Torque, Tool wear
- Labels: binär `Machine failure` + 5 Failure-Type-Flags (TWF, HDF, PWF, OSF, RNF)
- Metadaten: Produkttyp (L/M/H Quality)

**Was fehlt**
- **Kein kontinuierliches RUL** — nur Binär-Labels
- Keine Zeitreihe pro Entität — also kein Degradationsverlauf modellierbar
- Keine Finanz-/Kosten-Komponente

**Pros für UNIFI**
- Feldnamen (`Torque`, `Rotational speed`, `Tool wear`) klingen roboter-nah → Pitch-Framing leichter als bei C-MAPSS
- Kleiner, sauberer, sehr schnell ladbar
- Als **foreign**-Datensatz exzellent: komplett andere Struktur als C-MAPSS (Snapshot statt Zeitreihe), anderes Feldnamen-Set

**Cons / Risiken**
- Ohne Zeitreihe kein Degradationsmodell trainierbar → nicht als primary tauglich
- Synthetisch — für Narrative („echte Maschinen") angreifbar
- RUL nur näherungsweise aus Binär-Labels ableitbar, qualitativ schwach

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `Torque [Nm]` | `load_cumulative` | bei Snapshots: Momentanlast → UCS kumulativ braucht Aggregation |
| `Rotational speed [rpm]` | tbd neues UCS-Feld `rotation_rate`? | offen |
| `Tool wear [min]` | `wear_minutes` | identity |
| `Air temperature [K]`, `Process temperature [K]` | `temperature_delta` | Differenz |

**Rolle-Kandidat:** foreign (für UCS-Live-Demo)
**Aufwand bis nutzbar:** ~1h
**Offene Fragen:**
- Reicht Binär-Failure, um im UCS-Demo *sichtbar* durch die gleiche Pipeline zu laufen (ohne Modell zu trainieren, nur Mapping + Anzeige)?
- Wie gehen wir mit fehlender Zeitreihe um — künstlich eine Reihenfolge erzeugen?

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | UCI-üblich liberal, bestätigen |
| RUL-Labels | 1 | nur binär |
| Sensor-Felder | 3 | semantisch klar und roboter-klingend |
| Mapping-Distanz zu UCS | 3 | weit genug entfernt, um UCS-Demo interessant zu machen |
| Robotik-Nähe | 2 | generische Industriemaschine, nicht Roboter, aber näher als C-MAPSS |
| Größe/Handling | 3 | trivial |
| UCS-Demo-Tauglichkeit | 3 | strukturell komplementär zu C-MAPSS |
| **Summe** | **?/21** | ausstehend |

---

### Microsoft Azure Predictive Maintenance

- **Status:** prüfen
- **Quelle / Link:** tbd — Azure AI Gallery / GitHub
- **Version / Stand:** tbd (ursprünglich ~2016, diverse Forks)
- **Lizenz:** tbd — meist MIT oder ähnlich, aber je Fork variieren

**Format & Größe:** mehrere CSVs (telemetry, errors, maintenance, failures, machines), 100 Maschinen × 1 Jahr stündlich ≈ 876k Telemetrie-Rows

**Was ist drin**
- Entitäten: 100 Maschinen mit individuellen Profilen (Alter, Modell)
- Zeit-/Zyklusachse: stündlich über 1 Jahr
- Sensor-Felder: Voltage, Rotation, Pressure, Vibration
- Labels: Failure-Events + Maintenance-Events + Error-Codes — RUL daraus ableitbar
- Metadaten: Machine-Model, Alter in Jahren

**Was fehlt**
- Kein direktes RUL-Feld — muss aus Events berechnet werden
- Keine Zyklen-Semantik — alles zeitbasiert, nicht pick-basiert

**Pros für UNIFI**
- **Fleet-Setup** (100 Maschinen, Multi-Model) passt exakt zur Bank-View-Flottentabelle
- Zeitachse + Events erlaubt realistische Replay-Demo
- Metadaten (Model, Alter) fütterbar in Mechanik-Profile

**Cons / Risiken**
- Multi-Tabellen-Join → mehr Preprocessing-Aufwand als bei C-MAPSS
- Qualität variiert je Fork — „offizielle" Version nicht eindeutig
- Schon sehr oft in Demos gesehen, könnte als generisch wahrgenommen werden

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `volt`, `rotate`, `pressure`, `vibration` | `voltage`, `rotation_rate`, `pressure`, `vibration_rms` | identity nach Einheit-Check |
| `machineID` | `entity_id` | identity |
| `failure` events | RUL-Ableitung | pro Maschine: Zeit-bis-nächster-Failure |

**Rolle-Kandidat:** foreign (Alternative zu AI4I) oder primary (falls C-MAPSS verworfen wird)
**Aufwand bis nutzbar:** ~3–4h (wegen Multi-Tabellen-Preprocessing)
**Offene Fragen:**
- Welcher Fork ist autoritativ?
- Wie lange braucht die RUL-Ableitung? (entscheidet primary-Tauglichkeit)

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | je Fork |
| RUL-Labels | 2 | ableitbar, nicht frei Haus |
| Sensor-Felder | 3 | Voltage/Rotation/Pressure/Vibration — ideal |
| Mapping-Distanz zu UCS | 2 | semantisch klar, Einheiten zu prüfen |
| Robotik-Nähe | 2 | generische Industrie-Maschinen |
| Größe/Handling | 2 | ~876k Rows gut, aber Multi-Tabelle |
| UCS-Demo-Tauglichkeit | 3 | Fleet-Aspekt stark |
| **Summe** | **?/21** | |

---

### UR5-NIST-Degradation

- **Status:** prüfen — **lokal vorhanden** unter `data/nist-ur5-degradation/`
- **Quelle / Link:** tbd — NIST-Datenkatalog (DOI/Originalseite im Repo nicht hinterlegt; vermutet: NIST Manufacturing Systems Integration / Robotic Performance Datasets)
- **Version / Stand:** tbd (Datensatz lokal kopiert; kein Versions-Manifest)
- **Lizenz:** tbd — keine LICENSE im Repo. Standardannahme NIST: U.S.-Government-Work, Public Domain. **Formale Verifikation ausstehend.**
- **Format & Größe:** CSV (`raw` + `_flat`), 406 MB gesamt, 40 Daten-Files (18 Test-Konfigurationen × 2 Formate + 4 Repetitions-Pendants), je File ~8.6k Zeilen × 73 Spalten

**Was ist drin**
- Entitäten: **1 Roboter (UR5, 6-DOF Cobot)** unter 18 stratifizierten Test-Konfigurationen
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
- Labels: **keine Failure-/RUL-Labels**. Degradation nur implizit über (a) Run-Index 1/2/3, (b) Coldstart vs. warm.
- Metadaten: Payload {16 lb, 45 lb}, Speed {fullspeed, halfspeed}, Coldstart-Flag, Run-Index — alles aus dem Dateinamen ableitbar; UR5-Datenblatt unter `datasheets/`.

**Was fehlt** *(gemessen am UNIFI-Idealbild)*
- Keine expliziten Run-to-Failure-Trajektorien — pro Konfiguration nur 3 Snapshots à ~69 s
- Keine RUL- oder Klassen-Labels wie PHM SCARA (`class_0..class_12`)
- Keine README/LICENSE/DOI im lokalen Snapshot
- Kein Wear-/Verschleiß-Indikator außer der externen `calculateddeviationofactualpositiontonominalposition.xlsx`-Tabelle (Integration unklar)

**Pros für UNIFI**
- **Echter Cobot (UR5)** — pitch-stark, beweist UCS-Mapping über SCARA-Topologie hinaus
- **6-DOF Joint-Telemetrie** mit semantisch klaren Feldnamen (Position/Velocity/Current/Torque/Temp pro Joint) — exzellent für LLM-Function-Call-Mapping
- **Stratifikation Payload × Speed × Coldstart** liefert eine implizite Wear-Achse, ohne dass wir Labels brauchen — passt zu „wir lernen Wear-Rate aus Telemetrie, nicht aus Labels"
- **Höhere Sampling-Rate** (125 Hz) als PHM SCARA → reichere Spektral-Features möglich
- **NIST-Branding** stärkt Glaubwürdigkeit im Pitch
- Lokal vorhanden, kein Download-Risiko

**Cons / Risiken**
- **Schema-Kontrast zu PHM SCARA schwächer als bei AI4I/Azure** — beides sind Joint-Strom-/-Position-Datensätze. Foreign-Kriterium aus `scope.md` („sichtbar andere Struktur") nur teilweise erfüllt
- Keine expliziten Failure-Labels — falls die Demo eine Failure-Annotation braucht, müsste sie aus Deviation-Metriken konstruiert werden
- Kurze Snapshots, keine Run-to-Failure-Geschichte
- Lizenz nicht explizit dokumentiert — NIST-Annahme plausibel, aber rechtlich offen
- 73 Spalten ohne Einheiten-Header in CSV (Einheiten nur in `ur5testresultheader.xlsx`) — Mapping-Skript muss diese Datei mitlesen

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `actual_current_J{1..6}` | `joint_currents` (Array) | Aggregation/Stack über Joints; Analog zu PHM `EPOSCurrent` |
| `actual_position_J{1..6}` | `joint_positions` | identity nach Stack; Analog zu `EPOSPosition` |
| `actual_velocity_J{1..6}` | `joint_velocities` | identity; Analog zu `EPOSVelocity` |
| `target_torque_J{1..6}` | `joint_torques` | identity (Nm) |
| `joint_temperature_J{1..6}` | `thermal_stress` | Max/Mean über Joints; Analog zu `FuseHeatSlope` (Slope statt Wert) |
| `tcp_force_{x,y,z}`, `tcp_torque_{x,y,z}` | `tcp_wrench` | Vector6 |
| `tcp_position_{x,y,z,rx,ry,rz}` | `tcp_pose` | identity |
| `ROBOT_TIME` | `time_s` | identity |
| Filename-Tag `payload{16\|45}lb` | `payload_kg` | 16 lb → 7.26 kg; 45 lb → 20.41 kg |
| Filename-Tag `{full\|half}speed` | `speed_factor` | 1.0 / 0.5 |
| Filename-Tag `coldstart` | `thermal_state` | enum: `cold` \| `warm` |
| Filename-Tag Run-Index | `run_index` | 1..3 — als implizite Degradations-Achse |

**Rolle-Kandidat:** foreign (Roboter-Komplement zu AI4I/Azure) — eignet sich besonders, um UCS-Schema-Mapping *innerhalb* der Robotik (UR5 6-DOF ↔ SCARA 4-DOF) zu demonstrieren, statt Mapping zu generisch-industriellen Schemata.
**Aufwand bis nutzbar:** ~1–2 h (CSV bereits flat-normalisiert, lokal vorhanden; Headerdatei muss eingelesen werden, Filename-Parser für Konfig-Tags ergänzen).
**Offene Fragen:**
- Lizenz formal verifizieren (NIST-Datenkatalog/DOI ermitteln)
- Soll UR5-NIST AI4I/Azure **ersetzen** oder **ergänzen**? Konzept-v2 priorisiert Schema-Kontrast — UR5-NIST liefert weniger Kontrast, dafür mehr Robotik-Glaubwürdigkeit. Entscheidung gehört in `decisions.md`.
- Wird die externe Deviation-Tabelle (`calculateddeviationofactualpositiontonominalposition.xlsx`) als Pseudo-Wear-Label genutzt oder ignoriert?

**Kriterien-Score** *(1 = schwach, 2 = ok, 3 = stark; bei tbd → `?`)*

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | NIST-Standard wahrscheinlich Public Domain, formal offen |
| RUL-Labels | 1 | keine — nur implizite Run-Index-Achse |
| Sensor-Felder | 3 | 73 sprechende Spalten, multi-modal (Position/Velocity/Current/Torque/Temp/Force) |
| Mapping-Distanz zu UCS | 2 | semantisch nah an PHM SCARA, kein scharfer Schema-Kontrast |
| Robotik-Nähe | 3 | echter UR5-Cobot |
| Größe/Handling | 2 | 406 MB, CSV — handhabbar, aber kein Trivialfall |
| UCS-Demo-Tauglichkeit | 2 | gut für „Robot-zu-Robot UCS-Mapping"-Story, schwächer für „industrieübergreifend funktioniert" |
| **Summe** | **?/21** | Lizenz-Score offen → endgültige Summe ausstehend |

---

### CASPER

- **Status:** prüfen — **Name verifizieren**
- **Quelle / Link:** tbd
- **Version / Stand:** tbd
- **Lizenz:** tbd
- **Format & Größe:** tbd

**Was ist drin**
- tbd

**Was fehlt**
- tbd

**Pros für UNIFI**
- tbd

**Cons / Risiken**
- Name ist uneindeutig (mehrere Projekte mit diesem Namen in PdM/Robotik-Space)
- Ohne Klärung der Identität keine Zeit investieren

**UCS-Mapping-Skizze**
- n/a bis Identität geklärt

**Rolle-Kandidat:** tbd
**Aufwand bis nutzbar:** tbd
**Offene Fragen:**
- Welches CASPER ist im Konzept-PDF gemeint?

**Kriterien-Score**
| Kriterium | Score | Kommentar |
|---|---|---|
| alle | ? | blockiert bis Identität geklärt |

---

### CWRU Bearing Data

- **Status:** prüfen
- **Quelle / Link:** tbd — Case Western Reserve University Bearing Data Center
- **Version / Stand:** etabliert seit ~2000, laufend referenziert
- **Lizenz:** tbd — akademisch offen
- **Format & Größe:** MATLAB-Files, hochfrequente Vibrationssignale (12 kHz / 48 kHz)

**Was ist drin**
- Entitäten: Lager unter verschiedenen Last- und Drehzahlkonditionen mit induzierten Fehlern (Innenring, Außenring, Wälzkörper)
- Zeit-/Zyklusachse: Sekundenbereich, sehr hohe Abtastrate
- Sensor-Felder: Vibration (mehrere Accelerometer-Positionen)
- Labels: Fehlertyp + Fehlergröße (Durchmesser der Beschädigung)
- Metadaten: Last, Drehzahl

**Was fehlt**
- Keine Run-to-Failure-Zeitreihen → RUL nicht direkt ableitbar (wäre durch Fehlergröße als Surrogat möglich)
- Sehr kurze Sequenzen → keine Degradations-Narrative über Zeit

**Pros für UNIFI**
- **Lager sitzen in jeder Roboter-Gelenkachse** — Narrative-Brücke zur Robotik deutlich kürzer als bei Turbinen
- Starker Klassifikations-Datensatz, wenn wir Fehlertyp-Erkennung statt RUL zeigen

**Cons / Risiken**
- Feature-Engineering auf Rohsignalen (FFT, Envelope) = Zeitkiller im Hackathon
- Kein kontinuierliches RUL → wir müssten das Konzept anpassen
- Als primary riskant, als foreign eventuell zu aufwändig

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| Accelerometer-Signal | `vibration_rms` | nach Feature-Extraction (Window + RMS) |
| Drehzahl | `rotation_rate` | identity |
| Last | `load` | identity |

**Rolle-Kandidat:** primary-Alternative (falls „echte Mechanik" im Pitch überwiegt)
**Aufwand bis nutzbar:** ~4–6h wegen Signal-Processing
**Offene Fragen:**
- Reicht Hackathon-Zeit für saubere Feature-Extraktion?
- IMS Bearings wäre für RUL besser geeignet — prüfen ob wir den direkt nehmen

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | |
| RUL-Labels | 1 | Fehlergröße als Surrogat, nicht direkt RUL |
| Sensor-Felder | 2 | nur Vibration, aber sauber |
| Mapping-Distanz zu UCS | 2 | nach Feature-Extraction ok |
| Robotik-Nähe | 3 | Lager = Robotergelenk |
| Größe/Handling | 2 | Rohsignale, hochfrequent |
| UCS-Demo-Tauglichkeit | 2 | eher als Single-Story tauglich |
| **Summe** | **?/21** | |

---

### IMS Bearing Dataset

- **Status:** prüfen
- **Quelle / Link:** tbd — NASA PCoE (Intelligent Maintenance Systems Center, University of Cincinnati)
- **Version / Stand:** 2006, Standardreferenz
- **Lizenz:** tbd — NASA PCoE public
- **Format & Größe:** mehrere GB Vibrationssignale aus drei Run-to-Failure-Experimenten

**Was ist drin**
- Entitäten: vier Lager pro Experiment, Vibration parallel gemessen
- Zeit-/Zyklusachse: kontinuierlich über Tage bis zum Ausfall
- Sensor-Felder: Vibration (Beschleunigung)
- Labels: impliziter RUL (Zeit bis Ausfall-Event am Ende), Fehlertyp post-hoc

**Was fehlt**
- Keine Zyklen-/Pick-Semantik
- Keine Lastvariation innerhalb eines Runs (konstante Bedingungen)

**Pros für UNIFI**
- **Run-to-Failure** → sauberes implizites RUL ableitbar
- Lager = Roboter-Kopplung (wie CWRU)
- Etabliertes PHM-Benchmark

**Cons / Risiken**
- GB-Scale erfordert Sub-Sampling für Hackathon-Tempo
- Rohes Vibrationssignal → Feature-Engineering-Zeit

**UCS-Mapping-Skizze**
- wie CWRU — identisch nach Feature-Extraction

**Rolle-Kandidat:** primary-Alternative (robuster als CWRU für RUL)
**Aufwand bis nutzbar:** ~4–5h
**Offene Fragen:**
- Genaue Größe nach Sub-Sampling?
- Welche Feature-Pipeline ist etabliert genug, um sie copy-pasten zu können?

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | |
| RUL-Labels | 2 | implizit, ableitbar |
| Sensor-Felder | 2 | nur Vibration |
| Mapping-Distanz zu UCS | 2 | |
| Robotik-Nähe | 3 | Lager = Robotergelenk |
| Größe/Handling | 1 | GB-Scale, Sub-Sampling nötig |
| UCS-Demo-Tauglichkeit | 2 | |
| **Summe** | **?/21** | |

---

### MIMII (Malfunctioning Industrial Machine Investigation)

- **Status:** prüfen (spekulativ)
- **Quelle / Link:** tbd — Hitachi / Zenodo
- **Lizenz:** tbd — üblicherweise CC-BY
- **Format & Größe:** WAV-Audio, mehrere GB

**Was ist drin**
- Entitäten: Pumps, Fans, Sliders, Valves (je mehrere Instanzen)
- Sensor-Felder: 8-Kanal-Audio
- Labels: normal vs. anomal
- Keine RUL, keine Zeitreihen-Degradation

**Was fehlt**
- Alles, was für einen PHM-Flow nötig wäre — RUL, Degradationsverlauf, Zyklen

**Pros für UNIFI**
- Audio → maximal andersartig zu Tabular, wäre starker UCS-Demo-Moment („mapping klappt *sogar* über Modalitäten hinweg")

**Cons / Risiken**
- Für Modell-Pipeline unbrauchbar ohne Audio-Feature-Pipeline
- Lenkt vom Robotik-Narrativ ab (Pumps, nicht Roboter)
- Hackathon-Zeit reicht nicht für Audio-Features

**UCS-Mapping-Skizze**
- nur für Demo-Theater: Audio → Spectral-Features → UCS `vibration_rms` (Stretched Analogy)

**Rolle-Kandidat:** foreign-Alternative — nur wenn wir sehr provokant sein wollen
**Aufwand bis nutzbar:** ~6h+
**Offene Fragen:**
- Rechtfertigt der Wow-Moment den Zeitaufwand?

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | |
| RUL-Labels | 1 | nicht vorhanden |
| Sensor-Felder | 1 | Audio → für Tabular-Pipeline ungeeignet |
| Mapping-Distanz zu UCS | 3 | maximal — eben weil das der Punkt wäre |
| Robotik-Nähe | 1 | Pumps, nicht Roboter |
| Größe/Handling | 1 | GB-Scale |
| UCS-Demo-Tauglichkeit | 2 | Show-Effekt hoch, Aufwand höher |
| **Summe** | **?/21** | |

---

### NASA PHM Data Repository (Sammelpointer)

- **Status:** seed
- **Quelle / Link:** tbd — NASA Prognostics Center of Excellence
- Kommentar: Sammlung mehrerer Datensätze (C-MAPSS, Battery, Bearings, Li-ion, IGBT, ...). Hier nicht als eigener Kandidat evaluieren — interessante Einzelsets in diese Datei als H3-Block aufnehmen, sobald identifiziert.

---

### Kaggle Predictive Maintenance (Sammelpointer)

- **Status:** seed
- Kommentar: Kaggle-Suchergebnisse stark variierende Qualität. Vor Aufnahme als eigener Kandidat muss der konkrete Datensatz benannt werden. Typische Einträge: „Microsoft Azure PdM", „AI4I 2020" (beide oben), „Machine Predictive Maintenance Classification" (bitte spezifizieren).

---

### UR-/ROS-Community-Logs (Sammelpointer)

- **Status:** seed
- Kommentar: Vielversprechende Nähe zu echter Robotik, aber Lizenzlage meist unklar (Uni-Repositorien, persönliche GitHub-Accounts). Jeder Fund muss einzeln mit Lizenz-Check aufgenommen werden.

---

---

## Runde 1 — Discovery-Funde (2026-04-24)

Neue Seed-Einträge aus der parallelen Discovery-Runde (4 Explore-Cluster). Format ist bewusst **leichter** als das volle Evaluation-Template in `scope.md` — diese Einträge werden in Runde 2 auf das volle Template hochgezogen, wenn sie in die Shortlist kommen. Sortierung innerhalb der Sektion: nach Robotik-Priorität 1 → 4.

### PHM Society 2021 Europe Data Challenge — SCARA-Roboter (CSEM)

*Status nach lokaler Inspektion am 2026-04-24 — hochgezogen auf vollen Evaluation-Block.*

- **Status:** **shortlist — primary-Top**
- **Quelle / Link:** https://data.phmsociety.org/2021-phm-conference-data-challenge-europe/ · lokal in `data/phm-society-2021/`
- **Version / Stand:** PHM Europe 2021 Challenge (4 Release-Batches: `training1`, `training2`, `test`, `release2`)
- **Lizenz:** tbd — PHM-Society-Challenge-Daten typischerweise public; formal prüfen vor Repo-Commit
- **Format & Größe:** CSV pro Run · 51 Sensor-Felder × 361 Zeitfenster · ~1 MB/Run · insgesamt ~170 Files (dominant class_0 gesund, 30+ in Fehlerklassen)

**Was ist drin**
- Entitäten: einzelne SCARA-Roboter-Runs bei CSEM Sicherungs-Montage. Jeder Run = ein File
- Zeit-/Zyklusachse: **361 Zeitfenster pro Run** (je ~7,5 s → ~45 min Run-Zeit); innerhalb jedes Fensters sind Sensor-Reads bereits zu Statistiken aggregiert
- Sensor-Felder (51 Stück, alle Roboter-semantisch): `EPOSCurrent/Position/Velocity`, `SmartMotorSpeed`, `SmartMotorPositionError`, `DurationPickToPick`, `DurationRobotFromFeederToTestBench/FromTestBenchToFeeder`, `FuseCycleDuration`, `FuseHeatSlope(/OK/NOK)`, `FuseTestResult`, `FusePicked`, `FuseIntoFeeder`, `Vacuum`, `VacuumFusePicked`, `VacuumValveClosed`, `Pressure`, `Humidity`, `CpuTemperature`, `Temperature`, `TemperatureThermoCam`, `NumberFuseDetected/Estimated`, `SharpnessImage`, `IntensityTotalImage`, `IntensityTotalThermoImage`, `LightBarrier*` (mehrere), `ProcessCpuLoadNormalized`, `TotalMemoryConsumption`, `FeederAction1-4`, `ErrorFrame`, `ValidFrame`, weitere
- Pro Fenster-Tuple bis zu 7 Stats: `vCnt`, `vFreq`, `vMax`, `vMin`, `vStd`, `vTrend`, `value` (exakter Stat-Satz je Feld siehe `fields.csv` in jedem Ordner)
- Labels: **Fehlerklassen pro Run** — class_0 = gesund, class_2/3/4/5/7/9/11/12 = unterschiedliche Fehlertypen
- Metadaten: implizit via Challenge-Dokumentation (Roboter-Modell, Umgebung — muss aus PHM-Paper nachgezogen werden)

**Was fehlt** *(gemessen am UNIFI-Idealbild)*
- Keine absoluten Timestamps, nur Fenster-Index
- **Kein kontinuierliches RUL** — nur Fehlerklassen-Labels; RUL muss abgeleitet oder synthetisch konstruiert werden
- Keine einzelne Run-to-Failure-Trajektorie (jeder File = fixierter Zustand). Degradations-Kurve muss durch Stacken von Runs über Zeit simuliert werden
- Keine Finanz-Kontextdaten (Kosten, Wartung) — wird synthetisiert

**Pros für UNIFI**
- **Einziger echter Industrieroboter-Datensatz in der gesamten Discovery** — massiver Pitch-Vorteil gegenüber Turbinen/Lagern
- Zyklus-Semantik direkt eingebaut (`DurationPickToPick`) — das „1 Zyklus = 1 Pick"-Framing aus dem Konzept-PDF funktioniert 1:1
- Pre-aggregierte Fenster-Statistiken sparen Feature-Engineering-Zeit
- Sensor-Felder sind semantisch klar und roboter-typisch — die CFO-View kann echte Roboter-Labels zeigen (`EPOSCurrent`, `VacuumFusePicked`, etc.)
- Classes 2–12 liefern mehrere Failure-Modes → Deal-Desk-Agent und Bank-View-Drilldown bekommen Material
- Bereits lokal vorhanden — kein Download/Lizenz-Blocker mehr

**Cons / Risiken**
- RUL-Labeling-Strategie ist offen: entweder binär (gesund vs. Fehlerklasse), pseudo-RUL via Stacking („gesund für 20 min, dann Fehler") oder Klassifikation statt Regression. Braucht Hackathon-Pragmatismus
- Stark unbalancierte Klassenverteilung (class_0 dominant) — für Klassifikations-Baseline tricky, für Regression egal
- Fenster-Aggregate statt Rohsignale — Feature-Importance „Vibrationspeak bei Zyklus 142" aus dem Konzept-PDF nicht 1:1 replizierbar (stattdessen „Fenster-Max bei Fenster 142")
- Classes-Semantik (was bedeutet class_3 vs. class_7?) muss aus dem Challenge-Paper nachgelesen werden — sonst bleibt der Pitch-Drilldown handwavy

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `DurationPickToPick[value]` | `pick_duration_s` | identity |
| `(window index)` | `cycle_index` | identity |
| `EPOSCurrent[value]` | `motor_current_a` | ggf. Einheit prüfen |
| `EPOSPosition`, `EPOSVelocity` | `motor_position`, `motor_velocity` | identity |
| `FuseCycleDuration[value]` | `cycle_duration_s` | identity |
| `FuseHeatSlope[value]` | `process_quality_metric` | identity |
| `Vacuum[value]` | `vacuum_pressure` | identity |
| `Pressure[value]` | `pressure` | identity |
| `CpuTemperature[value]`, `Temperature[value]` | `temperature_delta` | Differenz |
| `(file class label)` | `health_class` / abgeleitetes `rul` | Labeling-Strategie noch offen |

**Rolle-Kandidat:** **primary**
**Aufwand bis nutzbar:** ~2h (Parser für eingebettete Listen + RUL-Labeling-Strategie festlegen + Baseline LightGBM trainieren)
**Offene Fragen:**
- Welche RUL-Labeling-Strategie? (Vorschlag: binär gesund vs. degradiert als MVP, später Klassifikation pro Fehlertyp)
- Wie werden die Fehlerklassen 2, 3, 4, 5, 7, 9, 11, 12 im Challenge-Paper semantisch differenziert?
- Lizenz formal verifizieren bevor Repo-Commit

**Kriterien-Score**

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | PHM-Society-public angenommen, formal zu bestätigen |
| RUL-Labels | 2 | keine kontinuierlichen, aber Klassen-Labels ableitbar |
| Sensor-Felder | 3 | 51 Felder, alle roboter-semantisch |
| Mapping-Distanz zu UCS | 3 | semantische Feldnamen direkt übernehmbar |
| Robotik-Nähe | 3 | echter Industrie-SCARA, einziger in Discovery |
| Größe/Handling | 3 | vorvermaggregiert, ~170 Files × 1 MB |
| UCS-Demo-Tauglichkeit | 3 | klare Feldnamen, perfekt als „ehrlicher" primary gegenüber anonymer Foreign-Quelle |
| **Summe** | **~20/21** *(pending Lizenz)* | Top-Kandidat |

---

### Kitting Anomaly Dataset (Baxter)

- **Link:** https://github.com/birlrobotics/kitting_anomaly_dataset
- **Lizenz (erster Blick):** BSD 3-Clause
- **Was:** 538 ROS-Bags realer Baxter-Roboter-Anomalien während Kitting-Aufgaben. Multisensorale PHM-Daten mit Force-Torque, Taktil, End-Effector-State.
- **Sensor-Felder:** Endpoint-State (Pose, Twist, Wrench), Robotiq FT 180 (6-axis F/T), Tactile (Accelerometer, Gyro, Magnetometer)
- **RUL-Labels?:** binär-Failure (Anomalie-Klassifikation mit Timestamps)
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** Echter Roboter (Rethink Baxter) mit echten Manipulations-Anomalien, zeitgestempelt, Multi-Sensor.
- **Weiterverfolgen als:** **primary** (Top-Priorität für Runde 2)
- **Offene Fragen:** Trainingsbereit oder ROS-Konvertierung nötig? Wie vielfältig sind die Anomalie-Klassen?

---

### Comprehensive Dynamic Stability Dataset (ABB / FANUC / KUKA / UR5)

- **Link:** https://ieee-dataport.org/documents/comprehensive-dynamic-stability-dataset-industrial-robotic-manipulators-abb-fanuc-kuka
- **Lizenz (erster Blick):** unklar (IEEE-DataPort-Richtlinien prüfen)
- **Was:** Kinematische, dynamische und strukturelle Parameter von vier großen Industrieroboter-Produktlinien. Dual-Target: Stability-Score-Regression + Low/Medium/High-Klassifikation.
- **Sensor-Felder:** Link-Längen, Link-Massen, Joint-Steifigkeit, Dämpfung, aufgebrachte Kraft, strukturelle Durchbiegung
- **RUL-Labels?:** nein direkt (Stability-Score als Degradations-Proxy denkbar)
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** Vier Hersteller auf einmal — narrative-Geschenk für Mechanik-Profile und den Fleet-Gedanken in Bank-View.
- **Weiterverfolgen als:** primary-Kandidat **oder** Quelle für `mechanics.md`-Profile
- **Offene Fragen:** Zeitreihen oder statische Parameter? Wie groß ist die Samplezahl pro Manipulator?

---

### IBM IoT Predictive Analytics (Robot Arm Demo)

- **Link:** https://github.com/IBM/iot-predictive-analytics
- **Lizenz (erster Blick):** unklar (IBM-GitHub)
- **Was:** End-to-End Predictive-Maintenance-Demo für Roboter-Arm-Fertigung. Python-Notebook mit `iot_sensor_dataset.csv` und Logistic-Regression-Baseline.
- **Sensor-Felder:** Gelenk-/Aktuator-/Kontrollsignale (Details im Repo)
- **RUL-Labels?:** binär-Failure (Fehler/kein Fehler)
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** Einziger Industrie-Demo-Datensatz, der explizit Roboter-Arm als Use Case nennt.
- **Weiterverfolgen als:** primary-Kandidat
- **Offene Fragen:** Datensatzgröße? Real-world oder synthetisch? Welcher Roboter-Typ genau?

---

### Handover Failure Detection Dataset

- **Link:** https://zenodo.org/records/10708763
- **Lizenz (erster Blick):** vermutlich CC-BY (Zenodo-typisch), verifizieren
- **Was:** Multi-Modal-Daten (RGB, Depth, Force/Torque, Kinematik) von Robot-to-Human und Human-to-Robot Handovers mit Fehlerannotationen (Drops, Misalignments).
- **Sensor-Felder:** Kamera (RGB+Depth), 6-Achsen-Force/Torque, Joint-Positionen und -Velocities
- **RUL-Labels?:** nein (binär Erfolg/Fehler pro Handover-Event)
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** Echte Roboter-Manipulation inkl. Force/Torque-Stream und klaren Fehler-Events.
- **Weiterverfolgen als:** Backup (Fokus auf Interaktionen, nicht Degradation)
- **Offene Fragen:** Kontinuierliche Zeitreihen pro Event oder nur diskrete Labels? Welche Roboterarme?

---

### ViFailback Dataset

- **Link:** https://huggingface.co/datasets/sii-rhos-ai/ViFailback-Dataset
- **Lizenz (erster Blick):** MIT
- **Was:** 5.202 Trajektorien, 58.128 VQA-Paare. Vision-Language-Action-Daten für Robot-Manipulation-Failure-Reasoning (CVPR-2026-Submission).
- **Sensor-Felder:** RGB-Video, Action-Sequenzen, sprachliche Fehlerbeschreibungen
- **RUL-Labels?:** Failure-Klassifizierung mit visueller Diagnose, kein kontinuierliches RUL
- **Robotik-Nähe:** 1 (Real-World, mehrere Roboter)
- **Grund für Einstufung:** Moderner Real-World-Roboter-Fehlerdatensatz — aber Vision-first, nicht Telemetrie.
- **Weiterverfolgen als:** Video-Backup (nur wenn Pivot auf Vision-Pipeline)
- **Offene Fragen:** Sind zusätzliche Sensor-Streams (Kraft, Strom) abrufbar? Welche Roboter-Plattformen?

---

### RoboFAC Dataset

- **Link:** https://huggingface.co/datasets/MINT-SJTU/RoboFAC-dataset
- **Lizenz (erster Blick):** unklar
- **Was:** 10.000+ Manipulationsvideos, 78.623 VQA-Paare für Fine-Grained Failure Modes. Hybrid Real/Sim.
- **Sensor-Felder:** Video, Kinematik, sprachliche Fehleranalyse
- **RUL-Labels?:** Failure-Klassifizierung mit Fehlerursachen-Reasoning
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** Komplementär zu ViFailback. Ähnliche Einschränkung: Video-first.
- **Weiterverfolgen als:** Video-Backup
- **Offene Fragen:** Kontinuierliche Sensordaten (Torque, Current) vorhanden? Welche Roboter?

---

### Humanoid Everyday

- **Link:** https://arxiv.org/abs/2510.08807 *(Project-Page evtl. https://humanoid-everyday.github.io/)*
- **Lizenz (erster Blick):** unklar (akademisch)
- **Was:** 10,3k Trajektorien, 3M+ Frames über 260 Tasks. Humanoid-Roboter, multimodal (RGB, Depth, LiDAR, taktil, Joint-States).
- **Sensor-Felder:** RGB, Depth, LiDAR, Tactile, Joint Angles + Velocities
- **RUL-Labels?:** nein (Task-Success/Failure)
- **Robotik-Nähe:** 1
- **Grund für Einstufung:** State-of-the-Art Humanoid-Telemetrie, aber Fokus ist Bewegungs-Kontrolle, nicht PHM.
- **Weiterverfolgen als:** Video-Backup
- **Offene Fragen:** Task-Failure als RUL-Proxy nutzbar? Herunterladbar oder Cloud-only?

---

### Robo-Mani-Failure-Data (Curated Registry)

- **Link:** https://github.com/x1nyuzhou/Robo-Mani-Failure-Data
- **Lizenz (erster Blick):** MIT (Registry-Repo)
- **Was:** Meta-Index zu 13+ Datensätzen zu Roboter-Manipulationsfehlern 2021–2026 (enthält ViFailback, RoboFAC, ARMBench, I-FailSense, Sentinel, …).
- **Sensor-Felder:** variabel je verlinkter Datensatz
- **RUL-Labels?:** variabel
- **Robotik-Nähe:** 1 (Meta)
- **Grund für Einstufung:** Nützliche Übersichtsquelle, um weitere Datensätze zu extrahieren.
- **Weiterverfolgen als:** Meta-Index (nicht selbst Datensatz)
- **Offene Fragen:** Welcher Eintrag hat kontinuierliche Telemetrie statt nur diskrete Labels?

---

### ARMBench (Anomaly Recognition for Manipulation)

- **Link:** https://www.armbench.com/data.html
- **Lizenz (erster Blick):** unklar (proprietär-akademisch)
- **Was:** 19.000+ Anomalie-Bilder und 4.000+ Videos aus Amazon-Lager-/Logistik-Szenen. RGB, Depth, Monitoring-Video.
- **Sensor-Felder:** RGB, Depth, Monitoring-Video
- **RUL-Labels?:** binär-Failure (Anomalie ja/nein)
- **Robotik-Nähe:** 2 (industrieller Roboterkontext, aber Vision-first)
- **Grund für Einstufung:** Real-World-Industrie-Logistik mit Anomalien — passt thematisch zum Pick-Narrative.
- **Weiterverfolgen als:** foreign-Kandidat (Vision-Pfad) oder Pitch-Beispiel
- **Offene Fragen:** Zusätzliche Sensordaten (Force/Current) verfügbar?

---

### I-FailSense

- **Link:** https://huggingface.co/collections/ACIDE/failsense-datasets-and-benchmarks
- **Lizenz (erster Blick):** unklar
- **Was:** ICRA-2026-Benchmark für semantische Fehlererkennung. 34 CALVIN-Sim-Tasks + Transfer auf 79 RLBench-Tasks. Visual + Language.
- **Sensor-Felder:** Visual Sequences, Language Labels
- **RUL-Labels?:** Failure-Klassifizierung (Misalignment Detection)
- **Robotik-Nähe:** 2 (Sim+Real-Hybrid)
- **Grund für Einstufung:** Frisch, aber Simulation-heavy und Vision-first — weniger Rohtelemetrie.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Sind CALVIN/RLBench-Sensorspuren mit echten Robotern verfügbar?

---

### EJUST-PdM-1 (Video-basierte Predictive Maintenance)

- **Link:** https://ieee-dataport.org/documents/ejust-pdm-1
- **Lizenz (erster Blick):** unklar
- **Was:** Video-basierte Fehlerklassifikation mit Motion-Magnification, Optical Flow und 3D-CNN — Non-Contact-Monitoring.
- **Sensor-Felder:** Video (RGB oder Thermal), abgeleitete Motion-/Structure-Features
- **RUL-Labels?:** binär-Failure / Multi-Klasse
- **Robotik-Nähe:** 2
- **Grund für Einstufung:** Neuartige Non-Contact-Sensorik; relevant für UCS als visuelle Branch.
- **Weiterverfolgen als:** Backup / UCS-Experiment
- **Offene Fragen:** Welche Maschinen abgedeckt? Auflösung/Framerate?

---

### Lenze Motor Bearing Fault Dataset

- **Link:** https://zenodo.org/records/14762423
- **Lizenz (erster Blick):** unklar (Zenodo, vermutlich CC-BY)
- **Was:** Moderner (2024er) Servomotor-Lagerfehler-Datensatz — Vibrations-basierte Fehlererkennung an Lenze-Motoren (OEM-Komponente in Roboterarmen).
- **Sensor-Felder:** Vibration (vermutlich mehrachsig), ggf. Temperatur/Strom
- **RUL-Labels?:** binär-Failure (ggf. Degradations-Proxy aus Vibrations-Trend)
- **Robotik-Nähe:** 2 (Servomotor = Roboter-Aktuator-Kern)
- **Grund für Einstufung:** Rare Direkt-Servomotor-Daten, aktuell, lagerfokussiert.
- **Weiterverfolgen als:** primary-Kandidat
- **Offene Fragen:** Wie viele Bearing-Exemplare? Beschleunigte Degradation oder Feldaten?

---

### PyScrew — Industrial Screw Driving Dataset

- **Link:** https://zenodo.org/records/16031381
- **Lizenz (erster Blick):** unklar (Zenodo, vermutlich CC-BY)
- **Was:** 34.000+ Schraubvorgänge über 6 Szenarien (Montage, Demontage, fehlerhafte Positionen). Process-Telemetrie: Torque, Kraft, Vibration.
- **Sensor-Felder:** Torque, Force, Vibration, möglicherweise Motorstrom
- **RUL-Labels?:** binär-Failure pro Schraubvorgang; kontinuierliche Kraft/Torque-Metriken
- **Robotik-Nähe:** 2 (End-Effector-Task in Montage/Logistik)
- **Grund für Einstufung:** Prozessdaten passen 1:1 zum „Cost-per-Pick"-Narrativ; groß genug für Training.
- **Weiterverfolgen als:** primary-Kandidat
- **Offene Fragen:** Welche Montage-Anwendungen? Kontinuierliche Qualitätsmetriken vorhanden?

---

### NASA Li-ion Battery Aging Dataset

- **Link:** https://data.nasa.gov/dataset/li-ion-battery-aging-datasets
- **Lizenz (erster Blick):** Public Domain (NASA Ames PCoE)
- **Was:** Lithium-Ionen-Zellen über 3 Betriebsprofile (Laden, Entladen, EIS), verschiedene Temperaturen. EOL = 30 % Kapazitätsverlust.
- **Sensor-Felder:** Voltage_measured, Current_measured, Temperature_measured, Capacity
- **RUL-Labels?:** ja kontinuierlich (Restkapazität über Zyklen)
- **Robotik-Nähe:** 2 (mobile Roboter sind batteriebetrieben)
- **Grund für Einstufung:** Sauberes RUL, gut verstandene Domäne. Eigene Narrative-Spur: „Batterie-SoH als Teil des Robot Credit Score".
- **Weiterverfolgen als:** primary-Kandidat für mobile-Roboter-Framing **oder** Zusatzmodul neben anderem primary
- **Offene Fragen:** Sampling-Frequenz (kontinuierlich vs. pro Zyklus)? Temperaturbereich?

---

### NASA IGBT Accelerated Aging Dataset

- **Link:** https://data.nasa.gov/dataset/igbt-accelerated-aging-data-set
- **Lizenz (erster Blick):** Public Domain (NASA PCoE)
- **Was:** Halbleiter-Alterung unter thermischem Overstress. IGBT ist Herzstück jedes Servomotor-Power-Stages.
- **Sensor-Felder:** V_ds, V_ge, Temperature, Cycle_Count
- **RUL-Labels?:** ja kontinuierlich (Leistungsverschlechterung bis Ausfall)
- **Robotik-Nähe:** 2 (indirekt: Servo-Drive-Lebensdauer)
- **Grund für Einstufung:** Seltener Power-Electronics-Datensatz mit RUL — als Baustein für Robot-Credit-Score plausibel.
- **Weiterverfolgen als:** prüfen
- **Offene Fragen:** Stressprotokoll thermisch-zyklisch oder statisch? Ausfallkriterium?

---

### Edge-AI Sensor Dataset (Smart Manufacturing)

- **Link:** https://ieee-dataport.org/documents/edge-ai-sensor-dataset-real-time-fault-prediction-smart-manufacturing
- **Lizenz (erster Blick):** unklar
- **Was:** Multi-Sensor-Daten aus einer (möglicherweise simulierten) Fabrikumgebung. Vibration, Temperatur, Feuchte, Druck + PLC-Events.
- **Sensor-Felder:** Vibration, Temperatur, Feuchte, Druck, digitale PLC-Events
- **RUL-Labels?:** binär-Failure + Warnstufen
- **Robotik-Nähe:** 2–3
- **Grund für Einstufung:** IIoT-realistisch und multimodal — brauchbarer foreign-Kandidat.
- **Weiterverfolgen als:** foreign-Kandidat
- **Offene Fragen:** Echt oder simuliert? Umfang?

---

### XJTU-SY Rolling Bearing Accelerated Life Test

- **Link:** https://github.com/WangBiaoXJTU/xjtu-sy-bearing-datasets
- **Lizenz (erster Blick):** Public (GitHub, XJTU + Sumyoung Tech)
- **Was:** 15 Lager-Run-to-Failure über 3 Betriebszustände. 25.6 kHz Sampling, CSV (horizontal + vertikal Vibration).
- **Sensor-Felder:** Vibration (X, Y), Betriebszustand konstant pro Test
- **RUL-Labels?:** ja kontinuierlich (Run-to-Failure)
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Klare Alternative zu IMS/CWRU mit höherer Sampling-Rate, 3 Betriebszustände ≈ variable Roboter-Lasten.
- **Weiterverfolgen als:** primary-Kandidat (Robuster-Lager-Track)
- **Offene Fragen:** Ausfallkriterium (ISO 20816 oder proprietär)? Lager-Geometrie-Unterschiede zu FEMTO/IMS?

---

### NASA Milling Dataset

- **Link:** https://data.nasa.gov/dataset/milling-dataset
- **Lizenz (erster Blick):** Public Domain (NASA)
- **Was:** CNC-Werkzeugverschleiß unter variabler Belastung. Dynamometer + Vibration + Acoustic Emission + Temperatur.
- **Sensor-Felder:** Force (3-Achsen Dynamometer), Vibration, Acoustic Emission, Temperatur
- **RUL-Labels?:** ja kontinuierlich (VB bis 0,30 mm)
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Tool-Wear als Verschleiß-Analogie für Gelenk-Verschleiß; Multi-Modal-Sensorik.
- **Weiterverfolgen als:** foreign-Kandidat
- **Offene Fragen:** Dynamometer-Kalibrierung dokumentiert? AE-Sensor-Frequenzgang?

---

### PHM 2009 Gearbox Challenge Dataset

- **Link:** https://c3.ndc.nasa.gov/dashlink/resources/997/
- **Lizenz (erster Blick):** Public (NASA DASHlink)
- **Was:** Getriebefehler-Datensatz mit Vibrationssensoren; induzierte Spalls & Risse.
- **Sensor-Felder:** Vibration (mehrere Positionen)
- **RUL-Labels?:** binär/Multi-Klasse (normal vs. Spall vs. Riss)
- **Robotik-Nähe:** 3 (Getriebe = Roboter-Reducer-Kern)
- **Grund für Einstufung:** Getriebe-Fehler-Signaturen sehr roboter-nah — aber nur Klassen, kein kontinuierliches RUL.
- **Weiterverfolgen als:** foreign-Kandidat (Fault-Klassifikation)
- **Offene Fragen:** Spall-Initiierung zeitlich dokumentiert? Multi-Sensor oder nur Vibration?

---

### Rotating Electromechanical System Dataset for Condition Monitoring

- **Link:** https://www.nature.com/articles/s41597-026-07224-0 *(Zenodo-Mirror im Paper)*
- **Lizenz (erster Blick):** vermutlich CC-BY (Nature Scientific Data)
- **Was:** Multimodale Sensoren (Beschleunigungsmesser, Strom, Temperatur) auf rotierendem elektromechanischem System unter systematisch induzierten Fehlern (Unwucht, Fehlausrichtung, Lagerschäden).
- **Sensor-Felder:** Vibration (3-Achsen), Motorstrom, Temperatur
- **RUL-Labels?:** kontinuierlich (via Fehler-Schweregrad)
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Kontrollierte Benchmarks mit bekanntem Fehlerverlauf. Multimodal-Narrative gut.
- **Weiterverfolgen als:** beides möglich
- **Offene Fragen:** Kontinuierliche Zeitreihen oder Aggregat-Features? Größe?

---

### MetroPT2 / MetroPT (Metro-Kompressor PdM)

- **Link (MetroPT2):** https://zenodo.org/records/7766691
- **Link (MetroPT v1):** https://zenodo.org/records/6854240
- **Lizenz (erster Blick):** CC-BY
- **Was:** Multivariate Sensordaten einer Metro-Kompressor-Anlage (Porto, 2022). Ungekennzeichnet, aber mit Fehlerberichten der Betreiberin — RUL ableitbar.
- **Sensor-Felder:** Druck (mehrere), Temperatur, Stromverbrauch, Kontrollsignale, digitale Signale, GPS
- **RUL-Labels?:** nein kontinuierlich (ableitbar aus Fehlerberichten)
- **Robotik-Nähe:** 3 (nicht Roboter, aber Kompressor ≈ industrielle Rotationsmechanik)
- **Grund für Einstufung:** Echte Feldaten, Nature-publiziert, stabiler Zenodo-Repo.
- **Weiterverfolgen als:** foreign-Kandidat
- **Offene Fragen:** Wie werden Fehlerberichte auf RUL gemappt? Anomalie-Label-Umfang?

---

### COMFAULDA (Composed Fault Dataset)

- **Link:** https://ieee-dataport.org/documents/composed-fault-dataset-comfaulda
- **Lizenz (erster Blick):** unklar
- **Was:** Vibrationssignale rotierender Maschinen mit einfachen und kombinierten Fehlern in mehreren Schweregraden.
- **Sensor-Felder:** Vibration (1D oder mehrachsig)
- **RUL-Labels?:** diskrete Klassen + Schweregrad
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Realistische Fehlerkombinationen — brauchbar als Multi-Label-Fault-Demo.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Anzahl Kombinationen? Transitionsphasen dokumentiert?

---

### Vibration Signal Datasets for Bearing Fault Diagnosis (CWRU-Refinement, IEEE DataPort)

- **Link:** https://ieee-dataport.org/documents/vibration-signal-datasets-bearing-fault-diagnosis-and-out-distribution-detection
- **Lizenz (erster Blick):** unklar
- **Was:** CWRU-basiert erweitert um Out-of-Distribution-Detection-Splits.
- **Sensor-Felder:** Vibration (1D oder mehrachsig), Fehler-Schweregrade
- **RUL-Labels?:** multi-klasse Fehlertyp + Schweregrad
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Refinement von CWRU mit zusätzlichen Splits. Wert für uns begrenzt.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Was unterscheidet den Datensatz vom Original-CWRU konkret?

---

### SUBF v1.0 Bearing Fault Vibration Data

- **Link:** https://www.kaggle.com/datasets/sumairaziz/subf-v1-0-dataset-bearing-fault-vibration-data
- **Lizenz (erster Blick):** unklar
- **Was:** Laboraufnahmen von Lagervibrations-Signalen (normal, innerer/äußerer Ring).
- **Sensor-Felder:** Vibrations-Zeitreihen (1D)
- **RUL-Labels?:** binär-Failure (Zustandsklassen)
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Klein und sauber, aber kein RUL.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Sampling-Rate? Wie viele Lager?

---

### Machine Failure Prediction Using Sensor Data (Kaggle, umerrtx)

- **Link:** https://www.kaggle.com/datasets/umerrtx/machine-failure-prediction-using-sensor-data
- **Lizenz (erster Blick):** unklar (Kaggle-eigene Nutzungsbedingungen)
- **Was:** Industrielle Sensor-Telemetrie (Strom, Temperatur, Vibration) mit Binär-Failure.
- **Sensor-Felder:** Strom, Temperatur, Vibration, weitere Prozessparameter
- **RUL-Labels?:** binär-Failure
- **Robotik-Nähe:** 3
- **Grund für Einstufung:** Generisch — ähnelt AI4I 2020 strukturell.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Welche Maschinen-Typen? Zeitreihen-Struktur?

---

### N-CMAPSS (NASA New C-MAPSS)

- **Link:** https://data.nasa.gov/dataset/c-mapss-aircraft-engine-simulator-data
- **Lizenz (erster Blick):** Public Domain (NASA)
- **Was:** Verbesserte C-MAPSS-Variante mit bis zu 8 Subsets, Größenordnung Millionen Instanzen, 47 Features.
- **Sensor-Felder:** 47 Spalten (Sensoren + Betriebsparameter)
- **RUL-Labels?:** ja kontinuierlich
- **Robotik-Nähe:** 4
- **Grund für Einstufung:** Größere Scale als C-MAPSS, aber weiterhin Turbofan.
- **Weiterverfolgen als:** Backup (falls mehr Daten als bei FD001–FD004 benötigt)
- **Offene Fragen:** Subset-Semantik? Feature-Namen?

---

### CARE Wind Turbine SCADA

- **Link:** https://zenodo.org/records/10958775
- **Lizenz (erster Blick):** CC-BY
- **Was:** 89 Turbinenjahre SCADA über 36 Anlagen auf 3 Windfarmen, 44 gelabelte Fehler-Vorlauf-Fenster + 51 Normalbetrieb-Zeitreihen.
- **Sensor-Felder:** SCADA (Power, Speed, Torque, Temperatur), je Farm variabel
- **RUL-Labels?:** ja kontinuierlich (Zeit-bis-Fehler-Fenster)
- **Robotik-Nähe:** 4
- **Grund für Einstufung:** Lange Feldaten, hochwertig — als foreign-Datensatz für Pitch-Showcase stark („gleiche Pipeline skaliert auf ganz andere Industrie").
- **Weiterverfolgen als:** foreign-Kandidat
- **Offene Fragen:** Sampling-Rate (Minuten/Stunden)? Feature-Normalisierung über Turbinen?

---

### MIMII DUE (MIMII Domain-Updated)

- **Link:** https://zenodo.org/records/4740355
- **Lizenz (erster Blick):** CC-BY / CC0
- **Was:** Erweitertes MIMII mit Domain-Shifts (Betriebszustände, Umgebung). 5 Maschinen-Typen.
- **Sensor-Felder:** Audio (Wav, 16 kHz), 8 Kanäle
- **RUL-Labels?:** binär (normal/anomal), keine RUL
- **Robotik-Nähe:** 4
- **Grund für Einstufung:** Erweiterung des bestehenden MIMII-Eintrags. Selbe Einschränkungen (Audio).
- **Weiterverfolgen als:** wenn MIMII genommen wird, eher DUE als Original (Domain-Shifts nützlich)
- **Offene Fragen:** siehe MIMII-Eintrag oben

---

### TCM Steel Manufacturing PdM Benchmark

- **Link:** https://zenodo.org/records/11469702
- **Lizenz (erster Blick):** CC-BY
- **Was:** Stahl-Fertigungsdaten mit Sensor-Streams und RUL-Labels.
- **Sensor-Felder:** unbekannt (stahlspezifisch)
- **RUL-Labels?:** ja kontinuierlich
- **Robotik-Nähe:** 4
- **Grund für Einstufung:** Wird wahrscheinlich nicht gewählt — zu weit vom Narrativ. Trotzdem dokumentieren.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Transferierbarkeit auf Roboter-Lifecycle?

---

### Nigerian Energy & Utilities Predictive Maintenance

- **Link:** https://huggingface.co/datasets/electricsheepafrica/nigerian_energy_and_utilities_predictive_maintenance
- **Lizenz (erster Blick):** unklar
- **Was:** ~120.000 Zeilen Energieinfrastruktur-Telemetrie mit RUL und Fehlerwahrscheinlichkeit.
- **Sensor-Felder:** Datum, Substation, Health-Score, 30-Tage-Failure-Probability, RUL, Recommended Action
- **RUL-Labels?:** ja kontinuierlich
- **Robotik-Nähe:** 4
- **Grund für Einstufung:** RUL-Labels vorhanden, aber Energiewirtschaft, nicht Robotik.
- **Weiterverfolgen als:** Backup
- **Offene Fragen:** Welche konkreten Sensoren? UCS-Mapping-Wert für Demo?

---

## Entscheidungs-Checkliste (vor Auswahl)

- [ ] **Primary** gewählt, heruntergeladen, Felder inspiziert
- [ ] **Foreign** gewählt, muss *sichtbar* andere Struktur haben (andere Spaltennamen-Stil, andere Einheiten)
- [ ] Lizenzen beider Datensätze geprüft und in `decisions.md` festgehalten
- [ ] Kanonisches UCS-Schema skizziert (welche Felder erwarten wir? `cycle_index`, `load_cumulative`, `vibration_rms`, `temperature_delta`, …)
- [ ] Mapping primary → UCS dokumentiert (damit die Demo belastbar ist)
- [ ] Mapping foreign → UCS *bewusst offen* gelassen (das ist, was der UCS-Agent live machen soll)
