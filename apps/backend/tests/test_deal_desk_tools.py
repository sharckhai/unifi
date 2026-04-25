"""Unit tests for the deal-desk tools.

These tests exercise the pure tool logic against the catalog. They do not
require Gemini — `analyze_pdf_inquiry` is the only tool that calls the
client, and we use a tiny fake to avoid a network round-trip.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import pytest

from unifi.deal_desk import catalog
from unifi.deal_desk.schema import Inquiry, WeightMix
from unifi.deal_desk.tools import (
    SequencingError,
    ToolSession,
    analyze_pdf_inquiry,
    get_pricing_history,
    get_robot_infos,
    get_robots,
    compare_leasing_and_unifi,
)


@dataclass
class _FakeModels:
    response_text: str

    def generate_content(self, **_kwargs: Any) -> Any:
        return type("FakeResponse", (), {"text": self.response_text})()


@dataclass
class _FakeClient:
    models: _FakeModels


def _session(client: Any = None) -> ToolSession:
    return ToolSession(client=client, model="gemini-2.5-flash")


def test_get_robots_lists_both_catalog_entries():
    session = _session()
    robots = get_robots(session)
    names = {r.name for r in robots}
    assert names == {"UR5", "SCARA"}
    assert session.robots_listed is True


def test_get_robot_infos_raises_before_get_robots():
    session = _session()
    with pytest.raises(SequencingError):
        get_robot_infos("UR5", session)


def test_get_robot_infos_returns_full_info_after_get_robots():
    session = _session()
    get_robots(session)
    info = get_robot_infos("UR5", session)
    assert info.name == "UR5"
    assert info.robot_class == "cobot"
    assert info.suitable_for
    assert info.not_suitable_for


def test_get_robot_infos_unknown_robot_raises():
    session = _session()
    get_robots(session)
    with pytest.raises(KeyError):
        get_robot_infos("UNKNOWN", session)


def test_pricing_curve_has_four_points_and_sane_range():
    curve = get_pricing_history("UR5", "medium", "monthly")
    assert len(curve.points) == 4
    assert curve.range_low_eur_per_pick < curve.median_eur_per_pick < curve.range_high_eur_per_pick
    assert curve.timestep_granularity == "monthly"


def test_pricing_curve_heavy_costs_more_than_light_at_top_of_range():
    light = get_pricing_history("UR5", "light", "monthly")
    heavy = get_pricing_history("UR5", "heavy", "monthly")
    assert heavy.range_high_eur_per_pick > light.range_high_eur_per_pick


def test_pricing_curve_scales_with_wear_multiplier_within_class():
    curve = get_pricing_history("UR5", "heavy", "monthly")
    multipliers = [p.wear_rate_multiplier for p in curve.points]
    prices = [p.eur_per_pick for p in curve.points]
    assert multipliers == sorted(multipliers)
    assert prices == sorted(prices)


def test_compare_leasing_and_unifi_basic_shape():
    result = compare_leasing_and_unifi(
        robot_name="UR5",
        fleet_size=10,
        term_months=60,
        expected_picks_per_month=2_000_000,
        expected_eur_per_pick=0.50,
    )
    assert result.leasing.cash_flow_profile == "fixed"
    assert result.unifi.cash_flow_profile == "volume_coupled"
    assert result.unifi.expected_monthly_eur == pytest.approx(2_000_000 * 0.50)
    assert result.unifi.monthly_low_eur < result.unifi.expected_monthly_eur
    assert result.unifi.monthly_high_eur > result.unifi.expected_monthly_eur


def test_compare_break_even_volume_consistent():
    """Break-even volume × €/pick must equal leasing monthly payment."""
    result = compare_leasing_and_unifi(
        robot_name="UR5",
        fleet_size=10,
        term_months=60,
        expected_picks_per_month=2_000_000,
        expected_eur_per_pick=0.50,
    )
    expected_break_even = result.leasing.monthly_payment_eur / 0.50
    assert result.break_even_volume_picks_per_month == pytest.approx(expected_break_even)


def test_compare_uses_catalog_leasing_factor():
    result = compare_leasing_and_unifi(
        robot_name="UR5",
        fleet_size=10,
        term_months=60,
        expected_picks_per_month=2_000_000,
        expected_eur_per_pick=0.50,
    )
    expected_leasing_monthly = (
        catalog.UR5_DATASHEET.cost_new_eur * 10 * catalog.MONTHLY_LEASING_FACTOR
    )
    assert result.leasing.monthly_payment_eur == pytest.approx(expected_leasing_monthly)


def test_analyze_pdf_inquiry_round_trips_through_fake_client(tmp_path):
    pdf = tmp_path / "x.pdf"
    pdf.write_bytes(b"%PDF-1.4 dummy")
    payload = Inquiry(
        customer_name="Test GmbH",
        industry="testing",
        fleet_size=5,
        weight_mix=WeightMix(light_share=0.5, medium_share=0.4, heavy_share=0.1),
        expected_picks_per_month=500_000,
        seasonality="none",
        term_preference_months=36,
        flexibility_priority="medium",
        notes="",
    ).model_dump_json()
    client = _FakeClient(models=_FakeModels(response_text=payload))
    session = ToolSession(client=client, model="gemini-2.5-flash")
    result = analyze_pdf_inquiry(str(pdf), session)
    assert result.customer_name == "Test GmbH"
    assert result.weight_mix.medium_share == 0.4
    assert json.loads(payload)["customer_name"] == "Test GmbH"
