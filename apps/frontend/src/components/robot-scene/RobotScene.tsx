"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeTimelineTime, samplePose } from "./motion";
import { RobotSceneControls } from "./RobotSceneControls";
import { ROBOT_COLOR_THEMES, startRobotScene } from "./sceneSetup";
import type {
  CameraViewMode,
  PickCostEffectPayload,
  RobotColorTheme,
  RobotSceneProps,
  SceneActions,
  SortedCubeEvent,
} from "./types";

const NORMAL_SCENE_SPEED = 1;
const FAST_SCENE_SPEED = 5;
const CAMERA_VIEW_MODES: Array<{ id: CameraViewMode; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "robotHero", label: "Robot Hero" },
  { id: "cinematic", label: "Cinematic" },
  { id: "povAction", label: "POV Action" },
  { id: "armLogo", label: "Tech Europe" },
];

export function RobotScene({
  time: controlledTime,
  isPlaying: controlledIsPlaying,
  onTimeChange,
  onCubeSorted,
  pickCostEffect,
  robotTheme = "white",
  showControls = false,
  className = "",
  canvasClassName = "h-[360px] w-full lg:h-[448px]",
}: RobotSceneProps) {
  const sceneShellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const onCubeSortedRef = useRef<RobotSceneProps["onCubeSorted"]>(onCubeSorted);
  const spawnCubeRef = useRef<SceneActions["spawnCube"] | null>(null);
  const resetCubesRef = useRef<SceneActions["resetCubes"] | null>(null);
  const setSpeedMultiplierRef = useRef<SceneActions["setSpeedMultiplier"] | null>(null);
  const setCameraViewModeRef = useRef<SceneActions["setCameraViewMode"] | null>(null);
  const setBinLabelsVisibleRef =
    useRef<SceneActions["setBinLabelsVisible"] | null>(null);
  const setCostParticlesEnabledRef =
    useRef<SceneActions["setCostParticlesEnabled"] | null>(null);
  const setSoundEnabledRef = useRef<SceneActions["setSoundEnabled"] | null>(null);
  const showPickCostEffectRef = useRef<SceneActions["showPickCostEffect"] | null>(null);
  const pendingPickCostEffectRef = useRef<PickCostEffectPayload | null>(null);
  const speedMultiplierRef = useRef(NORMAL_SCENE_SPEED);
  const cameraViewModeRef = useRef<CameraViewMode>("normal");
  const binLabelsVisibleRef = useRef(true);
  const costParticlesEnabledRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const [internalTime, setInternalTime] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(true);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [areBinLabelsVisible, setAreBinLabelsVisible] = useState(true);
  const [areCostParticlesEnabled, setAreCostParticlesEnabled] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [selectedCameraViewMode, setSelectedCameraViewMode] =
    useState<CameraViewMode>("normal");
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
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === sceneShellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
    setCameraViewModeRef.current = null;
    setBinLabelsVisibleRef.current = null;
    setCostParticlesEnabledRef.current = null;
    setSoundEnabledRef.current = null;
    showPickCostEffectRef.current = null;

    void startRobotScene(container, handleCubeSorted, {
      robotTheme: selectedRobotTheme,
      speedMultiplier: speedMultiplierRef.current,
      cameraViewMode: cameraViewModeRef.current,
      binLabelsVisible: binLabelsVisibleRef.current,
      costParticlesEnabled: costParticlesEnabledRef.current,
    }).then((runtime) => {
      if (disposed) {
        runtime.cleanup();
        return;
      }

      spawnCubeRef.current = runtime.actions.spawnCube;
      resetCubesRef.current = runtime.actions.resetCubes;
      setSpeedMultiplierRef.current = runtime.actions.setSpeedMultiplier;
      setCameraViewModeRef.current = runtime.actions.setCameraViewMode;
      setBinLabelsVisibleRef.current = runtime.actions.setBinLabelsVisible;
      setCostParticlesEnabledRef.current = runtime.actions.setCostParticlesEnabled;
      setSoundEnabledRef.current = runtime.actions.setSoundEnabled;
      showPickCostEffectRef.current = runtime.actions.showPickCostEffect;
      runtime.actions.setSoundEnabled(soundEnabledRef.current);

      if (pendingPickCostEffectRef.current) {
        runtime.actions.showPickCostEffect(pendingPickCostEffectRef.current);
        pendingPickCostEffectRef.current = null;
      }

      cleanupScene = runtime.cleanup;
    });

    return () => {
      disposed = true;
      spawnCubeRef.current = null;
      resetCubesRef.current = null;
      setSpeedMultiplierRef.current = null;
      setCameraViewModeRef.current = null;
      setBinLabelsVisibleRef.current = null;
      setCostParticlesEnabledRef.current = null;
      setSoundEnabledRef.current = null;
      showPickCostEffectRef.current = null;
      cleanupScene?.();
    };
  }, [selectedRobotTheme]);

  useEffect(() => {
    if (!pickCostEffect) {
      return;
    }

    if (showPickCostEffectRef.current) {
      showPickCostEffectRef.current(pickCostEffect);
      return;
    }

    pendingPickCostEffectRef.current = pickCostEffect;
  }, [pickCostEffect]);

  const handleSpeedToggle = () => {
    setIsFastMode((current) => {
      const nextIsFastMode = !current;
      const nextSpeedMultiplier = nextIsFastMode ? FAST_SCENE_SPEED : NORMAL_SCENE_SPEED;

      speedMultiplierRef.current = nextSpeedMultiplier;
      setSpeedMultiplierRef.current?.(nextSpeedMultiplier);
      return nextIsFastMode;
    });
  };

  const handleCameraViewToggle = () => {
    setSelectedCameraViewMode((currentCameraViewMode) => {
      const currentIndex = CAMERA_VIEW_MODES.findIndex(
        (mode) => mode.id === currentCameraViewMode,
      );
      const nextCameraViewMode =
        CAMERA_VIEW_MODES[(currentIndex + 1) % CAMERA_VIEW_MODES.length].id;

      cameraViewModeRef.current = nextCameraViewMode;
      setCameraViewModeRef.current?.(nextCameraViewMode);
      return nextCameraViewMode;
    });
  };

  const handleFullscreenToggle = () => {
    const sceneShell = sceneShellRef.current;

    if (!sceneShell) {
      return;
    }

    if (document.fullscreenElement === sceneShell) {
      void document.exitFullscreen();
      return;
    }

    void sceneShell.requestFullscreen();
  };

  const handleCostParticlesToggle = () => {
    setAreCostParticlesEnabled((current) => {
      const nextEnabled = !current;

      costParticlesEnabledRef.current = nextEnabled;
      setCostParticlesEnabledRef.current?.(nextEnabled);
      return nextEnabled;
    });
  };

  const handleBinLabelsToggle = () => {
    setAreBinLabelsVisible((current) => {
      const nextVisible = !current;

      binLabelsVisibleRef.current = nextVisible;
      setBinLabelsVisibleRef.current?.(nextVisible);
      return nextVisible;
    });
  };

  const handleSoundToggle = () => {
    setIsSoundEnabled((current) => {
      const nextEnabled = !current;

      soundEnabledRef.current = nextEnabled;
      setSoundEnabledRef.current?.(nextEnabled);
      return nextEnabled;
    });
  };

  const selectedCameraViewLabel =
    CAMERA_VIEW_MODES.find((mode) => mode.id === selectedCameraViewMode)?.label ??
    "Normal";
  const isCinematicView = selectedCameraViewMode === "cinematic";
  const isRobotHeroView = selectedCameraViewMode === "robotHero";
  const isPovView = selectedCameraViewMode === "povAction";
  const isPovActionView = selectedCameraViewMode === "povAction";
  const isArmLogoView = selectedCameraViewMode === "armLogo";
  const showVideoOverlay = selectedCameraViewMode !== "normal";

  return (
    <div
      ref={sceneShellRef}
      className={`robot-scene-shell relative overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-inner ${className}`}
    >
      <div
        ref={containerRef}
        className={canvasClassName}
        aria-label="Animierte 3D-Ansicht eines UR5-Roboters mit Telemetrie-Datenring"
      />

      {showVideoOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(15,23,42,0.34)_100%)]" />
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${isPovActionView ? "opacity-35" : "opacity-15"
              }`}
            style={{
              backgroundImage:
                "linear-gradient(rgba(31,85,255,0.18) 1px, transparent 1px)",
              backgroundSize: "100% 6px",
            }}
          />
          {isRobotHeroView ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(15,23,42,0.42)_100%)]" />
              <div className="absolute -left-1/4 top-1/4 h-20 w-1/2 -rotate-12 bg-blue-500/10 blur-2xl" />
              <div className="absolute -right-1/4 bottom-1/4 h-20 w-1/2 -rotate-12 bg-cyan-300/10 blur-2xl" />
            </>
          ) : null}
          <div
            className={`absolute inset-x-0 top-0 h-12 bg-slate-950/85 transition-opacity duration-500 ${isCinematicView ? "opacity-100" : "opacity-0"
              }`}
          />
          <div
            className={`absolute inset-x-0 bottom-0 h-12 bg-slate-950/85 transition-opacity duration-500 ${isCinematicView ? "opacity-100" : "opacity-0"
              }`}
          />

          <div className="absolute left-4 top-4 flex items-center gap-2 border border-white/20 bg-slate-950/35 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.95)]" />
            REC / {selectedCameraViewLabel}
          </div>

          {isPovView ? (
            <>
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 border border-white/30" />
              <div className="absolute left-1/2 top-1/2 h-px w-28 -translate-x-1/2 bg-white/35" />
              <div className="absolute left-1/2 top-1/2 h-28 w-px -translate-y-1/2 bg-white/35" />
              <div className="absolute bottom-4 left-4 border border-white/20 bg-slate-950/35 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
                Tool cam / stabilizer {isPovActionView ? "off" : "on"}
              </div>
            </>
          ) : null}

          {isArmLogoView ? (
            <div className="absolute bottom-4 left-4 border border-white/20 bg-slate-950/35 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
              Forearm brand cam / Tech Europe
            </div>
          ) : null}

          {isRobotHeroView ? (
            <div className="absolute bottom-4 left-4 border border-white/20 bg-slate-950/35 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
              Aggro hero / robot edit
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
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
          onClick={handleCameraViewToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${selectedCameraViewMode === "normal"
              ? "border-slate-300/70 bg-white/80 text-slate-600 hover:bg-slate-50"
              : "border-blue-500/30 bg-blue-50/90 text-blue-700 hover:bg-blue-100"
            }`}
          aria-label={`Camera view: ${selectedCameraViewLabel}`}
        >
          Camera {selectedCameraViewLabel}
        </button>
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
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${isFastMode
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
            }`}
        >
          {isFastMode ? "Normal Speed" : "5x Speed"}
        </button>
        <button
          type="button"
          onClick={handleBinLabelsToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${areBinLabelsVisible
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
            }`}
          aria-pressed={areBinLabelsVisible}
        >
          {areBinLabelsVisible ? "Tags On" : "Tags Off"}
        </button>
        <button
          type="button"
          onClick={handleCostParticlesToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${areCostParticlesEnabled
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
            }`}
        >
          {areCostParticlesEnabled ? "Particles On" : "Particles"}
        </button>
        <button
          type="button"
          onClick={handleSoundToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${isSoundEnabled
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
            }`}
          aria-pressed={isSoundEnabled}
        >
          {isSoundEnabled ? "Sound On" : "Sound"}
        </button>
        <button
          type="button"
          onClick={handleFullscreenToggle}
          className={`border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(23,32,51,0.12)] backdrop-blur transition ${isFullscreen
              ? "border-emerald-500/40 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
              : "border-blue-500/30 bg-white/80 text-blue-700 hover:bg-blue-50"
            }`}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
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
