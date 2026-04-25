"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeTimelineTime, samplePose } from "./motion";
import { RobotSceneControls } from "./RobotSceneControls";
import { ROBOT_COLOR_THEMES, startRobotScene } from "./sceneSetup";
import type {
  RobotColorTheme,
  RobotSceneProps,
  SceneActions,
  SortedCubeEvent,
} from "./types";

const NORMAL_SCENE_SPEED = 1;
const FAST_SCENE_SPEED = 5;

export function RobotScene({
  time: controlledTime,
  isPlaying: controlledIsPlaying,
  onTimeChange,
  onCubeSorted,
  robotTheme = "white",
  showControls = false,
  className = "",
  canvasClassName = "h-[360px] w-full lg:h-[448px]",
}: RobotSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const onCubeSortedRef = useRef<RobotSceneProps["onCubeSorted"]>(onCubeSorted);
  const spawnCubeRef = useRef<SceneActions["spawnCube"] | null>(null);
  const resetCubesRef = useRef<SceneActions["resetCubes"] | null>(null);
  const setSpeedMultiplierRef = useRef<SceneActions["setSpeedMultiplier"] | null>(null);
  const speedMultiplierRef = useRef(NORMAL_SCENE_SPEED);
  const [internalTime, setInternalTime] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(true);
  const [isFastMode, setIsFastMode] = useState(false);
  const [selectedRobotTheme, setSelectedRobotTheme] =
    useState<RobotColorTheme>(robotTheme);
  const time = controlledTime ?? internalTime;
  const isPlaying = controlledIsPlaying ?? internalIsPlaying;
  const pose = useMemo(() => samplePose(time), [time]);
  const setSceneTime = useCallback(
    (nextTime: number | ((currentTime: number) => number)) => {
      const resolvedTime =
        typeof nextTime === "function" ? nextTime(timeRef.current) : nextTime;
      const normalizedTime = normalizeTimelineTime(resolvedTime);

      if (controlledTime === undefined) {
        setInternalTime(normalizedTime);
      }

      onTimeChange?.(normalizedTime);
    },
    [controlledTime, onTimeChange],
  );

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    onCubeSortedRef.current = onCubeSorted;
  }, [onCubeSorted]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frame = 0;
    let previousTimestamp: number | null = null;

    const advanceTimeline = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }

      const delta = (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;

      setSceneTime((currentTime) => currentTime + delta * 0.72);
      frame = window.requestAnimationFrame(advanceTimeline);
    };

    frame = window.requestAnimationFrame(advanceTimeline);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isPlaying, setSceneTime]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let cleanupScene: (() => void) | undefined;
    const handleCubeSorted = (event: SortedCubeEvent) => {
      onCubeSortedRef.current?.(event);
    };

    spawnCubeRef.current = null;
    resetCubesRef.current = null;
    setSpeedMultiplierRef.current = null;

    void startRobotScene(container, handleCubeSorted, {
      robotTheme: selectedRobotTheme,
      speedMultiplier: speedMultiplierRef.current,
    }).then((runtime) => {
      if (disposed) {
        runtime.cleanup();
        return;
      }

      spawnCubeRef.current = runtime.actions.spawnCube;
      resetCubesRef.current = runtime.actions.resetCubes;
      setSpeedMultiplierRef.current = runtime.actions.setSpeedMultiplier;
      cleanupScene = runtime.cleanup;
    });

    return () => {
      disposed = true;
      spawnCubeRef.current = null;
      resetCubesRef.current = null;
      setSpeedMultiplierRef.current = null;
      cleanupScene?.();
    };
  }, [selectedRobotTheme]);

  const handleSpeedToggle = () => {
    setIsFastMode((current) => {
      const nextIsFastMode = !current;
      const nextSpeedMultiplier = nextIsFastMode ? FAST_SCENE_SPEED : NORMAL_SCENE_SPEED;

      speedMultiplierRef.current = nextSpeedMultiplier;
      setSpeedMultiplierRef.current?.(nextSpeedMultiplier);
      return nextIsFastMode;
    });
  };

  return (
    <div
      className={`relative overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-inner ${className}`}
    >
      <div
        ref={containerRef}
        className={canvasClassName}
        aria-label="Animierte 3D-Ansicht eines UR5-Roboters mit Telemetrie-Datenring"
      />

      <div className="absolute right-4 top-4 z-30 flex gap-2">
        <label className="flex items-center gap-2 border border-slate-300/70 bg-white/80 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur">
          Theme
          <select
            value={selectedRobotTheme}
            onChange={(event) =>
              setSelectedRobotTheme(event.target.value as RobotColorTheme)
            }
            className="bg-transparent text-slate-900 outline-none"
            aria-label="Robot theme"
          >
            {ROBOT_COLOR_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => spawnCubeRef.current?.()}
          className="border border-blue-500/30 bg-white/80 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition hover:bg-blue-50"
        >
          Spawn Cube
        </button>
        <button
          type="button"
          onClick={handleSpeedToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${
            isFastMode
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
          }`}
        >
          {isFastMode ? "Normal Speed" : "5x Speed"}
        </button>
        <button
          type="button"
          onClick={() => resetCubesRef.current?.()}
          className="border border-slate-300/70 bg-white/80 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition hover:bg-slate-50"
        >
          Reset Cubes
        </button>
      </div>

      {showControls ? (
        <RobotSceneControls
          time={time}
          isPlaying={isPlaying}
          pose={pose}
          onPlayToggle={() => setInternalIsPlaying((current) => !current)}
          onTimeChange={(nextTime) => {
            setInternalIsPlaying(false);
            setSceneTime(nextTime);
          }}
        />
      ) : null}
    </div>
  );
}
