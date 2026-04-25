# Deal-Desk Agent — Setup Possibilities

In the concept, the Deal-Desk Agent is defined as a fully narrative LLM with tool calls.

## What the agent works with (non-technical)

Before the technical building blocks below, here's what the agent receives, what we feed it as background, and what it produces — described the way you'd brief a sales engineer.

### Inputs from the customer

The agent receives what a person would tell it during a briefing if they had just hired it as a consultant:

- **Volume:** roughly how many picks per month, with what seasonality (Black Friday peak, summer dip, even).
- **What gets picked:** weight mix in rough categories — lots of light items, lots of heavy ones, mixed. This is the bridge to the wear factor and therefore to the price per pick.
- **Balance-sheet situation:** current equity ratio, whether bank covenants exist, how much existing debt is carried. Without these, the agent can't tell the IFRS-16 story.
- **Contract preferences:** desired term, how important flexibility is (termination, volume swings, seasonal clauses).
- **Which fleet is meant:** robot type and quantity — so the agent pulls the right cost engine and the right datasheet.

In the showcase, these inputs come from a small form or slider modal behind the "Request offer" button.

### Inputs from UNIFI (background data)

Beyond the customer briefing, the agent needs a layer of background knowledge from the UNIFI platform. This data all comes from our system.

**About the specific robot:**

- The datasheet — new-equipment cost, rated current, rated cycle time, nominal picks lifetime, annual maintenance share. The robot-specific constants needed for every calculation.
- The wear-rate history — if the robot already runs in the network, the agent knows whether it has been operating in the light range (factor 0.8×) or the heavy range (factor 1.6×). Lets the agent ground the offer in real behaviour, not just the briefing.

**About the economic logic:**

- The cost engine, callable like a calculator. Feed in a load mix, get €/pick back. Lets the agent run scenarios without doing arithmetic itself.
- Market benchmarks — typical pay-per-pick prices for comparable robots, typical leasing terms, average maintenance rates. Used as sanity checks ("your price is in the lower third of the market").
- Financial constants — industrial electricity price, current interest-rate corridor, depreciation tables. So the agent isn't speaking from the gut but tapping a shared base of facts.

**About balance-sheet impact:**

- The IFRS-16 logic — a module the agent feeds with customer balance-sheet figures and the monthly payment, and gets back before/after equity ratios plus covenant status. The agent translates that into narrative.

**About contract mechanics:**

- A clause library — pre-drafted modules for flex capacity, wear caps, seasonal clauses, termination notices, minimum terms. The agent picks from these instead of inventing freely. Keeps the offer legally and commercially aligned.
- Pricing latitude — rules about how far the agent may deviate from list price, e.g. "up to 12 % discount for volumes above 5 M picks/year, anything beyond needs approval". Prevents fantasy offers.

**About tone and form:**

- Style guidelines — how the document should sound: formal/serious for bank addressees, friendly/explanatory for mid-market, terse for repeat buyers. In the MVP, a short system-prompt instruction; later a real style library.
- The output schema — the agent knows in what shape the frontend renders (which fields, which order). Forces it to fill structure instead of free-writing.

### What the agent returns

Not chatbot chatter, but **a rendered offer document** that looks like something a senior sales engineer wrote:

- **Pay-per-pick price** as a range (e.g. "€0.42 to €0.58 per pick depending on load mix") plus the expected mean for this exact profile.
- **Monthly projection** — "given your volume and your mix, that's roughly €38,000 per month — up to €51,000 in seasonal peak."
- **Balance-sheet impact in plain terms** — "this offer moves €280,000 from leasing debt into OpEx. Your equity ratio rises from 29 % to 33 %. You stay below the covenant threshold you would have breached on the classical leasing offer."
- **Scenario suggestions** — "if your heavy-load share rises from 10 % to 30 %, the pay-per-pick climbs to about €0.55 — should I include a volume-protection clause?"
- **Concrete contract clauses** with brief reasoning — flex capacity for seasonal peaks, wear cap as protection against outliers, minimum term.
- **Reasoning narrative per block** — *why* this price, *why* this clause, *what* the CFO should ask their bank.

The output is a mix of **number, comparison and story** — exactly what you'd present to a CFO who doesn't think in cents per pick but in balance-sheet effect, covenants and negotiating position.

### One-sentence summary

From the customer the agent gets **the profile and the needs**; from us it gets **the machine, the economics, the balance-sheet logic, the contract building blocks and the tone** — it is essentially a well-briefed sales engineer who knows our pricing engine, our contract toolkit and our market database.

---

## How to set it up — four building blocks

In practice, setting up the agent comes down to four building blocks.

## 1. Fix the output schema first

A Pydantic model that maps 1:1 to the rendered offer. Example fields:

- Header (customer name, robot class, fleet size, contract term)
- Pricing block (€/pick min/median/max, monthly projection)
- Balance-sheet impact (equity ratio before/after, covenant check, IFRS-16 vs. UNIFI-service delta)
- Scenarios (e.g. "seasonal peak +30 %", "heavy-load mix 50 %")
- Clause suggestions (flex capacity, wear cap, termination terms)
- Reasoning narrative per block (this is where the LLM earns its keep)

Without this schema, the frontend can't render and the LLM output stays vague. **First artefact.**

## 2. Tools the agent can call

Three are enough for the MVP:

- `calculate_cost_per_pick(weight_mix, volume_per_month, robot_id)` — the existing cost engine, wrapped as a tool. Takes a load mix, returns €/pick.
- `simulate_ifrs16_impact(monthly_payment, term_years, customer_equity, customer_debt)` — deterministic Python function (simplified discounting), returns before/after balance-sheet metrics.
- `lookup_market_benchmarks(robot_class)` — mock in the MVP (constants lookup), returns typical pay-per-pick range as a sanity check.

## 3. Agent loop

Two realistic options — the choice drives complexity and reliability:

**Option A — Tool-Use with single-pass reasoning.**
One LLM call with the Pydantic schema as `response_format` and the tools as tool definitions. The LLM calls tools, collects results, fills the schema. Anthropic and OpenAI both support this natively. Pro: controllable, compact. Con: with complex scenarios (comparing multiple load mixes), the single call gets long.

**Option B — Mini-workflow with a deterministic step sequence.**
We fix the order: first compute costs, then run the balance-sheet simulation, then a final LLM call purely for narrative writing. Tools aren't LLM-driven calls but fixed pipeline steps. Pro: 100 % reliable, debuggable. Con: less "agent feel".

For 24-hour hackathon reliability, the lean is **B or a light hybrid** (workflow for the calculations, one final narrative LLM call for the reasoning text).

## 4. Rendering in the CFO View

- Trigger: "Request offer" button → modal with a handful of customer parameters (volume, equity ratio, load-mix sliders).
- Submit → agent runs, streaming or a "generating offer…" spinner for 5–10 s.
- Result appears as a rendered offer card (not a chat bubble) — structured along the Pydantic schema, with narrative texts in the reasoning blocks.

## Concrete order if you want to start

1. Write the output schema (Pydantic, ~30 min).
2. Implement `simulate_ifrs16_impact` as a pure Python function (50 lines is enough).
3. Wrap the cost engine as a tool.
4. Wire system prompt + schema + tools, run one end-to-end test with a fixed example customer.
5. Frontend component that renders the schema.

## Open decisions

- **Workflow vs. tool-use loop?** Both work; for the hackathon, workflow feels safer.
- **IFRS-16 simulator** — deterministic Python function, or LLM narrative block fed by tool numbers? Still open in `decisions.md`.
