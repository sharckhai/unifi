import * as THREE from "three";
import {
  GRIPPER_CLOSED_WIDTH,
  GRIPPER_OPEN_WIDTH,
  GRIPPER_PINCH_LOCAL_Y,
  ROBOT_BASE_YAW_HEIGHT,
  ROBOT_FOREARM_LENGTH,
  ROBOT_SHOULDER_HEIGHT,
  ROBOT_UPPER_ARM_LENGTH,
  ROBOT_WRIST_LINK_LENGTH,
  ROBOT_WRIST_STACK_LENGTH,
} from "./constants";
import type { GripperRig, RobotRig, ToolRig } from "./types";

type RobotMaterials = {
  metal: THREE.Material;
  joint: THREE.Material;
  dark: THREE.Material;
};

type JointVisualAxis = "x" | "y" | "z";

function setMeshShadows(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function alignCylinderToAxis(mesh: THREE.Mesh, axis: JointVisualAxis) {
  if (axis === "x") {
    mesh.rotation.z = Math.PI / 2;
    return;
  }

  if (axis === "z") {
    mesh.rotation.x = Math.PI / 2;
  }
}

function createCapsuleBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const capsuleLength = Math.max(direction.length() - radius * 2, radius * 0.8);
  const geometry = new THREE.CapsuleGeometry(radius, capsuleLength, 16, 40);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );

  return setMeshShadows(mesh);
}

function createArmTextLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.Group();
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "700 104px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#050505";
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = 16;
  context.shadowOffsetY = 5;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.19), material);
  label.rotation.z = -Math.PI / 2;
  label.renderOrder = 4;

  return label;
}

function createJointHousing(
  radius: number,
  depth: number,
  material: THREE.Material,
  coreMaterial: THREE.Material,
  axis: JointVisualAxis,
) {
  const housing = new THREE.Group();

  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, depth * 1.28, 48),
    coreMaterial,
  );
  alignCylinderToAxis(axle, axis);
  housing.add(setMeshShadows(axle));

  const createCap = (offset: number) => {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.96, depth * 0.18, 64),
      material,
    );
    alignCylinderToAxis(cap, axis);

    if (axis === "x") {
      cap.position.x = offset;
    } else if (axis === "y") {
      cap.position.y = offset;
    } else {
      cap.position.z = offset;
    }

    return setMeshShadows(cap);
  };

  const positiveOffset = depth * 0.5;
  const negativeOffset = -depth * 0.5;
  housing.add(createCap(negativeOffset), createCap(positiveOffset));

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.34, 32, 20),
    coreMaterial,
  );
  housing.add(setMeshShadows(hub));

  return housing;
}

function createTool(
  material: THREE.Material,
  gripMaterial: THREE.Material,
): { tool: THREE.Group } & ToolRig {
  const tool = new THREE.Group();
  const wrist = createJointHousing(0.11, 0.16, material, gripMaterial, "y");
  tool.add(wrist);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.074, 0.22, 40),
    material,
  );
  neck.position.y = 0.18;
  tool.add(setMeshShadows(neck));

  const palm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.058, 0.34, 12, 32),
    material,
  );
  palm.rotation.z = Math.PI / 2;
  palm.position.y = 0.32;
  tool.add(setMeshShadows(palm));

  const palmAccent = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.04, 0.16, 8, 24),
    gripMaterial,
  );
  palmAccent.rotation.z = Math.PI / 2;
  palmAccent.position.y = 0.32;
  tool.add(setMeshShadows(palmAccent));

  const createFinger = () => {
    const finger = new THREE.Group();
    const link = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.027, 0.3, 8, 24),
      material,
    );
    link.position.y = 0.2;
    finger.add(setMeshShadows(link));

    const pad = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.036, 0.1, 8, 24),
      gripMaterial,
    );
    pad.position.y = 0.4;
    pad.rotation.z = Math.PI / 2;
    finger.add(setMeshShadows(pad));

    return finger;
  };

  const leftFinger = createFinger();
  const rightFinger = createFinger();
  const pinchAnchor = new THREE.Object3D();
  pinchAnchor.position.set(0, GRIPPER_PINCH_LOCAL_Y, 0);
  tool.add(leftFinger, rightFinger, pinchAnchor);

  return {
    tool,
    gripper: {
      leftFinger,
      rightFinger,
    },
    pinchAnchor,
  };
}

export function applyGripperToRig(gripper: GripperRig, openAmount: number) {
  const openness = THREE.MathUtils.clamp(openAmount, 0, 1);
  const width = THREE.MathUtils.lerp(GRIPPER_CLOSED_WIDTH, GRIPPER_OPEN_WIDTH, openness);
  const angle = THREE.MathUtils.lerp(0.04, 0.24, openness);

  gripper.leftFinger.position.set(-width * 0.5, 0.34, 0);
  gripper.rightFinger.position.set(width * 0.5, 0.34, 0);
  gripper.leftFinger.rotation.z = -angle;
  gripper.rightFinger.rotation.z = angle;
}

