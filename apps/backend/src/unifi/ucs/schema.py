"""UCS — Unifi Certification Standard.

Drei Ebenen:
- UcsDatasheet:        Roboter-Stammdaten (Normalisierungs-Basis).
- UcsTelemetrySample:  eine Zeitreihen-Probe (UCS-gemappt, vor Aggregation).
- UcsFeatures:         dimensionslose Modell-Inputs (das, was LightGBM sieht).

Die Reihenfolge der Felder in UcsFeatures ist die autoritative
Feature-Reihenfolge fürs Modell und wird neben dem Booster persistiert.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RobotClass = Literal["scara", "cobot", "parallel", "gantry"]
ThermalState = Literal["cold", "warm"]
PayloadClass = Literal["light", "heavy"]


class UcsDatasheet(BaseModel):
    """Roboter-Stammdaten als Normalisierungs-Basis.

    Diese Werte fließen in die Feature-Normalisierung (z.B. `actual_current /
    rated_current_a`) und in die Kosten-Engine (Kapital, Wartung). Sie sind
    nicht der Wear-Multiplier — der kommt live aus dem ML-Modell.
    """

    model_config = ConfigDict(extra="forbid")

    model: str
    manufacturer: str
    robot_class: RobotClass
    cost_new_eur: float = Field(gt=0)
    nominal_picks_lifetime: int = Field(gt=0)
    rated_current_a: float = Field(gt=0)
    rated_torque_nm: float = Field(gt=0)
    rated_cycle_time_s: float = Field(gt=0)
    rated_payload_kg: float = Field(gt=0)
    nominal_duty_cycle: float = Field(default=0.8, gt=0, le=1)
    maintenance_cost_pct_per_year: float = Field(default=0.05, ge=0, le=1)
    power_consumption_w: float | None = Field(default=None, ge=0)


class UcsTelemetrySample(BaseModel):
    """Eine Zeitreihen-Probe nach UCS-Mapping, vor Window-Aggregation.

    Joint-Listen sind so lang wie der Roboter Joints hat (UR5: 6, SCARA: 4).
    Optionale Felder dürfen fehlen, wenn der Roboter sie nicht liefert.
    """

    model_config = ConfigDict(extra="forbid")

    t_s: float = Field(ge=0, description="Zeitstempel in Sekunden seit Run-Start.")
    joint_currents: list[float] = Field(min_length=1, description="Ampere pro Joint.")
    joint_positions: list[float] = Field(min_length=1, description="Radian pro Joint.")
    joint_velocities: list[float] = Field(min_length=1, description="rad/s pro Joint.")
    joint_temperatures: list[float] = Field(min_length=1, description="°C pro Joint.")
    joint_torques: list[float] | None = Field(default=None, description="Nm pro Joint.")
    tcp_force: list[float] | None = Field(
        default=None, description="[Fx, Fy, Fz, Tx, Ty, Tz] in N und Nm."
    )
    tcp_pose: list[float] | None = Field(
        default=None, description="[x, y, z, rx, ry, rz] in m und rad."
    )

    @field_validator("tcp_force", "tcp_pose")
    @classmethod
    def _check_six(cls, v: list[float] | None) -> list[float] | None:
        if v is not None and len(v) != 6:
            raise ValueError("tcp_force/tcp_pose must have exactly 6 entries")
        return v


class UcsFeatures(BaseModel):
    """Dimensionsloser Modell-Input pro Window.

    Reihenfolge der Felder ist die autoritative Feature-Reihenfolge für den
    LightGBM-Booster. Änderungen an dieser Klasse erfordern Re-Training oder
    explizite Schema-Migration.
    """

    model_config = ConfigDict(extra="forbid")

    motor_load_ratio_max: float = Field(
        ge=0, description="max_J(vMax(actual_current_J)) / rated_current_a"
    )
    motor_load_ratio_mean: float = Field(
        ge=0, description="mean_J(mean(actual_current_J)) / rated_current_a"
    )
    motor_load_ratio_std: float = Field(
        ge=0, description="Streuung des normalisierten Stroms."
    )
    cycle_intensity: float = Field(
        ge=0, description="rated_cycle_time_s / observed_cycle_time_s"
    )
    velocity_intensity_max: float = Field(
        ge=0, description="max_J(|actual_velocity_J|) / nominal_joint_velocity"
    )
    torque_load_ratio_max: float = Field(
        ge=0, description="max_J(|target_torque_J|) / rated_torque_nm"
    )
    temp_delta_normalized_max: float = Field(
        description="(max_J(joint_temp_J) − T_ref) / (T_max − T_ref)"
    )
    temp_delta_normalized_mean: float = Field(
        description="(mean_J(joint_temp_J) − T_ref) / (T_max − T_ref)"
    )
    tcp_force_norm: float = Field(
        ge=0, description="|F_xyz| / (rated_payload_kg * g)"
    )
    tracking_error_rms: float = Field(
        ge=0, description="RMS(target_pos − actual_pos), in rad."
    )
    thermal_state: ThermalState
    payload_class: PayloadClass

    @classmethod
    def feature_order(cls) -> list[str]:
        """Autoritative Spaltenreihenfolge für den Booster-Input."""
        return list(cls.model_fields.keys())
