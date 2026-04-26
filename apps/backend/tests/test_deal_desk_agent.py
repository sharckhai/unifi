"""Integration test for the Deal-Desk-Agent loop with a mocked Gemini client.

We patch `unifi.deal_desk.agent.genai.Client` so the agent runs end-to-end
without a network round-trip. The mock returns a pre-canned sequence of
function calls and a final text response with a valid Offer JSON.

This verifies:
- The agent calls the five tools in the expected order.
- The session's sequencing flag (`robots_listed`) is set before
  `get_robot_infos`.
- The final response is parsed into an `Offer` model.
"""

from __future__ import annotations

import json
import types as stdlib_types
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

from unifi.core.config import Settings
from unifi.deal_desk import agent as agent_mod
from unifi.deal_desk.schema import Inquiry, Offer, WeightMix


def _make_fc_response(name: str, args: dict[str, Any]):
    fc = stdlib_types.SimpleNamespace(name=name, args=args)
    part = stdlib_types.SimpleNamespace(function_call=fc, text=None)
    content = stdlib_types.SimpleNamespace(role="model", parts=[part])
    candidate = stdlib_types.SimpleNamespace(content=content)
    return stdlib_types.SimpleNamespace(candidates=[candidate], text=None)


def _make_text_response(text: str):
    part = stdlib_types.SimpleNamespace(function_call=None, text=text)
    content = stdlib_types.SimpleNamespace(role="model", parts=[part])
    candidate = stdlib_types.SimpleNamespace(content=content)
    return stdlib_types.SimpleNamespace(candidates=[candidate], text=text)


@dataclass
class _FakeModels:
    agent_responses: list
    inquiry_text: str
    seen_calls: list

    def generate_content(self, *, model, contents, config, **_kwargs: Any):
        is_inquiry_mode = (
            getattr(config, "response_schema", None) is not None
            and not getattr(config, "tools", None)
        )
        self.seen_calls.append({"model": model, "is_inquiry_mode": is_inquiry_mode})
        if is_inquiry_mode:
            return stdlib_types.SimpleNamespace(text=self.inquiry_text)
        if not self.agent_responses:
            raise RuntimeError("Mock ran out of agent-loop responses")
        return self.agent_responses.pop(0)


@dataclass
class _FakeClient:
    models: _FakeModels


VALID_OFFER = {
    "header": {
        "customer_name": "Nordhafen Fulfillment GmbH",
        "robot_chosen": "UR5",
        "fleet_size": 10,
        "term_months": 60,
    },
    "pricing": {
        "base_fee_monthly_eur": 6000.0,
        "eur_per_pick_min": 0.40,
        "eur_per_pick_median": 0.48,
        "eur_per_pick_max": 0.58,
        "expected_monthly_eur": 966_000.0,
        "peak_monthly_eur": 1_158_000.0,
    },
    "scenarios": [
        {
            "label": "Heavy share rises to 30%",
            "eur_per_pick": 0.55,
            "delta_vs_base_pct": 14.6,
            "note": "Heavier loads push the wear-multiplier band up.",
        }
    ],
    "clauses": [
        {
            "name": "minimum_term",
            "reasoning": "5y term unlocks pricing latitude on this volume.",
        },
        {
            "name": "termination_notice",
            "reasoning": "Medium flexibility priority — 6-month notice keeps optionality.",
        },
    ],
    "comparison": {
        "leasing_total_eur": 462_000.0,
        "unifi_base_fee_total_eur": 360_000.0,
        "unifi_pay_per_pick_total_eur": 57_600_000.0,
        "unifi_total_eur": 57_960_000.0,
        "cash_flow_narrative": "UNIFI cash flow tracks volume; leasing is fixed.",
        "risk_narrative": "At -30% volume you save ~1.4 M€ vs. fixed leasing.",
    },
    "narrative": (
        "UR5 is the right fit for this load profile. "
        "Pricing is anchored at 0.48 €/pick median. "
        "Volume-coupled cash flow protects you on slow months. "
        "Recommend bringing this to your Hausbank as an OpEx alternative."
    ),
}


