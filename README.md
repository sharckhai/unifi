# UNIFI

> *The Visa network for Robotics-as-a-Service.*

UNIFI turns robot telemetry into bank-grade financial data. Three core products:

1. **Billing engine** — exact cost per pick (energy, wear, capital, maintenance).
2. **Robot Credit Score** — dynamic residual value & remaining useful life from live usage.
3. **RaaS configurator** — pay-per-pick offers including IFRS-16 balance-sheet impact.

Hackathon prototype. Concept source-of-truth: [`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md).

---

## Quickstart

**Backend** (Python 3.12, FastAPI, LightGBM):

```bash
cd apps/backend
uv sync
uv run uvicorn unifi.main:app --reload    # → http://localhost:8000
```

**Frontend** (Next.js 15, Three.js, Recharts):

```bash
cd apps/frontend
npm install
npm run dev                                # → http://localhost:3000
```

**Rebuild the ML pipeline** (optional — the trained model is committed under `apps/backend/artifacts/`):

```bash
cd apps/backend
uv run python -m unifi.scripts.build_dataset      # raw CSVs → windowed UCS features
uv run python -m unifi.scripts.make_labels        # + physics-derived wear-rate labels
uv run python -m unifi.scripts.train_wear_rate    # + LightGBM training
```

The Deal-Desk agent needs a Gemini API key in `apps/backend/.env`:

```
GOOGLE_API_KEY=…
```

---

## Repo structure

```
apps/
├── backend/
│   └── src/unifi/
│       ├── main.py                  # FastAPI app + lifespan (loads the booster)
│       ├── api/routes/              # health, wear_rate, cost_per_pick, simulate,
│       │                            # residual, deal_desk
│       ├── ucs/                     # UCS schema (datasheet, telemetry, features)
│       │   ├── schema.py
│       │   └── normalizer.py        # raw telemetry → dimensionless features
│       ├── models/wear_rate.py      # LightGBM train / load / predict
│       ├── cost/engine.py           # 4-component cost model + pricing stack
│       ├── residual/                # residual-value engine + live accumulator
│       ├── simulator/               # holdout sampler + scaling for the live demo
│       │   ├── sampler.py
│       │   ├── scaling.py
│       │   └── shap.py
│       ├── deal_desk/               # Gemini agent
│       │   ├── agent.py
│       │   ├── tools.py             # 5 tools the agent can call
│       │   ├── catalog.py
│       │   └── schema.py
│       ├── data/                    # NIST UR5 loader + windowing
│       ├── labels/physics.py        # Basquin × Arrhenius × cycle wear formula
│       └── scripts/                 # build_dataset, make_labels, train_wear_rate
│   ├── artifacts/                   # trained booster + train_stats + parquet
│   └── tests/                       # pytest suite (~150 tests)
└── frontend/
    └── src/
        ├── app/                     # Next.js routes: /, /deal-desk, /robots, /trophies
        ├── components/robot-scene/  # Three.js UR5 rig + pick animation
        └── lib/
            ├── dealDeskStream.ts    # SSE consumer for /deal-desk/stream
            └── fleetStorage.ts
data/                                # NIST UR5 CSVs + datasheets — gitignored
docs/                                # concept, research, decisions
```

---

## Backend (FastAPI)

App entry: [`apps/backend/src/unifi/main.py`](apps/backend/src/unifi/main.py). The lifespan loads the LightGBM booster once at startup and warms the holdout sampler.

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness + `model_loaded: bool` |
| `/wear-rate/predict` | POST | `UcsFeatures` → wear-rate multiplier |
| `/cost-per-pick` | POST | Datasheet + multiplier → cost breakdown |
| `/cost-per-pick/from-features` | POST | One-shot: features → wear-rate → cost |
| `/simulate/pick` | POST | Sample a pick, run model, update live state |
| `/simulate/reset` | POST | Reset the live robot accumulator |
| `/residual/value` | POST | Static residual value |
| `/residual/live` | GET | Current state of the simulated robot |
| `/residual/fleet` | GET | Aggregated fleet view (seeded) |
| `/deal-desk/run` | POST | PDF upload → offer (sync) |
| `/deal-desk/run-from-path` | POST | Local PDF path → offer (sync) |
| `/deal-desk/stream` | POST | PDF upload → SSE stream (steps + final offer) |

---

## Frontend (Next.js)

| Route | Purpose |
|---|---|
| `/` | Live demo: 3D UR5 scene, telemetry charts, per-pick cost breakdown, residual value |
| `/deal-desk` | PDF inquiry upload → streaming agent run → generated offer |
| `/robots` | Robot catalogue browser |
| `/trophies` | Side panel for completed inquiries |

The 3D scene under `components/robot-scene/` runs a Three.js rig with cycle animation; charts use Recharts. Streaming agent events are parsed by `lib/dealDeskStream.ts`.

---

## ML model — wear-rate predictor

A **LightGBM regressor** trained on real **NIST UR5 degradation data** predicts a single scalar: the wear-rate multiplier on the robot's nominal wear rate. The output is clipped to `[0.3, 5.0]`.

The model never sees raw sensor values. Every input is **dimensionless** — each sensor is divided by a datasheet constant of the same unit:

| Raw sensor (unit) | / datasheet term | UCS feature |
|---|---|---|
| `actual_current` (A) | `rated_current_a` | `motor_load_ratio` |
| `target_torque` (Nm) | `rated_torque_nm` | `torque_load_ratio` |
| `actual_velocity` (rad/s) | `nominal_joint_velocity` | `velocity_intensity` |
| `joint_temperature` (°C) | `(T − T_ref) / (T_max − T_ref)` | `temp_delta_normalized` |
| `observed_cycle_time` (s) | `rated_cycle_time_s` | `cycle_intensity` |
| TCP force (N) | `rated_payload_kg · g` | `tcp_force_norm` |

`5 A` on a UR5 (rated 6 A) is 83 % — relaxed. The same `5 A` on a SCARA (rated 3.5 A) is 143 % — overload. A raw value is meaningless without a datasheet; a ratio is universal.

**Why this matters for portability.** The same booster scores any robot the moment its datasheet maps onto the UCS schema — no retraining, no integration project. As more field data arrives, the wear-formula constants (α, k) recalibrate to ground-truth wear, and the model's predictions improve across robot classes.

Code: [`apps/backend/src/unifi/models/wear_rate.py`](apps/backend/src/unifi/models/wear_rate.py), schema in [`apps/backend/src/unifi/ucs/schema.py`](apps/backend/src/unifi/ucs/schema.py).

---

## Financial model — datasheet → euros

The wear-rate multiplier is the bridge between physics and finance. The cost engine ([`apps/backend/src/unifi/cost/engine.py`](apps/backend/src/unifi/cost/engine.py)) extracts mechanical and economic constants from the **UCS datasheet** and turns them into euros per pick.

**Datasheet inputs** (per robot model):

```
cost_new_eur                    rated_current_a
nominal_picks_lifetime          rated_torque_nm
power_consumption_w             rated_cycle_time_s
maintenance_cost_pct_per_year   rated_payload_kg
nominal_duty_cycle              nominal_lifetime_years
```

**Four cost components** per pick:

```
energy_eur      = power_w / 1000 · motor_load_ratio · cycle_time_s · electricity_price / 3600
wear_eur        = cost_new_eur / nominal_picks_lifetime · wear_rate_multiplier
capital_eur     = cost_new_eur · interest_rate_per_year / nominal_picks_lifetime
maintenance_eur = cost_new_eur · maintenance_cost_pct_per_year / picks_per_year
total_eur       = sum
```

The ML model's wear-rate multiplier plugs directly into `wear_eur`. A multiplier of `2.5×` means heavy use is consuming 2.5 picks of nominal lifetime per actual pick, so the per-pick wear cost scales with it.

**Pricing stack** (`compute_customer_pricing`):

```
production_cost = total_eur
service_fee     = production_cost · 0.15      # UNIFI platform fee
operator_margin = production_cost · 0.25      # integrator margin
customer_price  = production_cost + service_fee + operator_margin
```

**Residual value** ([`apps/backend/src/unifi/residual/engine.py`](apps/backend/src/unifi/residual/engine.py)):

```
use_fraction     = cumulative_wear_pick_equivalents / nominal_picks_lifetime
age_fraction     = age_years / nominal_lifetime_years
combined_decay   = max(use_fraction, age_fraction)        # the faster clock wins
residual_value   = max(cost_new · 0.05, cost_new · (1 − combined_decay))
```

`max(use, age)` reflects reality: a 10-year-old UR5 isn't worth 95 % even if barely used, and a 1-year-old one with 80 % wear isn't worth 95 % either.

---

## Deal-Desk agent

A Gemini agentic loop in [`apps/backend/src/unifi/deal_desk/agent.py`](apps/backend/src/unifi/deal_desk/agent.py) takes a customer PDF inquiry and returns a structured pay-per-pick offer. Max 12 tool turns, temperature 0.2, streamed to the frontend over Server-Sent Events at `POST /deal-desk/stream`.

The agent has **5 tools** ([`tools.py`](apps/backend/src/unifi/deal_desk/tools.py)):

- **`analyze_pdf_inquiry`** — multimodal PDF parse. Extracts customer, weight mix, picks per month, cycle expectations into an `Inquiry` object.
- **`get_robots`** — returns the candidate fleet (UR5, SCARA, …) with use-case hints. Must be called before any robot-specific tool.
- **`get_robot_infos`** — full datasheet + suitability score + base fee + nominal picks/year for one robot. Sequencing-guarded behind `get_robots`.
- **`get_pricing_history`** — runs the cost engine across a sweep of wear multipliers for a given weight class and cadence; returns a €/pick curve with median + range.
- **`compare_leasing_and_unifi`** — base fee (utilisation-scaled) + pay-per-pick volume vs. classical leasing for a given fleet size and term; computes break-even volume and savings at different utilisation levels.

The loop returns an `AgentResult` containing the final `Offer` (validated against a JSON schema), the raw model text, every tool call, and per-step traces for the live UI.

---

## Training details

### Dataset

**NIST UR5 degradation** (`data/nist-ur5-degradation/`, gitignored). 18 CSV files, ~50–85 s each at 125 Hz, 73 sensor channels (per-joint current, position, velocity, torque, temperature; plus TCP pose and TCP wrench). Configuration matrix: payload {16 lb, 45 lb} × speed {fullspeed, halfspeed} × coldstart {yes (45 lb only), no} × 3 repeats. NIST drove the UR5 deliberately above spec to produce measurable wear in tractable time. **No failure or RUL labels** — we synthesize wear-rate labels ourselves.

Source: NIST Engineering Laboratory, [data.nist.gov](https://data.nist.gov). Detail evaluation in [`docs/research/datasets.md`](docs/research/datasets.md).

### Wear-label construction

There is no direct wear sensor. Labels are physics-motivated, computed per window:

```
load_factor    = (motor_current_max / rated_current)^α       # Basquin (material fatigue)
thermal_factor = exp(k · (joint_temp_max − T_ref))           # Arrhenius (chemical aging)
cycle_factor   = rated_cycle_time / observed_cycle_time      # cycle rate

multiplier_raw = load_factor · thermal_factor · cycle_factor
multiplier     = multiplier_raw / median(warm × fullspeed × 16 lb × Train windows)
```

Constants: α = 2.5 (steel-bearing fatigue exponent), k = 0.05/K (doubling per 10 K), T_ref = 30 °C, T_max = 80 °C. Anchoring on `warm × fullspeed × 16 lb × Train` ≡ **1.0×** defines "normal operation"; the anchor uses train rows only — no leakage into val/holdout.

What is **deliberately excluded** from the label: anomalies, mechanical defects, controller faults. That belongs to the manufacturer/SLA — billing customers for it would punish them for problems that aren't theirs. Source: [`apps/backend/src/unifi/labels/physics.py`](apps/backend/src/unifi/labels/physics.py).

### Split

`build_dataset.py` cuts all 18 files into 2 s windows (≈ 1 cycle at UR5 rated 2 s) → **605 windows total**.

| Split | Count | Source |
|---|---|---|
| `holdout` | 27 | one full file (`ur5testresultfullspeedpayload16lb3_flat.csv`) held back as the live-demo source frame |
| `train` | 462 | 80 % of the rest, stratified by `payload × speed × coldstart` |
| `val` | 116 | 20 % of the rest, stratified |

### Model stats

From [`apps/backend/artifacts/train_stats.json`](apps/backend/artifacts/train_stats.json), model version `bcd71ad2`:

```
val_rmse_log     0.081     (≈ 8 % multiplicative error in log-space)
val_rmse         0.757     (on the multiplier scale)

Predicted multiplier quantiles (val):
  p05  0.30 (floor)   p50  0.97   p95  5.00 (cap)
```

Hyperparameters (small because of ~450 train rows): `num_leaves=15`, `learning_rate=0.05`, `n_estimators=300`, `min_data_in_leaf=20`, `feature_fraction=0.9`, `bagging_fraction=0.9`, `early_stopping_rounds=30`. Target is `log(wear_rate_multiplier)` — guarantees positivity at inference (`exp(pred)`) and matches the log-normal shape of the labels. Categoricals (`thermal_state`, `payload_class`) are integer-encoded and passed via `categorical_feature`.

The bucket means in `train_stats.json` confirm monotonicity: `heavy > light` and `fullspeed > halfspeed` across all thermal states. The heavy-fullspeed-warm bucket sits around `3.37×`, light-halfspeed-cold around `0.53×` — a roughly 6× spread.

**Caveat.** The labels are a physics-motivated baseline, not ground-truth wear measurements. Real field data lets α and k recalibrate (network-effect stage 2). Until then, the constants are plausible, not data-driven.

### Sampling for the live demo

The demo needs the same `(component_weight_kg, pick_duration_s)` input to produce stable, deterministic multipliers without being drowned out by raw window-to-window noise. The `WindowSampler` ([`apps/backend/src/unifi/simulator/sampler.py`](apps/backend/src/unifi/simulator/sampler.py)) runs in **synthetic mean-vector mode**:

1. **Filter the holdout** — drop idle windows (`velocity_intensity_max < 0.05`) and peak-current windows (`motor_load_ratio_max ≥ 0.92`). N = 21.
2. **Characterize at startup** — for each numeric feature compute `μ_i` and `σ_i` over those 21 windows. For categoricals (`thermal_state`, `payload_class`) take the mode.
3. **Sample per pick** — cursor-seeded `rng_t = default_rng(base_seed + cursor)` for determinism, then

```python
ε ~ N(0, 1)
x_i = max(0, μ_i + α · σ_i · ε)        # α = 0.15 (15 % of natural std)
```

The cursor wraps every 100 picks, so a `reset()` reproduces the sequence bit-for-bit.

4. **Renormalize to the request** — [`scaling.py`](apps/backend/src/unifi/simulator/scaling.py) rescales the source-frame sample (16 lb / 7.26 kg, fullspeed, 2 s) to the requested `(component_weight_kg, pick_duration_s)`:

```
load features (motor/torque/tcp_force) ·= mass_ratio^0.5
temp features                          ·= mass_ratio^0.4
velocity_intensity_max                 ·= duration_ratio
cycle_intensity                        := rated_cycle_time_s / pick_duration_s
```

The exponents 0.5 and 0.4 are empirically averaged from NIST: load is sublinear in mass (friction & idle current dominate), temperature lags behind via heat capacity. See `simulator/scaling.py` and [`docs/research/wear-rate-training.md`](docs/research/wear-rate-training.md) for the full derivation.

### Live path: from frontend slider to response

```
POST /simulate/pick { component_weight_kg, pick_duration_s }
  ↓ WindowSampler.pop()           — synthetic sample from N(μ, (α·σ)²)
  ↓ renormalize(...)               — load · mass_ratio^0.5, temp · mass_ratio^0.4,
  ↓                                  velocity · duration_ratio
  ↓ apply_random_emphasis(...)     — boost one feature for the SHAP demo only
  ↓ predict_one(rescaled)          — LightGBM, output clipped to [0.3, 5.0]
  ↓ compute_cost_per_pick(...)     — energy + wear + capital + maintenance
  ↓ compute_customer_pricing(...)  — + service fee + operator margin
  ↓ live_robot.increment(...)      — residual-value accumulator
  ↓ compute_residual_value(...)    — current residual
  ↓ top_k_contributions(biased)    — SHAP top-3 for the drill-down
→ SimulatePickResponse
```

---

## Further reading

- [`docs/idea-concept/unifi_konzept_v2.md`](docs/idea-concept/unifi_konzept_v2.md) — authoritative concept (architecture, demo flow, pitch story).
- [`docs/research/wear-rate-training.md`](docs/research/wear-rate-training.md) — operational spec (wear formula, UCS schema, training setup in detail).
- [`docs/research/decisions.md`](docs/research/decisions.md) — decision log (append-only).
- [`apps/backend/README.md`](apps/backend/README.md) — backend dev guide.
