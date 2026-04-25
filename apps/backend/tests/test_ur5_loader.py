from pathlib import Path

import pytest

from unifi.data.ur5_loader import (
    UR5_COLUMNS,
    enrich_ur5_df,
    list_ur5_files,
    load_ur5_run,
    parse_filename,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
UR5_DIR = REPO_ROOT / "data" / "nist-ur5-degradation"


@pytest.mark.parametrize(
    "name,payload,speed,coldstart,run",
    [
        ("ur5testresultfullspeedpayload16lb1_flat.csv", 16, "fullspeed", False, 1),
        ("ur5testresulthalfspeedpayload45lb3_flat.csv", 45, "halfspeed", False, 3),
        ("ur5testresultcoldstartfullspeedpayload45lb2_flat.csv", 45, "fullspeed", True, 2),
        ("ur5testresultcoldstarthalfspeedpayload45lb1_flat.csv", 45, "halfspeed", True, 1),
    ],
)
def test_parse_filename(name, payload, speed, coldstart, run):
    meta = parse_filename(name)
    assert meta.payload_lb == payload
    assert meta.speed == speed
    assert meta.coldstart == coldstart
    assert meta.run_idx == run


def test_parse_filename_rejects_garbage():
    with pytest.raises(ValueError):
        parse_filename("not_a_ur5_file.csv")


@pytest.mark.skipif(
    not (UR5_DIR / "ur5testresultfullspeedpayload16lb1_flat.csv").exists(),
    reason="UR5 dataset not present locally",
)
def test_load_ur5_run_schema():
    path = UR5_DIR / "ur5testresultfullspeedpayload16lb1_flat.csv"
    df, meta = load_ur5_run(path)
    assert tuple(df.columns) == UR5_COLUMNS
    assert len(df) > 1000
    assert meta.payload_lb == 16
    assert meta.speed == "fullspeed"
    assert meta.coldstart is False


@pytest.mark.skipif(
    not (UR5_DIR / "ur5testresultfullspeedpayload16lb1_flat.csv").exists(),
    reason="UR5 dataset not present locally",
)
def test_enrich_ur5_df_adds_tracking_error():
    path = UR5_DIR / "ur5testresultfullspeedpayload16lb1_flat.csv"
    df, _ = load_ur5_run(path)
    enriched = enrich_ur5_df(df)
    for i in range(1, 7):
        assert f"TRACKING_ERROR_J{i}" in enriched.columns
        expected = (
            df[f"ROBOT_TARGET_JOINT_POSITIONS_J{i}"]
            - df[f"ROBOT_ACTUAL_JOINT_POSITIONS_J{i}"]
        )
        assert (enriched[f"TRACKING_ERROR_J{i}"] == expected).all()


@pytest.mark.skipif(not UR5_DIR.exists(), reason="UR5 dataset not present locally")
def test_list_ur5_files_finds_all_18():
    files = list_ur5_files(UR5_DIR)
    assert len(files) == 18