@pytest.fixture
def fake_client_factory(tmp_path: Path):
    inquiry_payload = Inquiry(
        customer_name="Nordhafen Fulfillment GmbH",
        industry="e-commerce fulfillment",
        fleet_size=10,
        weight_mix=WeightMix(light_share=0.6, medium_share=0.3, heavy_share=0.1),
        is_one_time_project=False,
        expected_picks_per_month=2_000_000,
        seasonality="moderate Q4 peak, +20% for ~8 weeks",
        term_preference_months=60,
        flexibility_priority="medium",
        notes="",
    ).model_dump_json()

    agent_responses = [
        _make_fc_response("analyze_pdf_inquiry", {}),
        _make_fc_response("get_robots", {}),
        _make_fc_response("get_robot_infos", {"robot_name": "UR5"}),
        _make_fc_response(
            "get_pricing_history",
            {"robot_name": "UR5", "weight_class": "light", "timestep": "monthly"},
        ),
        _make_fc_response(
            "compare_leasing_and_unifi",
            {
                "robot_name": "UR5",
                "fleet_size": 10,
                "term_months": 60,
                "expected_picks_per_month": 2_000_000,
                "expected_eur_per_pick": 0.48,
            },
        ),
        _make_text_response(json.dumps(VALID_OFFER)),
    ]

    seen_calls: list = []
    fake = _FakeClient(
        models=_FakeModels(
            agent_responses=agent_responses,
            inquiry_text=inquiry_payload,
            seen_calls=seen_calls,
        )
    )
    return fake, seen_calls


def test_agent_runs_full_workflow(monkeypatch, tmp_path, fake_client_factory):
    fake, _ = fake_client_factory
    monkeypatch.setattr(agent_mod.genai, "Client", lambda **_kw: fake)

    pdf = tmp_path / "anna.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")

    settings = Settings()
    settings.gemini_api_key = type(
        "S", (), {"get_secret_value": lambda self: "fake"}
    )()

    streamed: list[str] = []
    result = agent_mod.run_agent(
        str(pdf),
        settings=settings,
        on_step=lambda ev: streamed.append(ev.name),
    )

    expected_sequence = [
        "analyze_pdf_inquiry",
        "get_robots",
        "get_robot_infos",
        "get_pricing_history",
        "compare_leasing_and_unifi",
    ]
    actual_names = [name for name, _ in result.tool_calls]
    assert actual_names == expected_sequence

    # AgentResult.steps mirrors tool_calls and includes per-step results.
    step_names = [event.name for event in result.steps]
    assert step_names == expected_sequence
    assert all(event.error is None for event in result.steps)
    assert all(event.result_jsonable is not None for event in result.steps)
    assert result.steps[0].turn == 1

    # on_step callback fires once per tool call, in order.
    assert streamed == expected_sequence

    assert isinstance(result.offer, Offer)
    assert result.offer.header.robot_chosen == "UR5"
    assert result.offer.header.customer_name == "Nordhafen Fulfillment GmbH"


def test_agent_strips_markdown_code_fences(monkeypatch, tmp_path, fake_client_factory):
    fake, _ = fake_client_factory
    fake.models.agent_responses[-1] = _make_text_response(
        "```json\n" + json.dumps(VALID_OFFER) + "\n```"
    )
    monkeypatch.setattr(agent_mod.genai, "Client", lambda **_kw: fake)

    pdf = tmp_path / "anna.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")

    settings = Settings()
    settings.gemini_api_key = type(
        "S", (), {"get_secret_value": lambda self: "fake"}
    )()

    result = agent_mod.run_agent(str(pdf), settings=settings)
    assert result.offer.header.customer_name == "Nordhafen Fulfillment GmbH"


def test_agent_raises_without_api_key(tmp_path):
    pdf = tmp_path / "anna.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")
    settings = Settings()
    settings.gemini_api_key = None
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        agent_mod.run_agent(str(pdf), settings=settings)
