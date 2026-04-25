import type * as THREE from "three";

export type JointId =
  | "baseYaw"
  | "shoulderPitch"
  | "elbowPitch"
  | "wrist1Pitch"
  | "wrist2Yaw"
  | "wrist3Roll";

export type JointAxis = "x" | "y" | "z";

export type JointKeyframe = {
  time: number;
  value: number;
};

export type JointDefinition = {
  id: JointId;
  label: string;
  axis: JointAxis;
  min: number;
  max: number;
  color: string;
  keyframes: JointKeyframe[];
};

export type RobotRig = Record<JointId, THREE.Group>;

export type GripperRig = {
  leftFinger: THREE.Group;
  rightFinger: THREE.Group;
};

export type ToolRig = {
  gripper: GripperRig;
  pinchAnchor: THREE.Object3D;
};

export type JointPose = Record<JointId, number>;
export type CubeKind = "heavy" | "light";
export type SortPhase = "approach" | "descend" | "lift" | "transfer" | "release";

export type SortingBin = {
  id: string;
  label: string;
  position: THREE.Vector3;
  angleStart: number;
  angleEnd: number;
  color: number;
  hasBottom: boolean;
};

export type RapierModule = typeof import("@dimforge/rapier3d-compat");
export type RapierRigidBody = import("@dimforge/rapier3d-compat").RigidBody;
export type RapierWorld = import("@dimforge/rapier3d-compat").World;

export type SortingCube = {
  id: number;
  kind: CubeKind;
  mesh: THREE.Mesh;
  body: RapierRigidBody;
  sorted: boolean;
  reserved: boolean;
  grabbed: boolean;
};

export type ActiveSort = {
  cube: SortingCube;
  phase: SortPhase;
  phaseTime: number;
  targetBin: SortingBin;
  grabPoint: THREE.Vector3;
  dropPoint: THREE.Vector3;
};

export type SceneActions = {
  spawnCube: () => void;
  resetCubes: () => void;
};

export type RobotSceneProps = {
  time?: number;
  isPlaying?: boolean;
  onTimeChange?: (time: number) => void;
  showControls?: boolean;
  className?: string;
  canvasClassName?: string;
};
