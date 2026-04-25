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

## Weiterführend

- [`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md) — autoritatives Konzept (Architektur, Demo-Flow, Pitch-Story).
- [`docs/research/wear-rate-training.md`](docs/research/wear-rate-training.md) — operative Spezifikation (Verschleiß-Formel, UCS-Schema, Trainings-Setup im Detail).
- [`docs/research/decisions.md`](docs/research/decisions.md) — Beschluss-Log (append-only).
- [`apps/backend/README.md`](apps/backend/README.md) — Backend-Dev-Anleitung.
