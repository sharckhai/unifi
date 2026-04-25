"""CLI entry point for the Deal-Desk-Agent.

Usage:
    GEMINI_API_KEY=... uv run python -m unifi.deal_desk.run <pdf_path>

Prints the final Offer as JSON on stdout. With `-v`, the agent's
per-step trace (each tool call + result) goes to stderr so you can
follow the workflow without polluting the JSON output on stdout.
"""

from __future__ import annotations

import argparse
import logging
import sys

from unifi.deal_desk.agent import run_agent
from unifi.deal_desk.tracing import (
    format_step,
    offer_as_json,
    step_summary_line,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf_path", help="Path to the customer inquiry PDF.")
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Stream the per-step tool-call trace to stderr.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    on_step = None
    if args.verbose:
        def _print(event):
            print(format_step(event), file=sys.stderr, flush=True)
            print("", file=sys.stderr, flush=True)
        on_step = _print

    result = run_agent(args.pdf_path, on_step=on_step)

    if not args.verbose:
        print("# Tool call sequence:", file=sys.stderr)
        for event in result.steps:
            print(step_summary_line(event), file=sys.stderr)
        print(file=sys.stderr)

    print(offer_as_json(result.offer))


if __name__ == "__main__":
    main()