export function buildRobotRig(materials: RobotMaterials) {
  const root = new THREE.Group();
  const rig = {} as RobotRig;

  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.62, 0.1, 88),
    materials.dark,
  );
  basePlate.position.y = 0.05;
  basePlate.receiveShadow = true;
  root.add(basePlate);

  const baseYaw = new THREE.Group();
  baseYaw.position.y = ROBOT_BASE_YAW_HEIGHT;
  root.add(baseYaw);
  rig.baseYaw = baseYaw;

  const baseColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.4, 0.48, 72),
    materials.metal,
  );
  baseColumn.position.y = 0.24;
  baseColumn.castShadow = true;
  baseYaw.add(baseColumn);

  const frontVisor = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.072, 0.2, 8, 24),
    materials.dark,
  );
  frontVisor.position.set(0, 0.36, 0.32);
  frontVisor.rotation.z = Math.PI / 2;
  frontVisor.rotation.x = Math.PI / 2;
  baseYaw.add(setMeshShadows(frontVisor));

  const shoulderPitch = new THREE.Group();
  shoulderPitch.position.y = ROBOT_SHOULDER_HEIGHT;
  baseYaw.add(shoulderPitch);
  rig.shoulderPitch = shoulderPitch;
  shoulderPitch.add(createJointHousing(0.26, 0.3, materials.metal, materials.dark, "z"));

  shoulderPitch.add(
    createCapsuleBetween(
      new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(0, ROBOT_UPPER_ARM_LENGTH - 0.2, 0),
      0.13,
      materials.metal,
    ),
  );

  const elbowPitch = new THREE.Group();
  elbowPitch.position.y = ROBOT_UPPER_ARM_LENGTH;
  shoulderPitch.add(elbowPitch);
  rig.elbowPitch = elbowPitch;
  elbowPitch.add(createJointHousing(0.23, 0.28, materials.metal, materials.dark, "z"));

  elbowPitch.add(
    createCapsuleBetween(
      new THREE.Vector3(0, 0.16, 0),
      new THREE.Vector3(0, ROBOT_FOREARM_LENGTH - 0.18, 0),
      0.105,
      materials.metal,
    ),
  );
  const forearmLabel = createArmTextLabel("{Tech: Europe}");
  forearmLabel.position.set(0, ROBOT_FOREARM_LENGTH * 0.5, 0.112);
  const oppositeForearmLabel = createArmTextLabel("{Tech: Europe}");
  oppositeForearmLabel.position.set(0, ROBOT_FOREARM_LENGTH * 0.5, -0.112);
  oppositeForearmLabel.rotation.y = Math.PI;
  oppositeForearmLabel.rotation.z = Math.PI / 2;
  elbowPitch.add(forearmLabel, oppositeForearmLabel);

  const wrist1Pitch = new THREE.Group();
  wrist1Pitch.position.y = ROBOT_FOREARM_LENGTH;
  elbowPitch.add(wrist1Pitch);
  rig.wrist1Pitch = wrist1Pitch;
  wrist1Pitch.add(createJointHousing(0.145, 0.2, materials.joint, materials.dark, "z"));

  wrist1Pitch.add(
    createCapsuleBetween(
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0, ROBOT_WRIST_LINK_LENGTH - 0.08, 0),
      0.058,
      materials.metal,
    ),
  );

  const wrist2Yaw = new THREE.Group();
  wrist2Yaw.position.y = ROBOT_WRIST_LINK_LENGTH;
  wrist1Pitch.add(wrist2Yaw);
  rig.wrist2Yaw = wrist2Yaw;
  wrist2Yaw.add(createJointHousing(0.12, 0.18, materials.joint, materials.dark, "y"));

  const wristSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.076, 0.064, ROBOT_WRIST_STACK_LENGTH * 0.58, 48),
    materials.metal,
  );
  wristSleeve.position.y = ROBOT_WRIST_STACK_LENGTH * 0.42;
  wrist2Yaw.add(setMeshShadows(wristSleeve));

  const wrist3Roll = new THREE.Group();
  wrist3Roll.position.y = ROBOT_WRIST_STACK_LENGTH;
  wrist2Yaw.add(wrist3Roll);
  rig.wrist3Roll = wrist3Roll;
  const { tool, gripper, pinchAnchor } = createTool(materials.metal, materials.dark);
  wrist3Roll.add(tool);

  return { root, rig, gripper, pinchAnchor };
}
