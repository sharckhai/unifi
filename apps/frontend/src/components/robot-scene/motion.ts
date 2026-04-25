import * as THREE from "three";
import {
  ARM_FORWARD_YAW_OFFSET_DEGREES,
  HOME_POSE,
  JOINT_DEFINITIONS,
  ROBOT_FOREARM_LENGTH,
  ROBOT_SHOULDER_PIVOT_HEIGHT,
  ROBOT_TOOL_PINCH_REACH,
  ROBOT_UPPER_ARM_LENGTH,
  TIMELINE_DURATION,
} from "./constants";
import type { JointKeyframe, JointPose, RobotRig } from "./types";

const PLANAR_LINKS = [
  ROBOT_UPPER_ARM_LENGTH,
  ROBOT_FOREARM_LENGTH,
  ROBOT_TOOL_PINCH_REACH,
];
const PLANAR_JOINTS = ["shoulderPitch", "elbowPitch", "wrist1Pitch"] as const;
const PLANAR_JOINT_LIMITS = {
  shoulderPitch: { min: -95, max: 75 },
  elbowPitch: { min: -25, max: 130 },
  wrist1Pitch: { min: -110, max: 105 },
};
const IK_ITERATIONS = 10;

export function normalizeTimelineTime(time: number) {
  return ((time % TIMELINE_DURATION) + TIMELINE_DURATION) % TIMELINE_DURATION;
}

function interpolateKeyframes(keyframes: JointKeyframe[], time: number) {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= time);

  if (nextIndex <= 0) {
    return keyframes[0].value;
  }

  const previous = keyframes[nextIndex - 1];
  const next = keyframes[nextIndex];
  const progress = (time - previous.time) / (next.time - previous.time);

  return previous.value + (next.value - previous.value) * progress;
}

export function samplePose(time: number): JointPose {
  const timelineTime = normalizeTimelineTime(time);

  return JOINT_DEFINITIONS.reduce((pose, joint) => {
    pose[joint.id] = interpolateKeyframes(joint.keyframes, timelineTime);
    return pose;
  }, {} as JointPose);
}

export function toRadians(degrees: number) {
  return THREE.MathUtils.degToRad(degrees);
}

export function toDegrees(radians: number) {
  return THREE.MathUtils.radToDeg(radians);
}

export function clampPolarAngle(angle: number) {
  return THREE.MathUtils.clamp(angle, 0.42, Math.PI / 2.05);
}

export function easeInOut(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

export function polarPoint(radius: number, angleDegrees: number, y = 0) {
  const angle = toRadians(angleDegrees);
  return new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
}

function normalizeAngleDegrees(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

export function isAngleBetween(angle: number, start: number, end: number) {
  const normalizedAngle = normalizeAngleDegrees(angle);
  const normalizedStart = normalizeAngleDegrees(start);
  const normalizedEnd = normalizeAngleDegrees(end);

  if (normalizedStart <= normalizedEnd) {
    return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd;
  }

  return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd;
}

export function lerpPose(current: JointPose, target: JointPose, alpha: number): JointPose {
  return JOINT_DEFINITIONS.reduce((pose, joint) => {
    pose[joint.id] = THREE.MathUtils.lerp(current[joint.id], target[joint.id], alpha);
    return pose;
  }, {} as JointPose);
}

type PlanarPoint = {
  radial: number;
  vertical: number;
};

function getPlanarJointPositions(angles: number[]) {
  const points: PlanarPoint[] = [{ radial: 0, vertical: 0 }];
  let cumulativeAngle = 0;
  let radial = 0;
  let vertical = 0;

  PLANAR_LINKS.forEach((length, index) => {
    cumulativeAngle += toRadians(angles[index]);
    radial += Math.sin(cumulativeAngle) * length;
    vertical += Math.cos(cumulativeAngle) * length;
    points.push({ radial, vertical });
  });

  return points;
}

function solvePlanarPinchAngles(target: PlanarPoint, seedPose?: JointPose) {
  const angles = PLANAR_JOINTS.map((jointId) => seedPose?.[jointId] ?? HOME_POSE[jointId]);

  for (let iteration = 0; iteration < IK_ITERATIONS; iteration += 1) {
    for (let jointIndex = PLANAR_JOINTS.length - 1; jointIndex >= 0; jointIndex -= 1) {
      const points = getPlanarJointPositions(angles);
      const joint = points[jointIndex];
      const end = points[points.length - 1];
      const currentVector = {
        radial: end.radial - joint.radial,
        vertical: end.vertical - joint.vertical,
      };
      const targetVector = {
        radial: target.radial - joint.radial,
        vertical: target.vertical - joint.vertical,
      };
      const currentLength = Math.hypot(currentVector.radial, currentVector.vertical);
      const targetLength = Math.hypot(targetVector.radial, targetVector.vertical);

      if (currentLength < 0.001 || targetLength < 0.001) {
        continue;
      }

      const currentAngle = Math.atan2(currentVector.radial, currentVector.vertical);
      const targetAngle = Math.atan2(targetVector.radial, targetVector.vertical);
      const angleDelta = normalizeAngleDegrees(toDegrees(targetAngle - currentAngle));
      const jointId = PLANAR_JOINTS[jointIndex];
      const limits = PLANAR_JOINT_LIMITS[jointId];

      angles[jointIndex] = THREE.MathUtils.clamp(
        angles[jointIndex] + angleDelta,
        limits.min,
        limits.max,
      );
    }
  }

  return angles;
}

export function solvePoseForTarget(
  target: THREE.Vector3,
  wristRoll = 0,
  seedPose?: JointPose,
): JointPose {
  const horizontalDistance = Math.max(0.2, Math.hypot(target.x, target.z));
  const radialReach = THREE.MathUtils.clamp(
    horizontalDistance,
    0.2,
    PLANAR_LINKS.reduce((sum, length) => sum + length, 0) - 0.08,
  );
  const verticalReach = THREE.MathUtils.clamp(
    target.y - ROBOT_SHOULDER_PIVOT_HEIGHT,
    -1.35,
    1.65,
  );
  const baseYaw = THREE.MathUtils.clamp(
    normalizeAngleDegrees(
      toDegrees(Math.atan2(target.x, target.z)) + ARM_FORWARD_YAW_OFFSET_DEGREES,
    ),
    -180,
    180,
  );
  const [shoulderPitch, elbowPitch, wrist1Pitch] = solvePlanarPinchAngles(
    { radial: radialReach, vertical: verticalReach },
    seedPose,
  );

  return {
    baseYaw,
    shoulderPitch,
    elbowPitch,
    wrist1Pitch,
    wrist2Yaw: THREE.MathUtils.clamp(baseYaw * -0.28, -120, 120),
    wrist3Roll: wristRoll,
  };
}

export function applyPoseToRig(rig: RobotRig, pose: JointPose) {
  JOINT_DEFINITIONS.forEach((joint) => {
    const group = rig[joint.id];

    group.rotation[joint.axis] = toRadians(pose[joint.id]);
  });
}
