"""Render the deal-desk fixture inquiries (Markdown) to PDF.

Reads all `*.md` files under `apps/backend/tests/fixtures/deal-desk/` and
emits a sibling `*.pdf` for each. Minimal Markdown subset: first `# H1`
becomes the document title, blank-line-separated paragraphs become body
paragraphs. Anything else is treated as plain text.

Run from the backend root:
    uv run python -m unifi.scripts.build_deal_desk_fixtures
"""

from __future__ import annotations

import argparse
import pathlib

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

DEFAULT_FIXTURES_DIR = (
    pathlib.Path(__file__).resolve().parents[3]
    / "tests"
    / "fixtures"
    / "deal-desk"
)


def parse_markdown(text: str) -> tuple[str, list[str]]:
    title = ""
    paragraphs: list[str] = []
    current: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not title and line.startswith("# "):
            title = line[2:].strip()
            continue
        if line == "":
            if current:
                paragraphs.append(" ".join(current).strip())
                current = []
            continue
        current.append(line)
    if current:
        paragraphs.append(" ".join(current).strip())
    return title, paragraphs


def render_pdf(md_path: pathlib.Path, pdf_path: pathlib.Path) -> None:
    title, paragraphs = parse_markdown(md_path.read_text())

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        fontSize=16,
        leading=20,
        spaceAfter=18,
    )
    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["BodyText"],
        fontSize=11,
        leading=15,
        spaceAfter=10,
    )

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title=title or md_path.stem,
        author="Anna Becker",
    )

    story = []
    if title:
        story.append(Paragraph(title, title_style))
    for paragraph in paragraphs:
        story.append(Paragraph(paragraph, body_style))
        story.append(Spacer(1, 0.1 * cm))

    doc.build(story)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fixtures-dir",
        type=pathlib.Path,
        default=DEFAULT_FIXTURES_DIR,
        help="Directory containing the *.md inquiry sources.",
    )
    args = parser.parse_args()

    md_files = sorted(args.fixtures_dir.glob("*.md"))
    if not md_files:
        raise SystemExit(f"No *.md files found in {args.fixtures_dir}")

    for md in md_files:
        pdf = md.with_suffix(".pdf")
        render_pdf(md, pdf)
        print(f"wrote {pdf.relative_to(args.fixtures_dir.parent.parent.parent.parent)}")


if __name__ == "__main__":
    main()
