"""End-to-end Deal-Desk-Agent run with full step tracing.

Defaults to `apps/backend/tests/fixtures/deal-desk/bela_query_trophy.pdf`,
the heavy-load stress fixture ({tech: europe}, three components at 5/10/15
kg). Every tool call is printed with its arguments and result preview, so
you can watch the agent reason through the workflow live. The final Offer
is rendered both human-readable and as raw JSON.

Usage:
    GEMINI_API_KEY=... uv run python -m unifi.scripts.e2e_deal_desk
    uv run python -m unifi.scripts.e2e_deal_desk --pdf <path>
    uv run python -m unifi.scripts.e2e_deal_desk --json-only
"""

from __future__ import annotations

import argparse
import pathlib
import sys

from unifi.deal_desk.agent import run_agent
from unifi.deal_desk.tracing import format_offer, format_step, offer_as_json

DEFAULT_PDF = (
    pathlib.Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "deal-desk"
    / "bela_query_trophy.pdf"
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf",
        type=pathlib.Path,
        default=DEFAULT_PDF,
        help=f"Path to the inquiry PDF (default: {DEFAULT_PDF}).",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Suppress step trace; print only the raw Offer JSON on stdout.",
    )
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(2)

    on_step = None
    if not args.json_only:
        print(f"PDF: {args.pdf}", file=sys.stderr)
        print(f"Running Deal-Desk-Agent…", file=sys.stderr)
        print("", file=sys.stderr)

        def _print(event):
            print(format_step(event), file=sys.stderr, flush=True)
            print("", file=sys.stderr, flush=True)

        on_step = _print

    result = run_agent(str(args.pdf), on_step=on_step)

    if args.json_only:
        print(offer_as_json(result.offer))
        return

    print(format_offer(result.offer), file=sys.stderr)
    print("", file=sys.stderr)
    print("══ Raw Offer JSON " + "═" * 50, file=sys.stderr)
    print(offer_as_json(result.offer))


if __name__ == "__main__":
    main()
