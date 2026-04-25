"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeTimelineTime, samplePose } from "./motion";
import { RobotSceneControls } from "./RobotSceneControls";
import { startRobotScene } from "./sceneSetup";
import type { SceneActions, RobotSceneProps } from "./types";

export function RobotScene({
  time: controlledTime,
  isPlaying: controlledIsPlaying,
  onTimeChange,
  showControls = false,
  className = "",
  canvasClassName = "h-[360px] w-full lg:h-[448px]",
}: RobotSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const isPlayingRef = useRef(true);
  const spawnCubeRef = useRef<SceneActions["spawnCube"] | null>(null);
  const resetCubesRef = useRef<SceneActions["resetCubes"] | null>(null);
  const [internalTime, setInternalTime] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(true);
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
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

    void startRobotScene(container, isPlayingRef).then((runtime) => {
      if (disposed) {
        runtime.cleanup();
        return;
      }

      spawnCubeRef.current = runtime.actions.spawnCube;
      resetCubesRef.current = runtime.actions.resetCubes;
      cleanupScene = runtime.cleanup;
    });

    return () => {
      disposed = true;
      spawnCubeRef.current = null;
      resetCubesRef.current = null;
      cleanupScene?.();
    };
  }, []);

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
        <button
          type="button"
          onClick={() => spawnCubeRef.current?.()}
          className="border border-blue-500/30 bg-white/80 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition hover:bg-blue-50"
        >
          Spawn Cube
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
