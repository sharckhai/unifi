# UNIFI

> *Visa-Netzwerk für Robotics-as-a-Service.*

UNIFI übersetzt Roboter-Telemetrie in bankenfähige Finanzdaten. Drei Kernprodukte:

1. **Abrechnungs-Engine** — exakte Kosten pro Pick (Energie, Verschleiß, Kapital, Wartung).
2. **Robot Credit Score** — dynamischer Restwert & RUL aus Live-Nutzungsdaten.
3. **RaaS-Konfigurator** — Pay-per-Pick-Angebote inkl. IFRS-16-Bilanzwirkung.

Hackathon-Prototyp. Single-Source-of-Truth fürs Konzept: [`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md).

## Repo-Struktur

```
apps/backend/    Python 3.12, FastAPI, LightGBM — UCS-Schema + Wear-Rate-Modell
apps/frontend/   Next.js (noch leer)
data/            Datasets + Datasheets — gitignored, lokal
docs/            Konzept, Research, Entscheidungen
```

## Quickstart

```bash
cd apps/backend
uv sync

# 1. Roh-CSVs → gefensterte UCS-Features
uv run python -m unifi.scripts.build_dataset

# 2. + Wear-Rate-Labels (Physik-Formel)
uv run python -m unifi.scripts.make_labels

# 3. + LightGBM trainieren
uv run python -m unifi.scripts.train_wear_rate

# 4. API
uv run uvicorn unifi.main:app --reload
# → POST /wear-rate/predict mit UcsFeatures-Body
```

## Datensatz

**NIST UR5-Degradation** (lokal unter `data/nist-ur5-degradation/`, `.gitignored`).

- **18 CSV-Files**, 73 Sensor-Felder pro File, **125 Hz Sampling**, ~50–85 s pro File.
- **6 Konfigurationen × 3 Runs**: Payload {16 lb, 45 lb} × Speed {fullspeed, halfspeed} × Coldstart-Variante (nur 45 lb).
- **Sensoren** pro Joint J1–J6: Position, Velocity, Current, Torque, Temperatur. Plus TCP-Pose, TCP-Wrench, ROBOT_TIME.
- **Keine** Failure- oder RUL-Labels.
- **Quelle:** NIST Engineering Laboratory — Robotic Performance Datasets ([data.nist.gov](https://data.nist.gov)). Offizielles UR5-Datenblatt liegt im Bundle (`data/nist-ur5-degradation/datasheets/UR5_3rd-party_datasheet.pdf`).
- **Lizenz:** vermutet U.S.-Government-Public-Domain (NIST), formale Verifikation ausstehend.

Detail-Evaluation siehe [`docs/research/datasets.md`](docs/research/datasets.md).

## UCS — Unifi Certification Standard

Einheitliches Schema für Roboter-Telemetrie und -Datasheets. Drei Pydantic-Ebenen in [`apps/backend/src/unifi/ucs/schema.py`](apps/backend/src/unifi/ucs/schema.py):

### `UcsDatasheet` — Roboter-Stammdaten (Normalisierungs-Basis)

```
model, manufacturer, robot_class       # cobot | scara | parallel | gantry
cost_new_eur, nominal_picks_lifetime   # für Kosten-Engine
rated_current_a, rated_torque_nm       # Joint-Nennwerte
rated_cycle_time_s, rated_payload_kg
nominal_duty_cycle, maintenance_cost_pct_per_year
```

### `UcsTelemetrySample` — Zeitreihen-Probe (vor Aggregation)

```
t_s, joint_currents, joint_positions, joint_velocities,
joint_temperatures, joint_torques?, tcp_force?, tcp_pose?
```

Joint-Listen sind so lang wie der Roboter Joints hat (UR5: 6, SCARA: 4) — UCS ist agnostisch zur DOF.

### `UcsFeatures` — dimensionsloser Modell-Input pro Window

12 Felder (10 numerisch + 2 kategorial), autoritativ via `UcsFeatures.feature_order()`. Reihenfolge wird neben dem Booster persistiert in `feature_schema.json`.

## Verschleiß-Definition + Label-Generierung

Es gibt keinen direkten Verschleiß-Sensor. Wir konstruieren Labels physikalisch motiviert pro Window:

```
load_factor    = (motor_current_max / rated_current)^α      # Basquin (Materialermüdung)
thermal_factor = exp(k · (joint_temp_max − T_ref))          # Arrhenius (chemische Alterung)
cycle_factor   = rated_cycle_time / observed_cycle_time     # Zyklusrate

multiplier_raw = load_factor · thermal_factor · cycle_factor
multiplier     = multiplier_raw / median(multiplier_raw on warm-fullspeed-light-Train-Windows)
```

**Konstanten:** α = 2.5 (Standard für Stahl-Lager), k = 0.05/K (Verdopplung pro 10 K), T_ref = 30 °C, T_max = 80 °C.

**Verankerung:** Median(`warm × fullspeed × 16 lb × Train`) ≡ **1.0×** — „Normalbetrieb" als Referenzpunkt. Anker ausschließlich auf Train-Rows, **nicht** Val/Holdout (kein Leakage).

**Ergebnis-Verteilung der Labels** (alle Splits, 605 Windows):
- p05 = 0.10×, p50 = 0.71×, p95 = 5.59×
- Spreizung: 0.3× (Leichtbetrieb) bis ~5× (Schwerlast-Peaks)

**Was bewusst nicht ins Label fließt:** Anomalien, mechanische Defekte, Steuerungsfehler. Das ist Hersteller-/SLA-Territorium und würde Kunden für Probleme bestrafen, die nicht ihre sind.

Volle Begründung der Konstanten und Beispielwerte: [`docs/research/wear-rate-training.md`](docs/research/wear-rate-training.md).

## Dimensionslosigkeit — der Schlüssel zur Roboter-Portabilität

Das ML-Modell sieht **niemals** rohe Sensorwerte. Jeder Sensor wird durch eine Datasheet-Konstante derselben Einheit geteilt:

| Roher Sensor (Einheit) | / Datasheet-Nenner | UCS-Feature |
|---|---|---|
| `actual_current` (A) | `rated_current_a` | `motor_load_ratio` |
| `target_torque` (Nm) | `rated_torque_nm` | `torque_load_ratio` |
| `actual_velocity` (rad/s) | `nominal_joint_velocity` | `velocity_intensity` |
| `joint_temp` (°C) | `(T − T_ref) / (T_max − T_ref)` | `temp_delta_normalized` |
| `observed_cycle_time` (s) | `rated_cycle_time_s` | `cycle_intensity` |
| TCP-Force (N) | `rated_payload_kg · g` | `tcp_force_norm` |

**Warum:** `5 A` bedeutet auf einem UR5 (Nennstrom 6 A) 83 % Auslastung — entspannt. Auf einem SCARA (Nennstrom 3.5 A) bedeutet dasselbe `5 A` 143 % — Überlast. Roher Wert ist ohne Roboter-Kontext nutzlos. Verhältnis-Wert ist universell.

**Konsequenz:** Derselbe vor-trainierte Booster scoret jeden fremden Roboter, sobald sein Datasheet auf das UCS-Schema gemappt ist. Kein Re-Training, kein Integrationsprojekt — der UCS-Drop-in.

## Modell-Architektur

**LightGBM-Regressor** auf `log(wear_rate_multiplier)` (RMSE-Loss).

- **Input:** 12-dim `UcsFeatures`-Vektor (10 dimensionslose Floats + 2 kategoriale Felder `thermal_state`, `payload_class`).
- **Output:** Skalar — Wear-Rate-Multiplier ∈ [0.3×, 5.0×] (geclippt nach `exp(prediction)`).
- **Hyperparameter** (klein wegen ~450 Train-Rows):
  - `num_leaves=15`, `learning_rate=0.05`, `n_estimators=300`
  - `min_data_in_leaf=20`, `feature_fraction=0.9`, `bagging_fraction=0.9`
  - `early_stopping_rounds=30` auf Val-RMSE
- **Categoricals:** integer-encoded (cold=0/warm=1, light=0/heavy=1), LightGBM nutzt sie via `categorical_feature`.

Code: [`apps/backend/src/unifi/models/wear_rate.py`](apps/backend/src/unifi/models/wear_rate.py).

**Warum LightGBM und nicht NN?** Bei ~450 Train-Rows und ~12 Features ist Boosting effizienter und gut erklärbar (SHAP-fähig). Ein NN wäre overkill.

**Warum `log(multiplier)` als Target?** Sichert Positivität bei der Inferenz (`exp(pred)`), passt zur log-normalen Verteilung der Labels.

## Trainings-Statistiken

Aus [`apps/backend/artifacts/train_stats.json`](apps/backend/artifacts/train_stats.json) (Modell-Version `fae1da25`):

```
n_train          452 Windows
n_val            114 Windows
val_rmse_log    0.069     (≈ 7 % multiplikativer Fehler im Mittel)
val_rmse        0.481     (auf Multiplier-Skala)

Predicted multiplier quantiles (Val):
  p05  0.30   p50  0.85   p95  5.00
```

**Bucket-Vergleich Predicted (Val) ↔ Label-Mean (Val):**

| Bucket | Label | Predicted | Δ |
|---|---|---|---|
| light × halfspeed × warm | 0.42 | 0.49 | +17 % |
| light × fullspeed × warm | 0.99 | 0.97 | −2 % |
| heavy × halfspeed × warm | 1.05 | 1.05 | 0 % |
| heavy × halfspeed × cold | 0.88 | 0.94 | +7 % |
| heavy × fullspeed × warm | 2.79 | 2.39 | −14 % |
| heavy × fullspeed × cold | 2.67 | 2.33 | −13 % |

Alle Buckets innerhalb ±20 %. Heavy×fullspeed wird leicht unterschätzt — `CLIP_HI=5.0` schneidet die Tails ab. Monotonie heavy>light und fullspeed>halfspeed durchgehend intakt.

**Wichtige Caveat:** Die Labels sind eine **physikalisch motivierte Baseline**, keine Ground-Truth-Wear-Messung. Mit echten Felddaten kalibrieren sich α und k nach (Network-Effekt-Stufe 2). Ohne Felddaten ist die Baseline die Baseline — Konstanten sind plausibel, nicht datengestützt.

## API

`POST /wear-rate/predict`

```json
// Request: UcsFeatures-Body
{
  "motor_load_ratio_max": 0.54, "motor_load_ratio_mean": 0.12,
  "motor_load_ratio_std": 0.05, "cycle_intensity": 1.0,
  "velocity_intensity_max": 0.32, "torque_load_ratio_max": 0.20,
  "temp_delta_normalized_max": 0.12, "temp_delta_normalized_mean": 0.03,
  "tcp_force_norm": 1.01, "tracking_error_rms": 0.009,
  "thermal_state": "warm", "payload_class": "light"
}

// Response
{
  "wear_rate_multiplier": 1.02,
  "model_version": "fae1da25",
  "clipped": false
}
```

`GET /health` meldet Status + `model_loaded: bool`.

## Trainings-Pipeline und Finanz-Werte (Provenance)

Konsolidierter Überblick: was im Datensatz steckt, was wir genutzt haben, wie genau das Modell ist und wie wir aus dem Datasheet die Finanz-Werte ableiten.

### NIST-Datensatz — was tatsächlich drin ist

- **18 CSV-Files** (`data/nist-ur5-degradation/ur5testresult*_flat.csv`), jede ~50–85 s Sequenz bei 125 Hz Sampling → ~6.000–10.000 Telemetrie-Samples pro File.
- **Konfigurations-Matrix:** Payload {16 lb / 7.26 kg, 45 lb / 20.41 kg} × Speed {fullspeed, halfspeed} × Coldstart {ja (nur 45 lb), nein} × 3 Wiederholungen.
- **Sensoren pro File:** 73 Spalten — pro Joint J1–J6: `actual_current_J*`, `actual_position_J*`, `actual_velocity_J*`, `target_torque_J*`, `joint_temperature_J*`. Plus TCP-Pose und TCP-Force.
- **Wichtig:** NIST hat den UR5 absichtlich **über Spec** gefahren (16 lb = 1.45× rated_payload, 45 lb = 4.08× rated_payload), um in vertretbarer Zeit messbaren Verschleiß zu erzeugen. Kein In-Spec-Datapoint im Set.
- **Keine Failure-Labels, kein RUL** — wir konstruieren Wear-Rate-Labels selbst (siehe oben).

### Split: Train / Val / Holdout

`build_dataset.py` fenstert alle 18 Files in 2 s-Windows (≈ 1 Cycle bei UR5-rated 2 s) → **605 Windows total**. Aufteilung:

| Split | Anzahl | Quelle |
|---|---|---|
| `holdout` | 27 | gesamtes File `ur5testresultfullspeedpayload16lb3_flat.csv` zurückgehalten — leichter Lastpfad, fullspeed, Run 3, kein Coldstart. Wird **nicht** für Training genutzt, dient als Source-Frame für `/simulate/pick`. |
| `train` | 462 | rest, 80 % stratifiziert nach `payload × speed × coldstart` |
| `val` | 116 | rest, 20 % stratifiziert |

**Stillstand-Filter:** Beim Lifetime-Loading filtert `WindowSampler` Windows mit `velocity_intensity_max < 0.05` aus — die ersten Windows jedes Files enthalten Roboter-Stillstand vor Cycle-Beginn, die würden den Demo-Anker verzerren.

### Modell-Genauigkeit (Stand `wear_rate_lgbm.txt`, Version `bcd71ad2`)

```
n_train         462 Windows
n_val           116 Windows
val_rmse_log    0.081     (≈ 8 % multiplikativer Fehler im log-Space)
val_rmse        0.757     (auf Multiplier-Skala, größter Anteil aus heavy-fullspeed-Tail)

Predicted multiplier quantiles (Val):
  p05  0.30 (Floor)   p50  0.97   p95  5.00 (Cap)
```

**Was die Bucket-Means uns sagen** (Predicted, Val): das Modell reproduziert die Anker-Logik — `light × fullspeed × warm` ≈ 1.34, `heavy × fullspeed × warm` ≈ 3.37, Verhältnis ≈ 2.5×. NIST-empirisch wäre 2.13×. Etwas zu steil, Modell überschätzt schwere Picks leicht (≈ 15 %).

**Floor 0.3 / Cap 5.0:** schützt gegen LightGBM-Extrapolation außerhalb des Train-Daten-Bereichs (Train-Multiplier-Quantile p05 = 0.10, p95 = 5.59). Demo-Werte zeigen ehrlich `clipped: bool` im Endpoint-Response.

### Wie kommen die Finanz-Werte zustande?

Cost-per-Pick wird aus dem **Datasheet** plus **Operating-Profile** und **Modell-Output** berechnet — keine hard-codierten Preise.

**Vier Cost-Komponenten** ([`unifi/cost/engine.py`](apps/backend/src/unifi/cost/engine.py)):

```
energy_eur      = power_w / 1000 · motor_load_ratio · observed_cycle_time_s · electricity_price / 3600
wear_eur        = cost_new_eur / nominal_picks_lifetime · wear_rate_multiplier
capital_eur     = cost_new_eur · interest_rate_per_year / nominal_picks_lifetime
maintenance_eur = cost_new_eur · maintenance_cost_pct_per_year / picks_per_year
total_eur       = sum
```

| Term | Quelle |
|---|---|
| `power_w` | `UcsDatasheet.power_consumption_w` (UR5: 150 W), Fallback Klassen-Default |
| `cost_new_eur` | `UcsDatasheet.cost_new_eur` (UR5: 35.000 €) |
| `nominal_picks_lifetime` | `UcsDatasheet.nominal_picks_lifetime` (UR5: 30 Mio) |
| `electricity_price` | `FinanceConfig.electricity_price_eur_per_kwh` (Default 0.30 €/kWh, DE 2025) |
| `interest_rate_per_year` | `FinanceConfig.interest_rate_per_year` (Default 0.05) |
| `maintenance_cost_pct_per_year` | `UcsDatasheet.maintenance_cost_pct_per_year` (UR5: 0.05) |
| `picks_per_year` | `OperatingProfile.resolve_picks_per_year(datasheet)` — entweder direkt gesetzt, oder aus `(s/Jahr × duty_cycle / rated_cycle_time_s) × utilization_factor` (Default 0.16) |
| `motor_load_ratio` | dynamisch aus dem skalierten UcsFeatures-Vektor des Picks |
| `observed_cycle_time_s` | `pick_duration_s` aus dem Frontend-Request |
| `wear_rate_multiplier` | LightGBM-Vorhersage |

**Pricing-Stack on top of Cost** ([`unifi/cost/engine.py:compute_customer_pricing`](apps/backend/src/unifi/cost/engine.py)):

```
production_cost = cost.total_eur
service_fee     = production_cost · service_fee_pct      (Default 0.15 — UNIFI-Plattform-Gebühr)
operator_margin = production_cost · operator_margin_pct  (Default 0.25 — Jonas-/Integrator-Marge)
customer_price  = production_cost + service_fee + operator_margin
```

Default-Uplift: +40 % auf production_cost. UR5-Beispiel: production ≈ 0.0021 €/Pick → customer ≈ 0.0029 €/Pick.

**Restwert-Engine** ([`unifi/residual/engine.py`](apps/backend/src/unifi/residual/engine.py)):

```
use_fraction      = cumulative_wear_pick_equivalents / nominal_picks_lifetime
age_fraction      = age_years / nominal_lifetime_years   (UR5: 10, oder Klassen-Default)
combined_decay    = max(use_fraction, age_fraction)      (clip 0..1)
residual_floor    = cost_new · 0.05                       (Schrottwert)
residual_primary  = cost_new · (1 − combined_decay)
residual_value    = max(residual_floor, residual_primary)
```

`max(use, age)` — die schnellere Uhr gewinnt: ein 10-Jahre-alter UR5 ist nicht 95 % wert auch wenn kaum genutzt; ein 1-Jahre-alter mit 80 % Verschleiß auch nicht.

### Live-Path: vom Frontend-Slider bis zur Antwort

```
POST /simulate/pick { component_weight_kg, pick_duration_s }
  ↓ WindowSampler.pop()           — sequenziell aus 27 Holdout-Windows
  ↓ renormalize(...)               — Last-Features × mass_ratio**0.5,
  ↓                                  temp × mass_ratio**0.4 (NIST-empirisch)
  ↓ apply_random_emphasis(...)     — boost auf 1 zufälliges Feature (1.2–2.0×)
  ↓                                  nur für SHAP-Demo, nicht für Multiplier
  ↓ predict_one(rescaled)          — LightGBM-Vorhersage auf un-biased Features
  ↓ compute_cost_per_pick(...)     — Energy + Wear + Capital + Maintenance
  ↓ compute_customer_pricing(...)  — + Service + Margin → customer_price
  ↓ live_robot.increment(...)      — Restwert-Akkumulator
  ↓ compute_residual_value(...)    — aktueller Restwert
  ↓ top_k_contributions(biased)    — SHAP-Top-3 für Drill-down
→ SimulatePickResponse mit allen drei Säulen + Pricing-Stack
```

Pipeline-Reproduktion:

```bash
cd apps/backend
uv run python -m unifi.scripts.build_dataset    # → ur5_windows.parquet
uv run python -m unifi.scripts.make_labels      # → ur5_labeled.parquet
uv run python -m unifi.scripts.train_wear_rate  # → wear_rate_lgbm.txt + train_stats.json
uv run pytest -q                                 # 153 Tests grün
```

## Weiterführend

- [`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md) — autoritatives Konzept (Architektur, Demo-Flow, Pitch-Story).
- [`docs/research/wear-rate-training.md`](docs/research/wear-rate-training.md) — operative Spezifikation (Verschleiß-Formel, UCS-Schema, Trainings-Setup im Detail).
- [`docs/research/decisions.md`](docs/research/decisions.md) — Beschluss-Log (append-only).
- [`apps/backend/README.md`](apps/backend/README.md) — Backend-Dev-Anleitung.
