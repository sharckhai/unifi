"""Backend settings.

Pfade sind relativ zum Repo-Root (zwei Ebenen über `apps/backend/src/`)
ableitbar; lassen sich per Env-Var überschreiben.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[5]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="UNIFI_", extra="ignore")

    data_dir: Path = REPO_ROOT / "data"
    ur5_dir: Path = REPO_ROOT / "data" / "nist-ur5-degradation"
    ur5_datasheet_path: Path = (
        REPO_ROOT / "data" / "nist-ur5-degradation" / "datasheets" / "ur5_datasheet.json"
    )
    artifacts_dir: Path = REPO_ROOT / "apps" / "backend" / "artifacts"


def get_settings() -> Settings:
    return Settings()
