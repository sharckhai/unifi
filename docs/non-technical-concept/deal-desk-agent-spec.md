# Deal-Desk Agent — Spec & Test Queries

This is the design-grounding document for the Deal-Desk Agent. The executable artifact is `deal-desk-agent-prompt.md`, which is loaded verbatim into Gemini's system instruction. This file exists to anchor the prompt against two concrete Anna inquiries and the expected output shape.

## Scope (what's in / out this round)

In:
- One persona: **Anna** — CFO of a mid-market logistics / e-commerce company.
- Two robots: **UR5** (cobot, mixed weights) and **SCARA** (light, high-throughput).
- Five tools: `analyze_pdf_inquiry`, `get_robots`, `get_robot_infos`, `get_pricing_history`, `compare_leasing_and_unifi`.
- Cash-flow + risk-profile comparison against classical leasing.

Out:
- Balance-sheet inputs, IFRS-16 narrative, covenant analysis. The agent does not ask Anna for equity ratio or debt figures and does not produce a bilanz-impact block.
- Personas Jonas and Marie. Out of scope this round.
- ML-driven wear-rate prediction inside `get_pricing_history` — the curve uses fixed multiplier sample points; ML wiring is a follow-up.

This builds on `deal-desk-agent-possibilities.md` and `unifi_konzept_v2.md` (`:319–337`). Where they discuss balance-sheet impact, this round drops it; where they discuss tool composition, this round implements a concrete subset.

## Workflow

```
PDF inquiry
   ↓ analyze_pdf_inquiry
Inquiry (structured)
   ↓ get_robots
[UR5, SCARA] with use-case hints
   ↓ get_robot_infos(picked)        ← must follow get_robots
RobotInfo
   ↓ get_pricing_history × 1–2 weight classes
PricingCurve(s)
   ↓ compare_leasing_and_unifi
LeasingComparison
   ↓
Offer (structured JSON)
```

The sequencing constraint (`get_robot_infos` may only follow `get_robots`) is enforced both in the prompt and via a defensive guard in the tool itself.

## Test Query A — Standard mid-market

**Customer:** Nordhafen Fulfillment GmbH, mid-market e-commerce fulfillment in Hamburg, ~80 M€ revenue.

**The inquiry, in prose (mirrors the PDF):**

> We are evaluating a Pay-per-Pick offer for our new pick line in Hamburg. The line will run 10 robots, handling roughly 2 million picks per month. Our package mix is balanced: 60% light items below 1 kg, 30% medium items 1–3 kg, 10% heavy items above 3 kg. We expect a moderate Q4 peak, +20% over baseline for about 8 weeks. We would prefer a 5-year term. Flexibility is medium-priority — we want predictable cost but not a complete lock-in. Please provide a structured offer.

**Inquiry fields the agent should extract:**

| Field | Value |
|---|---|
| customer_name | Nordhafen Fulfillment GmbH |
| industry | e-commerce fulfillment |
| fleet_size | 10 |
| weight_mix | light 0.60 / medium 0.30 / heavy 0.10 |
| expected_picks_per_month | 2_000_000 |
| seasonality | "moderate Q4 peak, +20% over baseline for ~8 weeks" |
| term_preference_months | 60 |
| flexibility_priority | medium |

**Expected output sketch:**

- Robot chosen: **UR5** — mixed weights up to 5 kg fit the 60/30/10 profile, and SCARA's 2 kg ceiling rules it out for the medium and heavy share.
- Pricing: dominant weight class is `light`. Median customer €/pick lands around **~0.003 €** at the current cost-engine + uplift configuration (production ≈ 0.002 €, plus 15 % service fee + 25 % operator margin). Range covers the four wear-multiplier points (0.6× to 1.2×). Note: any documentation that quotes "€0.42–0.58/pick" is illustrative copy from earlier drafts, not a calibrated number — the cost engine is authoritative.
- Scenarios: at least one variant — "if medium share rises to 50%" — showing the €/pick delta.
- Clauses: `minimum_term` (5y term unlocks pricing latitude), `termination_notice` (medium flexibility), optional `seasonal_clause` for the Q4 +20%.
- Comparison: 5y leasing total vs. 5y UNIFI total at expected volume; cash-flow narrative emphasizes that UNIFI scales down with volume; risk narrative shows the savings figure at –30% volume.
- Narrative: ~4 sentences linking robot fit, pricing logic, flexibility provided by the clauses, and a steer for the bank conversation focused on cash-flow predictability.

