import * as THREE from "three";
import type { JointDefinition, JointPose, SortingBin } from "./types";

export const TIMELINE_DURATION = 8;

export const JOINT_DEFINITIONS: JointDefinition[] = [
  {
    id: "baseYaw",
    label: "Basis",
    axis: "y",
    min: -180,
    max: 180,
    color: "#38bdf8",
    keyframes: [
      { time: 0, value: -28 },
      { time: 1.6, value: 34 },
      { time: 3.2, value: 58 },
      { time: 5.4, value: -44 },
      { time: 8, value: -28 },
    ],
  },
  {
    id: "shoulderPitch",
    label: "Schulter",
    axis: "z",
    min: -95,
    max: 75,
    color: "#7dd3fc",
    keyframes: [
      { time: 0, value: -42 },
      { time: 1.8, value: -18 },
      { time: 3.6, value: -62 },
      { time: 5.8, value: -28 },
      { time: 8, value: -42 },
    ],
  },
  {
    id: "elbowPitch",
    label: "Ellbogen",
    axis: "z",
    min: -25,
    max: 130,
    color: "#22c55e",
    keyframes: [
      { time: 0, value: 72 },
      { time: 1.4, value: 38 },
      { time: 3.7, value: 104 },
      { time: 6.2, value: 56 },
      { time: 8, value: 72 },
    ],
  },
  {
    id: "wrist1Pitch",
    label: "Handgelenk 1",
    axis: "z",
    min: -110,
    max: 105,
    color: "#a78bfa",
    keyframes: [
      { time: 0, value: -34 },
      { time: 2, value: -72 },
      { time: 4.1, value: -16 },
      { time: 6.1, value: -58 },
      { time: 8, value: -34 },
    ],
  },
  {
    id: "wrist2Yaw",
    label: "Handgelenk 2",
    axis: "y",
    min: -120,
    max: 120,
    color: "#f59e0b",
    keyframes: [
      { time: 0, value: 18 },
      { time: 1.7, value: -52 },
      { time: 4, value: 46 },
      { time: 6.4, value: -22 },
      { time: 8, value: 18 },
    ],
  },
  {
    id: "wrist3Roll",
    label: "Werkzeug",
    axis: "y",
    min: -180,
    max: 180,
    color: "#f472b6",
    keyframes: [
      { time: 0, value: 0 },
      { time: 2, value: 128 },
      { time: 4.5, value: -96 },
      { time: 6.5, value: 56 },
      { time: 8, value: 0 },
    ],
  },
];

export const HOME_POSE: JointPose = {
  baseYaw: -18,
  shoulderPitch: -38,
  elbowPitch: 78,
  wrist1Pitch: -42,
  wrist2Yaw: 0,
  wrist3Roll: 0,
};

export const SORTING_BATCH_SIZE = 6;
export const CUBE_SIZE = 0.24;
export const GRIPPER_OPEN_WIDTH = 0.34;
export const GRIPPER_CLOSED_WIDTH = CUBE_SIZE + 0.04;
export const GRIPPER_PINCH_LOCAL_Y = 0.74;
export const GRIPPER_APPROACH_CLEARANCE = 0.49;
export const GRIPPER_LIFT_CLEARANCE = 0.63;
export const ROBOT_BASE_YAW_HEIGHT = 0.18;
export const ROBOT_SHOULDER_HEIGHT = 0.48;
export const ROBOT_SHOULDER_PIVOT_HEIGHT = ROBOT_BASE_YAW_HEIGHT + ROBOT_SHOULDER_HEIGHT;
export const ROBOT_UPPER_ARM_LENGTH = 1.55;
export const ROBOT_FOREARM_LENGTH = 1.28;
export const ROBOT_WRIST_LINK_LENGTH = 0.48;
export const ROBOT_WRIST_STACK_LENGTH = 0.38;
export const ROBOT_TOOL_PINCH_REACH =
  ROBOT_WRIST_LINK_LENGTH + ROBOT_WRIST_STACK_LENGTH + GRIPPER_PINCH_LOCAL_Y;
export const BOX_WALL_THICKNESS = 0.08;
export const SORTING_INNER_RADIUS = 0.9;
export const SORTING_OUTER_RADIUS = 2.18;
export const SORTING_WALL_HEIGHT = 0.7;
export const ARM_FORWARD_YAW_OFFSET_DEGREES = 90;

export const SORTING_BINS: SortingBin[] = [
  {
    id: "starter",
    label: "Starter",
    position: new THREE.Vector3(0, 0, 1.54),
    angleStart: -60,
    angleEnd: 60,
    color: 0x2563eb,
    hasBottom: true,
  },
  {
    id: "heavy",
    label: "Heavy",
    position: new THREE.Vector3(-1.34, 0, -0.77),
    angleStart: -180,
    angleEnd: -60,
    color: 0xff6b78,
    hasBottom: true,
  },
  {
    id: "light",
    label: "Light",
    position: new THREE.Vector3(1.34, 0, -0.77),
    angleStart: 60,
    angleEnd: 180,
    color: 0x22c55e,
    hasBottom: true,
  },
];
