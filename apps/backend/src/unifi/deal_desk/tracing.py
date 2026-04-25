"""Pretty-printer helpers for agent step traces and final offer rendering.

Shared by the CLI (`unifi.deal_desk.run -v`) and the E2E script
(`unifi.scripts.e2e_deal_desk`) so both produce identical-looking output.
"""

from __future__ import annotations

import json

from unifi.deal_desk.agent import StepEvent
from unifi.deal_desk.schema import Offer

RESULT_TRUNCATE_CHARS = 600


def _truncate(s: str, limit: int = RESULT_TRUNCATE_CHARS) -> str:
    if len(s) <= limit:
        return s
    return s[:limit].rstrip() + f"\n  …[+{len(s) - limit} more chars]"


def format_step(event: StepEvent) -> str:
    header = f"── Step {event.turn} — {event.name} " + "─" * max(
        0, 50 - len(event.name)
    )
    args_blob = json.dumps(event.args, ensure_ascii=False, indent=2) if event.args else "{}"
    args_line = "  args:    " + args_blob.replace("\n", "\n           ")

    if event.error is not None:
        body = f"  error:   {event.error}"
    else:
        result_blob = json.dumps(
            event.result_jsonable, ensure_ascii=False, indent=2, default=str
        )
        body = "  result:  " + _truncate(result_blob).replace("\n", "\n           ")

    return f"{header}\n{args_line}\n{body}"


def format_offer(offer: Offer) -> str:
    lines: list[str] = []
    lines.append("══ Final Offer " + "═" * 50)
    h = offer.header
    lines.append(
        f"  Customer:     {h.customer_name}\n"
        f"  Robot chosen: {h.robot_chosen}\n"
        f"  Fleet size:   {h.fleet_size}\n"
        f"  Term:         {h.term_months} months"
    )

    p = offer.pricing
    lines.append("")
    lines.append("  Pricing")
    lines.append(
        f"    €/pick range:   {p.eur_per_pick_min:.4f} – {p.eur_per_pick_max:.4f}"
        f" (median {p.eur_per_pick_median:.4f})"
    )
    lines.append(
        f"    monthly:        {p.expected_monthly_eur:,.0f} € expected,"
        f" peak {p.peak_monthly_eur:,.0f} €"
    )

    if offer.scenarios:
        lines.append("")
        lines.append("  Scenarios")
        for s in offer.scenarios:
            lines.append(
                f"    • {s.label}: {s.eur_per_pick:.4f} €/pick "
                f"({s.delta_vs_base_pct:+.1f}% vs base)"
            )
            if s.note:
                lines.append(f"      {s.note}")

    if offer.clauses:
        lines.append("")
        lines.append("  Clauses")
        for c in offer.clauses:
            lines.append(f"    • {c.name}")
            lines.append(f"      {c.reasoning}")

    c = offer.comparison
    lines.append("")
    lines.append("  Comparison vs classical leasing")
    lines.append(f"    leasing total: {c.leasing_total_eur:,.0f} €")
    lines.append(f"    UNIFI total:   {c.unifi_total_eur:,.0f} €")
    lines.append(f"    cash flow: {c.cash_flow_narrative}")
    lines.append(f"    risk:      {c.risk_narrative}")

    lines.append("")
    lines.append("  Narrative")
    lines.append("    " + offer.narrative.replace("\n", "\n    "))
    return "\n".join(lines)


def offer_as_json(offer: Offer) -> str:
    return json.dumps(offer.model_dump(mode="json"), ensure_ascii=False, indent=2)


def step_summary_line(event: StepEvent) -> str:
    """One-liner used in the legacy CLI tool-call summary block."""
    if event.error:
        return f"  - Step {event.turn}: {event.name}({event.args})  ERROR: {event.error}"
    return f"  - Step {event.turn}: {event.name}({event.args})"
