import { JOINT_DEFINITIONS, TIMELINE_DURATION } from "./constants";
import type { JointPose } from "./types";

type RobotSceneControlsProps = {
  time: number;
  isPlaying: boolean;
  pose: JointPose;
  onPlayToggle: () => void;
  onTimeChange: (time: number) => void;
};

export function RobotSceneControls({
  time,
  isPlaying,
  pose,
  onPlayToggle,
  onTimeChange,
}: RobotSceneControlsProps) {
  const playheadPosition = (time / TIMELINE_DURATION) * 100;

  return (
    <div className="border-t border-slate-200 bg-white/80 p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600/80">
            Gelenk-Zeitachse
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Scrubbe die Sequenz oder spiele die Live-Bewegung ab.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPlayToggle}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            {isPlaying ? "Pause" : "Abspielen"}
          </button>
          <span className="font-mono text-sm text-slate-600">
            {time.toFixed(1)}s / {TIMELINE_DURATION.toFixed(0)}s
          </span>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max={TIMELINE_DURATION}
        step="0.05"
        value={time}
        onChange={(event) => onTimeChange(Number(event.target.value))}
        className="mb-5 h-2 w-full cursor-pointer accent-blue-600"
        aria-label="Zeitachse scrubben"
      />

      <div className="space-y-3">
        {JOINT_DEFINITIONS.map((joint) => {
          const currentAngle = pose[joint.id];

          return (
            <div
              key={joint.id}
              className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[8rem_1fr_4.5rem] md:items-center"
            >
              <div className="font-medium text-slate-700">{joint.label}</div>
              <div className="relative h-3 rounded-full bg-slate-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-40"
                  style={{
                    width: `${playheadPosition}%`,
                    backgroundColor: joint.color,
                  }}
                />
                {joint.keyframes.map((keyframe) => (
                  <span
                    key={`${joint.id}-${keyframe.time}`}
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                    style={{
                      left: `${(keyframe.time / TIMELINE_DURATION) * 100}%`,
                      backgroundColor: joint.color,
                    }}
                  />
                ))}
                <span
                  className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 shadow-lg shadow-slate-900/20"
                  style={{ left: `${playheadPosition}%` }}
                />
              </div>
              <div className="font-mono text-slate-600 md:text-right">
                {Math.round(currentAngle)}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
