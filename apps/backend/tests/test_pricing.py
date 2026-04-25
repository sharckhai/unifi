"""Pricing-Engine-Tests — Customer-Price-Stack auf Cost-Breakdown."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from unifi.cost.engine import compute_customer_pricing
from unifi.cost.schema import CostBreakdown, PricingConfig


def _cost(total: float = 0.0021) -> CostBreakdown:
    return CostBreakdown(
        energy_eur=total * 0.4,
        wear_eur=total * 0.3,
        capital_eur=total * 0.2,
        maintenance_eur=total * 0.1,
        total_eur=total,
        wear_rate_multiplier=1.0,
        picks_per_year_used=2_000_000,
        power_w_used=150.0,
    )


def test_default_uplift_is_40_percent():
    p = compute_customer_pricing(cost=_cost(0.0021))
    assert p.production_cost_eur_per_pick == pytest.approx(0.0021)
    assert p.service_fee_eur_per_pick == pytest.approx(0.0021 * 0.15)
    assert p.operator_margin_eur_per_pick == pytest.approx(0.0021 * 0.25)
    assert p.customer_price_eur_per_pick == pytest.approx(0.0021 * 1.40)
    assert p.total_uplift_pct == pytest.approx(0.40)


def test_zero_service_fee():
    p = compute_customer_pricing(
        cost=_cost(0.005),
        pricing=PricingConfig(service_fee_pct=0.0, operator_margin_pct=0.25),
    )
    assert p.service_fee_eur_per_pick == 0.0
    assert p.customer_price_eur_per_pick == pytest.approx(0.005 * 1.25)


def test_zero_operator_margin():
    p = compute_customer_pricing(
        cost=_cost(0.005),
        pricing=PricingConfig(service_fee_pct=0.20, operator_margin_pct=0.0),
    )
    assert p.operator_margin_eur_per_pick == 0.0
    assert p.customer_price_eur_per_pick == pytest.approx(0.005 * 1.20)


def test_total_uplift_pct_is_sum():
    p = compute_customer_pricing(
        cost=_cost(0.001),
        pricing=PricingConfig(service_fee_pct=0.10, operator_margin_pct=0.30),
    )
    assert p.total_uplift_pct == pytest.approx(0.40)


def test_customer_price_identity():
    """customer_price == production + service + margin (für beliebige Config)."""
    cost = _cost(0.00731)
    cfg = PricingConfig(service_fee_pct=0.18, operator_margin_pct=0.42)
    p = compute_customer_pricing(cost=cost, pricing=cfg)
    assert p.customer_price_eur_per_pick == pytest.approx(
        p.production_cost_eur_per_pick
        + p.service_fee_eur_per_pick
        + p.operator_margin_eur_per_pick
    )


def test_pricing_config_rejects_extra_fields():
    """extra='forbid' verhindert Tippfehler-Fields."""
    with pytest.raises(ValidationError):
        PricingConfig(service_fee_pct=0.10, foo=0.5)
