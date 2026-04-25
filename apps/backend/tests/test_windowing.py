import numpy as np
import pandas as pd

from unifi.data.windowing import aggregate_column, compute_window_aggregates, iter_windows


def test_iter_windows_basic():
    t = np.arange(0, 10.001, 0.008)  # 125 Hz, ~10 s
    df = pd.DataFrame({"ROBOT_TIME": t, "x": np.zeros_like(t)})
    windows = list(iter_windows(df, window_s=2.0))
    assert len(windows) == 5
    assert windows[0][0] == 0.0
    assert windows[0][1] == 2.0


def test_iter_windows_drops_partial_tail():
    # 9.5 s data, 2 s window → 4 full windows
    t = np.arange(0, 9.5, 0.1)
    df = pd.DataFrame({"ROBOT_TIME": t, "x": np.ones_like(t)})
    windows = list(iter_windows(df, window_s=2.0))
    assert len(windows) == 4


def test_iter_windows_relative_time():
    t = np.arange(100.0, 104.0, 0.1)
    df = pd.DataFrame({"ROBOT_TIME": t, "x": np.zeros_like(t)})
    windows = list(iter_windows(df, window_s=2.0))
    assert windows[0][0] == 0.0  # relative
    assert windows[0][1] == 2.0


def test_aggregate_column_constant():
    t = np.linspace(0, 1, 11)
    v = np.full_like(t, 3.5)
    s = aggregate_column(v, t)
    assert s["vCnt"] == 11
    assert s["vMax"] == 3.5
    assert s["vMin"] == 3.5
    assert s["value"] == 3.5
    assert s["vStd"] == 0.0
    assert abs(s["vTrend"]) < 1e-10
    assert s["vFreq"] == 10.0  # (11 − 1) / 1 s


def test_aggregate_column_linear_trend():
    t = np.linspace(0, 1, 11)
    v = 2.0 * t + 1.0  # slope = 2.0
    s = aggregate_column(v, t)
    assert abs(s["vTrend"] - 2.0) < 1e-9
    assert abs(s["vMin"] - 1.0) < 1e-9
    assert abs(s["vMax"] - 3.0) < 1e-9
    assert abs(s["value"] - 2.0) < 1e-9


def test_compute_window_aggregates_flat_keys():
    df = pd.DataFrame(
        {"ROBOT_TIME": [0.0, 0.1, 0.2], "a": [1.0, 2.0, 3.0], "b": [10.0, 20.0, 30.0]}
    )
    agg = compute_window_aggregates(df, ["a", "b"])
    assert agg["a_vMax"] == 3.0
    assert agg["a_vMin"] == 1.0
    assert agg["b_value"] == 20.0
    assert "a_vCnt" in agg
    assert "b_vCnt" in agg
