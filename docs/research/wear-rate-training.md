# Wear-Rate-Training — Konzept, Skalierung, Schema

**Zweck:** Operative Spezifikation für das Wear-Rate-Modell. Definiert (1) wie Verschleiß **definiert** ist, (2) wie Telemetrie **dimensionslos skaliert** wird, (3) das **UCS-Schema** in seinen drei Ebenen, (4) das **Trainings-Setup** auf NIST UR5.

**Stand:** 2026-04-25.
**Quellen:** [`unifi_konzept_v2.md`](../idea-concept/unifi_konzept_v2.md) (autoritativ für Architektur & Story), [`mechanics.md`](./mechanics.md) (Roboter-Profile), [`decisions.md`](./decisions.md) (Beschluss-Log).

---

## 1. Verschleiß-Definition

### 1.1 Warum überhaupt definiert (statt gemessen)?

Es gibt keinen direkten Verschleiß-Sensor. Lager- und Getriebe-Schäden lassen sich erst Jahre nach dem auslösenden Stress diagnostizieren — viel zu spät für eine Live-Pricing-Engine. Wir brauchen einen **Proxy**, der pro Window aussagt: *„dieser Betriebsabschnitt verbraucht x-mal so viel Lebensdauer wie ein Normalbetriebs-Abschnitt"*.

Der Proxy muss:

