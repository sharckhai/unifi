"""CLI entry point for the Deal-Desk-Agent.

Usage:
    GEMINI_API_KEY=... uv run python -m unifi.deal_desk.run <pdf_path>

Prints the resulting Offer as pretty-printed JSON. Logs the tool-call
sequence to stderr so you can verify the agent followed the workflow.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

from unifi.deal_desk.agent import run_agent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf_path", help="Path to the customer inquiry PDF.")
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable INFO-level logging from the agent.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    result = run_agent(args.pdf_path)

    print("# Tool call sequence:", file=sys.stderr)
    for name, args_used in result.tool_calls:
        print(f"  - {name}({args_used})", file=sys.stderr)
    print(file=sys.stderr)

    print(json.dumps(result.offer.model_dump(mode="json"), indent=2))


if __name__ == "__main__":
    main()
