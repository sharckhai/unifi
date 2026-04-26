"""Endpoint tests for /deal-desk/* — uses TestClient with run_agent patched out."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from unifi.api.routes import deal_desk as route
from unifi.deal_desk.agent import AgentResult
from unifi.deal_desk.schema import (
    ClauseSuggestion,
    Offer,
    OfferComparison,
    OfferHeader,
    OfferPricing,
    Scenario,
)
from unifi.main import app


def _stub_offer() -> Offer:
    return Offer(
        header=OfferHeader(
            customer_name="Test GmbH",
            robot_chosen="UR5",
            fleet_size=10,
            term_months=60,
        ),
        pricing=OfferPricing(
            base_fee_monthly_eur=6_000.0,
            eur_per_pick_min=0.0023,
            eur_per_pick_median=0.0029,
            eur_per_pick_max=0.0033,
            expected_monthly_eur=11_800.0,
            peak_monthly_eur=12_960.0,
        ),
        scenarios=[
            Scenario(
                label="heavy share rises to 30%",
                eur_per_pick=0.0040,
                delta_vs_base_pct=37.9,
                note="wear band shifts up",
            )
        ],
        clauses=[
            ClauseSuggestion(name="minimum_term", reasoning="5y unlocks pricing latitude"),
        ],
        comparison=OfferComparison(
            leasing_total_eur=462_000.0,
            unifi_base_fee_total_eur=360_000.0,
            unifi_pay_per_pick_total_eur=348_000.0,
            unifi_total_eur=708_000.0,
            cash_flow_narrative="UNIFI scales with volume",
            risk_narrative="Save ~136 k€ at -30 % volume",
        ),
        narrative="UR5 fits the profile; Pay-per-Pick beats fixed leasing on this volume.",
    )


@pytest.fixture
def patched_agent(monkeypatch):
    captured: dict[str, str] = {}

    def fake_run_agent(pdf_path: str):
        captured["pdf_path"] = pdf_path
        return AgentResult(
            offer=_stub_offer(),
            raw_text="{}",
            tool_calls=[("analyze_pdf_inquiry", {})],
        )

    monkeypatch.setattr(route, "run_agent", fake_run_agent)
    return captured


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_run_from_path_happy(client, patched_agent, tmp_path):
    pdf = tmp_path / "anna.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")

    res = client.post("/deal-desk/run-from-path", json={"pdf_path": str(pdf)})

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["offer"]["header"]["robot_chosen"] == "UR5"
    assert body["tool_calls"][0]["name"] == "analyze_pdf_inquiry"
    assert patched_agent["pdf_path"] == str(pdf.resolve())


def test_run_from_path_missing_file(client, patched_agent, tmp_path):
    res = client.post(
        "/deal-desk/run-from-path", json={"pdf_path": str(tmp_path / "nope.pdf")}
    )
    assert res.status_code == 404


def test_run_from_path_rejects_non_pdf(client, patched_agent, tmp_path):
    notpdf = tmp_path / "notes.txt"
    notpdf.write_text("hello")
    res = client.post("/deal-desk/run-from-path", json={"pdf_path": str(notpdf)})
    assert res.status_code == 400


def test_run_from_path_rejects_directory(client, patched_agent, tmp_path):
    res = client.post("/deal-desk/run-from-path", json={"pdf_path": str(tmp_path)})
    assert res.status_code in (400, 404)


def test_run_multipart_upload_happy(client, patched_agent, tmp_path):
    pdf = tmp_path / "anna.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")
    res = client.post(
        "/deal-desk/run",
        files={"pdf": ("anna.pdf", pdf.read_bytes(), "application/pdf")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["offer"]["header"]["robot_chosen"] == "UR5"


def test_run_multipart_rejects_non_pdf_content_type(client, patched_agent, tmp_path):
    res = client.post(
        "/deal-desk/run",
        files={"pdf": ("notes.txt", b"hello", "text/plain")},
    )
    assert res.status_code == 400


def test_existing_fixture_pdf_resolves(client, patched_agent):
    """Frontend's expected calling pattern with a fixture path."""
    fixture = (
        Path(__file__).parent / "fixtures" / "deal-desk" / "anna_query_a.pdf"
    )
    assert fixture.exists()
    res = client.post("/deal-desk/run-from-path", json={"pdf_path": str(fixture)})
    assert res.status_code == 200