## Test Query B — Heavy-load + Black Friday peak

**Customer:** Lager24 Logistics AG, mid-market parcel-handling operation, growing fast.

**The inquiry, in prose:**

> We are launching an automated lane for heavier parcels in our Frankfurt hub. We plan to deploy 8 robots, handling around 1.5 million picks per month at base, with a pronounced Black Friday peak: roughly 3× volume for 6 weeks each year. Our package mix is heavier than typical: 20% light, 50% medium, 30% heavy items above 3 kg. We are open on robot type — please advise. We would prefer a 3-year term with strong flexibility, since this lane is new and we may want to redirect capital quickly. Flexibility is high-priority.

**Inquiry fields the agent should extract:**

| Field | Value |
|---|---|
| customer_name | Lager24 Logistics AG |
| industry | parcel logistics |
| fleet_size | 8 |
| weight_mix | light 0.20 / medium 0.50 / heavy 0.30 |
| expected_picks_per_month | 1_500_000 |
| seasonality | "Black Friday peak ~3× for 6 weeks per year" |
| term_preference_months | 36 |
| flexibility_priority | high |

**Expected output sketch:**

- Robot chosen: **UR5** — SCARA cannot handle the 30% heavy share. The narrative should flag the SCARA tradeoff explicitly.
- Pricing: dominant weight class is `medium`, but the agent should also pull `heavy` to enable an honest scenario about the heavy share. Range will be **noticeably wider** than Query A and the median **higher** because of the heavy multipliers (up to 2.2×). Concrete numbers from current cost engine: heavy curve median ≈ **0.004 €/pick**, range high ≈ **0.005 €/pick**.
- Scenarios: at least one — "if heavy share rises from 30% to 45%" — showing the €/pick climbing.
- Clauses: **wear_cap** (heavy share warrants outlier protection), **flex_capacity** (high flexibility priority), **seasonal_clause** (Black Friday explicitly named), and `termination_notice` for early-exit.
- Comparison: 3y leasing total vs. 3y UNIFI; cash-flow narrative emphasizes that during the +200% peak the UNIFI bill scales accordingly while leasing stays flat (i.e., during peaks UNIFI is more expensive but during a flop year it is much cheaper); risk narrative leans hard on the savings figure if volume disappoints.
- Narrative: ~5 sentences. Robot tradeoff, why the wear cap matters specifically for this load profile, why flex capacity earns its keep given the +200% peak, and a steer that for a new lane this clause structure de-risks capital allocation.

## Why these two queries are enough

Together they cover:
- **Both robots get plausibly considered** — UR5 wins both, but Query B explicitly forces the agent to consider and reject SCARA, exercising `get_robot_infos` selection logic.
- **All five clauses can plausibly trigger** — `minimum_term` and `termination_notice` in A, `wear_cap`, `flex_capacity`, `seasonal_clause` in B; `termination_notice` again in B for high flexibility.
- **All three weight classes get sampled** — light dominant in A, medium dominant + heavy secondary in B.
- **Sequencing constraint exercised** — both inquiries naturally go through `get_robots` before `get_robot_infos`. The integration test additionally simulates a violation to verify recovery.
- **Pricing range stress-tested** — Query A sits in the lower band (light-dominant, multiplier 0.6×–1.2×); Query B reaches the upper band (heavy share + 2.2× multiplier). If both Offers come back with similar €/pick, the curve is too flat and needs revisiting.

## Assumptions worth confirming

- Anna's company specifics in each query (Nordhafen / Lager24, revenue band, locations) are invented for plausibility. They do not feed any tool — only the structured fields do.
- The leasing-rate constant (`MONTHLY_LEASING_FACTOR = 0.022`) is illustrative for 5-year industrial leasing in Western Europe at 2025/26 rates. A future round should benchmark this against real offers.
- "history" in `get_pricing_history` is misleading — the tool returns a curve at four wear-multiplier sample points, not a time-series. The name is kept per request; the docstring and this spec document the actual semantics.
- The agent is expected to choose the dominant weight class for the primary `get_pricing_history` call. If the prompt is too lax, it may pick the wrong class — verify against both queries during sanity-check.