1. **physikalisch motiviert** sein (nicht „aus dem Hut gezaubert"),
2. **dimensionslos** ausgegeben werden (vergleichbar über Roboter hinweg),
3. **monoton in Last und Temperatur** wachsen (Sanity-Check kontrollierbar).

### 1.2 Drei Treiber, multiplikativ verknüpft

Drei Mechanismen bestimmen reale Industrie-Roboter-Lebensdauer. Sie sind seit Jahrzehnten in der Maschinenbau-Literatur etabliert:

#### a) Mechanische Materialermüdung — Basquin-Gesetz

Lager und Getriebe versagen nach `N` Lastzyklen, mit `N ∝ σ^(-α)`. Doppelte Last → Lebensdauer ÷ `2^α`. Für Industrie-Lager liegt α typisch zwischen 2 und 4.

```
load_factor = (motor_current_max / rated_current)^α          # α = 2.5
```

`motor_current_max` ist der Peak-Strom über alle 6 Joints im Window — der schwerstbelastete Joint dominiert die Materialermüdung.

#### b) Thermische Alterung — Arrhenius-Gesetz

Schmierstoff-Oxidation, Lager-Härteverlust und Polymer-Alterung in Dichtungen verdoppeln sich grob pro 10 K Temperaturanstieg. Linearisiert für kleine ΔT:

```
thermal_factor = exp(k · (joint_temp_max − T_ref))           # k = 0.05/K, T_ref = 30 °C
```

#### c) Zyklusrate — mechanische Verdichtung

Häufiger picken = weniger Abkühlpausen = dichter Lagerstress. Lineare Skalierung.

```
cycle_factor = rated_cycle_time / observed_cycle_time
```

### 1.3 Roh-Multiplier und Verankerung

```
multiplier_raw = load_factor · thermal_factor · cycle_factor
multiplier     = multiplier_raw / median(multiplier_raw on warm-fullspeed-16lb-windows)
```

Die zweite Zeile **verankert „Normalbetrieb = 1.0×"**. Damit wird die Skala interpretierbar:

- 0.5×–0.7× = Leichtbetrieb (Bauteilschonung)
- 1.0× = Normalbetrieb (Nennlast bei Nenntakt)
- 1.5×–2.5× = Schwerbetrieb (überdurchschnittliche Beanspruchung)
- 3.0×+ = Grenzlast (sollte selten und kurz sein)

### 1.4 Konstanten — Beschluss

| Konstante | Wert | Begründung |
|---|---|---|
| `α` (Basquin) | **2.5** | Mittelwert für gehärtetes Stahl-Lager; Standardwert in TCO-Studien |
| `k` (Arrhenius) | **0.05 / K** | entspricht „pro 10 K eine Verdopplung" (exp(0.5)≈1.65, gerundet) |
| `T_ref` | **30 °C** | typische Joint-Betriebstemperatur warmgefahren (UR5-Daten zeigen 27–37 °C) |
| `T_max` | **80 °C** | nominale Joint-Operating-Limit-Temperatur (Datasheet-typisch) |
| Verankerung | Median(`warm-fullspeed-16lb`) ≡ 1.0× | Leichtlast-Normalbetrieb als Anker |

### 1.5 Konkrete Beispiele aus den UR5-Daten

| Config | load_factor | thermal_factor | cycle_factor | raw | normiert |
|---|---|---|---|---|---|
| warm fullspeed 16 lb | (5.97/6)^2.5 = 0.97 | exp(0.05·6) = 1.35 | 1.0 | 1.31 | **1.00×** (Anker) |
| warm fullspeed 45 lb | (7.47/6)^2.5 = 1.74 | exp(0.05·7) = 1.42 | 1.0 | 2.47 | **1.89×** |
| warm halfspeed 16 lb | (5.34/6)^2.5 = 0.75 | exp(0.05·2) = 1.10 | 0.5 | 0.41 | **0.31×** |
| warm halfspeed 45 lb | (6.90/6)^2.5 = 1.42 | exp(0.05·6) = 1.35 | 0.5 | 0.96 | **0.73×** |
| cold fullspeed 45 lb | 1.74 | exp(0.05·1) = 1.05 | 1.0 | 1.83 | **1.40×** |
| cold halfspeed 45 lb | 1.42 | exp(0.05·−2) = 0.90 | 0.5 | 0.64 | **0.49×** |

Verteilung deckt 0.3×–1.9× ab; auf 2 s-Window-Granularität wird p95 ≈ 2.0× erreicht (Peak-Lasten innerhalb der Trajektorie).

### 1.6 Was bewusst **nicht** in den Multiplier fließt

- **Anomalien** (mechanische Defekte, Steuerungsfehler) → Hersteller-/SLA-/Garantie-Territorium. Würden den Kunden für Probleme bestrafen, die nicht seine sind. Anomaly-Detection ist im Konzept getrennt verankert (im MVP postponed).
- **Datasheet-Werte** als direkte Wear-Multiplier (`wear_multiplier` aus altem Schema). Datasheet liefert ausschließlich **Normalisierungs-Konstanten**, keine Verschleiß-Bewertung.
- **Run-Index** (1/2/3) als Wear-Achse. Die UR5-NIST-Runs derselben Config sind quasi identisch (`std(cur_peak) < 0.07 A`); sie sind Reproducibility-Wiederholungen, **kein** Degradations-Trend.

---

## 2. Dimensionsloses Skalieren

### 2.1 Warum

Roher Sensor-Wert hat eine Einheit. `5 A` bedeutet auf einem UR5 (Nennstrom 6 A) **83 %** Auslastung — entspannt. Auf einem PHM SCARA (Nennstrom 3.5 A) bedeutet dasselbe `5 A` **143 %** — Überlast. Wer das Modell auf rohen Ampere-Werten trainiert, baut ein **Roboter-spezifisches** Modell.

UCS verlangt ein **Roboter-agnostisches** Modell. Die Lösung: **Sensor-Wert / Datasheet-Konstante derselben Einheit = dimensionsloser Quotient**. `5 A / 6 A = 0.83`, `5 A / 3.5 A = 1.43`. Beide auf derselben Skala vergleichbar.

### 2.2 Skalierungs-Regel

Pro UCS-Feature: **rohe Window-Aggregation**, geteilt durch eine Datasheet-Konstante derselben Einheit.

| Roher Sensor (Einheit) | Datasheet-Nenner | Dimensionsloses UCS-Feature |
|---|---|---|
| `actual_current_J` (A) | `rated_current_a` | `motor_load_ratio_*` |
| `target_torque_J` (Nm) | `rated_torque_nm` | `torque_load_ratio_max` |
| `actual_velocity_J` (rad/s) | `nominal_joint_velocity` (3.0 rad/s, Klassen-Default) | `velocity_intensity_max` |
| `joint_temperature_J` (°C) | `T_ref`, `T_max` (UCS-Konstanten) | `temp_delta_normalized_*` |
| `observed_cycle_time` (s) | `rated_cycle_time_s` | `cycle_intensity` |
| TCP-Force (N) | `rated_payload_kg · g` | `tcp_force_norm` |
| `target_pos − actual_pos` (rad) | — (intrinsisch dimensionslos in rad) | `tracking_error_rms` |

**Aggregation über Joints.** Das Modell sieht keine Per-Joint-Werte, sondern Reduzier-Statistiken über die Joint-Achse:

- **`max_J`** für Last- und Temperatur-Peaks (schwerstbelasteter Joint dominiert).
- **`mean_J`** für Last- und Temperatur-Durchschnitt.
- **`std_J`** für Last-Verteilung über Joints (zeigt unausgeglichene Belastung).

Aggregation **innerhalb** eines Windows (über Zeit-Achse): die 7 PHM-SCARA-Stat-Funktionen `vCnt, vFreq, vMax, vMin, vStd, vTrend, value` (Mean), wobei für UCS-Features hauptsächlich `vMax` und `value` gebraucht werden.

### 2.3 Konkretes UR5-Window-Beispiel

2 s-Window aus `warm-fullspeed-45lb-run1` mit beobachteten Maxima `current_J2 = 7.5 A`, `temp_J6 = 36.6 °C`, `torque_J2 = 57 Nm`, `velocity_J2 = 1.07 rad/s`, `|TCP_force_xyz| = 100 N`:

```
motor_load_ratio_max     = 7.5 / 6.0           = 1.250
torque_load_ratio_max    = 57 / 150            = 0.380
temp_delta_normalized    = (36.6 − 30) / 50    = 0.132
cycle_intensity          = 2.0 / 2.0           = 1.000
velocity_intensity_max   = 1.07 / 3.0          = 0.357
tcp_force_norm           = 100 / (5 · 9.81)    = 2.039
```

Dieser 6er-Vektor (plus 4 weitere Stats und 2 kategoriale Felder) ist der LightGBM-Input. Keine Einheit, keine Roboter-Spezifika.

### 2.4 Sind Datasheet-Werte über Roboter standardisiert?

**Nicht in der Realität.** Hersteller-Datasheets sind chaotisch:

| Feld | UR | KUKA | FANUC | ABB |
|---|---|---|---|---|
| Nennstrom pro Joint | ja | manchmal | selten | nein |
| Maximum Joint Torque | ja, pro Joint einzeln | gemittelt | nur Wrist | nein |
| Average Cycle Time | ja | als „typical" | nein | nein |
| Payload | ja | ja | ja | ja |
| Neupreis | nie offiziell | nie | nie | nie |
| Picks-Lebensdauer | nie | nie | nie | nie |

**Aber im UCS-Standard verlangen wir Einheitlichkeit.** Genau das ist UNIFIs Kernleistung — die **Visa-Analogie**: Banken haben intern verschiedene Datenformate; an der Visa-Schnittstelle gilt ein einheitlicher Standard. UCS macht das gleiche für Roboter-Datasheets.

**Mapping über UCS-Agent.** Beim Drop-in eines fremden Roboters mappt der LLM-Function-Call (siehe v2-Konzept):

- „Nominal Joint Current" / „I_N" / „Rated Current" → `rated_current_a`
- „Maximum Joint Torque" (höchster Joint-Wert) → `rated_torque_nm`
- „Average Cycle Time" / „Pick Cycle (typ.)" → `rated_cycle_time_s`
- „Payload" / „Max Payload" / „Working Payload" → `rated_payload_kg`

**Klassen-Defaults für nicht auffindbare Felder:**

| Feld | scara | cobot | parallel | gantry |
|---|---|---|---|---|
| `nominal_picks_lifetime` | 50M | 30M | 20M | 100M |
| `rated_current_a` (Mittel) | 3.5 | 6.0 | 8.0 | 12.0 |
| `rated_torque_nm` (Joint-Peak) | 80 | 150 | 200 | 800 |
| `rated_cycle_time_s` | 2.5 | 2.0 | 1.0 | 5.0 |
| `nominal_duty_cycle` | 0.8 | 0.8 | 0.85 | 0.7 |
| `maintenance_cost_pct_per_year` | 0.05 | 0.05 | 0.07 | 0.04 |

Im Pitch transparent als „Fallback bis echtes Datasheet-Feld vorliegt" gekennzeichnet — keine Magie, kein Verstecken.

---

## 3. UCS-Schema

UCS hat drei Ebenen, die in `apps/backend/src/unifi/ucs/schema.py` als Pydantic-Modelle leben:

### 3.1 `UcsDatasheet` — Roboter-Stammdaten (Normalisierungs-Basis)

Alle Felder verpflichtend (`extra="forbid"`):

| Feld | Typ | Bedeutung |
|---|---|---|
| `model` | str | „Universal Robots UR5" |
| `manufacturer` | str | „Universal Robots" |
| `robot_class` | `scara \| cobot \| parallel \| gantry` | für Klassen-Defaults und ggf. klassen-spezifisches Fine-Tuning |
| `cost_new_eur` | float > 0 | Neupreis (Kapital + Wartungs-Komponenten der Kosten-Engine) |
| `nominal_picks_lifetime` | int > 0 | Ableitung Restwert + RUL aus kumulierter Wear-Rate |
| `rated_current_a` | float > 0 | Joint-Nennstrom (Normalisierungs-Nenner für `motor_load_ratio`) |
| `rated_torque_nm` | float > 0 | Joint-Spitzen-Drehmoment (für `torque_load_ratio`) |
| `rated_cycle_time_s` | float > 0 | Zyklus-Nenntakt (für `cycle_intensity`) |
| `rated_payload_kg` | float > 0 | Nutzlast (für `tcp_force_norm`) |
| `nominal_duty_cycle` | float ∈ (0,1] | Default 0.8 |
| `maintenance_cost_pct_per_year` | float ∈ [0,1] | Default 0.05 |

### 3.2 `UcsTelemetrySample` — Zeitreihen-Probe (vor Aggregation)

UCS-gemappte Roh-Probe mit variabler Joint-Anzahl pro Roboter (UR5: 6, SCARA: 4):

| Feld | Typ | Pflicht? |
|---|---|---|
| `t_s` | float ≥ 0 | ja |
| `joint_currents` | list[float] (≥ 1) | ja, A pro Joint |
| `joint_positions` | list[float] | ja, rad |
| `joint_velocities` | list[float] | ja, rad/s |
| `joint_temperatures` | list[float] | ja, °C |
| `joint_torques` | list[float] \| None | optional, Nm |
| `tcp_force` | list[float] (genau 6) \| None | optional, [Fx, Fy, Fz, Tx, Ty, Tz] |
| `tcp_pose` | list[float] (genau 6) \| None | optional, [x, y, z, rx, ry, rz] |

Validierung: `tcp_force` und `tcp_pose` haben exakt 6 Einträge; alle Joint-Listen mindestens 1.

### 3.3 `UcsFeatures` — Modell-Input (dimensionslos, autoritative Reihenfolge)

Reihenfolge der Felder ist die **autoritative Feature-Reihenfolge fürs Modell**. Änderungen bedeuten Re-Training oder explizite Schema-Migration. Persistiert in `feature_schema.json` neben dem Booster.

| Feld | Bedeutung | Berechnung |
|---|---|---|
| `motor_load_ratio_max` | Last-Spitze (Joint-Peak) | `max_J(vMax(actual_current_J)) / rated_current_a` |
| `motor_load_ratio_mean` | Last-Mittel über Window | `mean_J(mean(\|actual_current_J\|)) / rated_current_a` |
| `motor_load_ratio_std` | Last-Verteilung über Joints | `std_J(std(actual_current_J)) / rated_current_a` |
| `cycle_intensity` | Zyklus-Verdichtung | `rated_cycle_time_s / observed_cycle_time_s` |
| `velocity_intensity_max` | Geschwindigkeits-Spitze | `max_J(\|actual_velocity_J\|) / nominal_joint_velocity` |
| `torque_load_ratio_max` | Drehmoment-Spitze | `max_J(\|target_torque_J\|) / rated_torque_nm` |
| `temp_delta_normalized_max` | Joint-Temperatur (heißester) | `(max_J(joint_temp) − T_ref) / (T_max − T_ref)` |
| `temp_delta_normalized_mean` | Joint-Temperatur (Durchschnitt) | `(mean_J(joint_temp) − T_ref) / (T_max − T_ref)` |
| `tcp_force_norm` | TCP-Last vs. Nutzlast | `\|F_xyz\| / (rated_payload_kg · g)` |
| `tracking_error_rms` | Steuerungs-Abweichung | `RMS(target_pos − actual_pos)` (rad, intrinsisch dimensionslos) |
| `thermal_state` | Coldstart-Indikator | `cold` / `warm` (kategorial) |
| `payload_class` | Last-Klasse | `light` / `heavy` (kategorial) |

Klassenmethode `UcsFeatures.feature_order()` gibt die Reihenfolge zurück und wird beim Predict konsumiert.

---

## 4. Trainings-Setup

### 4.1 Datenbasis

NIST UR5-Degradation, lokal unter `data/nist-ur5-degradation/`:

- **18 CSV-Files** (`_flat`), 73 Spalten, 125 Hz, ~50–85 s pro File
- **6 Konfigurationen × 3 Runs**:
  - warm fullspeed 16 lb (×3)
  - warm fullspeed 45 lb (×3)
  - warm halfspeed 16 lb (×3)
  - warm halfspeed 45 lb (×3)
  - cold fullspeed 45 lb (×3)
  - cold halfspeed 45 lb (×3)
- Asymmetrie: kein Coldstart mit 16 lb
- Run 1/2/3 sind Reproducibility-Wiederholungen (`std(cur_peak) < 0.07 A`), keine Degradations-Trajektorie

### 4.2 Window-Granularität

**2 s-Fenster**, kein Overlap, an `ROBOT_TIME` ausgerichtet. Bei 125 Hz = 250 Samples/Window. Pro File ~25–42 Windows, gesamt ~540 Windows.

**2 s entspricht ungefähr 1 Cycle laut UR5-`rated_cycle_time_s`.** Halfspeed-Runs decken pro 2 s nur halben Cycle ab — wird über `cycle_intensity = 0.5` korrekt mitnormalisiert.

Pick-Detection (TCP-Z-Wendepunkte / Joint-Velocity-Muster) ist im MVP **postponed**; `observed_cycle_time` kommt hardcoded aus dem Filename-Tag (`fullspeed → 2.0 s`, `halfspeed → 4.0 s`).

### 4.3 Splits

**Stratifizierter 70/20/10-Split** über (payload, speed, thermal_state):

| Split | Anteil | Zweck |
|---|---|---|
| **Train** | ~70 % aller Windows | LightGBM-Training |
| **Validation** | ~20 % aller Windows | Early Stopping + Hyperparameter-Sanity |
| **Holdout (Demo-File)** | ~10 % | 1 ganzes File komplett rausgehalten (z.B. `warm-halfspeed-45lb-run3`) — wird im CFO-View-Live-Stream-Demo benutzt, garantiert „Modell sieht das Window zum ersten Mal" |

**Bewusst nicht** v2-konformes Run-1-only-Training: empirisch nicht begründet (Run 1/2/3 identisch), und die Datenmenge wäre dann zu klein.

### 4.4 Modell und Loss

- **LightGBM-Regressor**, klein wegen kleiner Trainingsmenge:
  - `num_leaves=15`
  - `learning_rate=0.05`
  - `n_estimators=300`
  - `early_stopping_rounds=30` auf Val-RMSE
  - `min_data_in_leaf=20`
- **Loss:** RMSE auf `log(multiplier)` — sichert Positivität, log-normale Multiplier-Verteilung passt sauber.
- **Inferenz:** `clip(exp(pred), 0.3, 5.0)` — verhindert numerische Extreme.

### 4.5 Sanity-Garantien für „sinnvolle" Outputs

Vier-Schichten-Sicherung:

1. **Konstruktive Skalierung** (Verankerung): Median(`warm-fullspeed-16lb`-Windows) ≡ 1.0×.
2. **Erwartete Verteilung** auf Val-Set: p05 ≈ 0.5–0.7, Median ≈ 0.95–1.05, p95 ≈ 1.8–3.0. Wenn nicht erreicht → Label-Skalierung anpassen oder Hyperparams zurücknehmen.
3. **Monotonie-Tests** als pytest-Asserts auf Val-Set:
   - `mean(multiplier | payload=heavy) > mean(multiplier | payload=light)`
   - `mean(multiplier | speed=full) > mean(multiplier | speed=half)`
   - `mean(multiplier | thermal=cold) ≥ mean(multiplier | thermal=warm) − ε`
4. **SHAP-Plausibilität** (qualitativ): Top-3-Features sollten `motor_load_ratio_max`, `cycle_intensity`, `temp_delta_normalized_max` sein. Wenn `payload_class` (kategorial) dominiert, hat das Modell den Filename-Tag statt der Physik gelernt — Alarm.

### 4.6 Artefakte

Nach Training in `apps/backend/artifacts/`:

| Datei | Zweck |
|---|---|
| `wear_rate_lgbm.txt` | LightGBM Booster-Dump (Text-Format, deterministisch reload-bar) |
| `feature_schema.json` | Feature-Reihenfolge + dtypes (für Predict) |
| `label_stats.json` | Min/Max/Median des Labels (für Verteilungs-Sanity beim Reload) |

Verzeichnis ist gitignored; Artefakte werden lokal regeneriert via `uv run python -m unifi.scripts.train_wear_rate`.

---

## 5. Was bewusst nicht in dieser Iteration

- **Pick-Detection** auf Telemetrie-Ebene (TCP-Z-Wende). Postponed; Filename-Tag reicht für UR5-NIST.
- **SHAP-Erklärung als Endpoint.** Zunächst nur als manuelles Sanity-Tool. Bank-View-Drilldown kommt in Folge-Iteration.
- **Klassen-spezifisches Fine-Tuning.** Eine Baseline; spätere Stufe sobald Felddaten aus mehreren Roboter-Klassen vorliegen (Network-Effect-Stufe 2 laut v2).
- **Anomaly Detection.** Konzeptionell verankert, im MVP postponed.
- **Foreign-Datensatz-Training.** Das Modell wird nur auf UR5 trainiert; PHM SCARA / AI4I laufen über UCS-Mapping durch dasselbe Modell, ohne Re-Training.
