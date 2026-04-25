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

function alignCylinderToAxis(mesh: THREE.Mesh, axis: JointVisualAxis) {
  if (axis === "x") {
    mesh.rotation.z = Math.PI / 2;
    return;
  }

  if (axis === "z") {
    mesh.rotation.x = Math.PI / 2;
  }
}

function createCylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 48);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
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
    new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, depth * 1.24, 48),
    coreMaterial,
  );
  alignCylinderToAxis(axle, axis);
  axle.castShadow = true;
  axle.receiveShadow = true;
  housing.add(axle);

  const createCap = (offset: number) => {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.88, depth * 0.2, 64),
      material,
    );
    alignCylinderToAxis(cap, axis);
    cap.castShadow = true;
    cap.receiveShadow = true;

    if (axis === "x") {
      cap.position.x = offset;
    } else if (axis === "y") {
      cap.position.y = offset;
    } else {
      cap.position.z = offset;
    }

    return cap;
  };

  const createRing = (offset: number) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.02, radius * 0.045, 10, 64),
      coreMaterial,
    );

    if (axis === "x") {
      ring.rotation.y = Math.PI / 2;
      ring.position.x = offset;
    } else if (axis === "y") {
      ring.rotation.x = Math.PI / 2;
      ring.position.y = offset;
    } else {
      ring.position.z = offset;
    }

    ring.castShadow = true;
    ring.receiveShadow = true;
    return ring;
  };

  const positiveOffset = depth * 0.5;
  const negativeOffset = -depth * 0.5;
  housing.add(
    createCap(negativeOffset),
    createCap(positiveOffset),
    createRing(negativeOffset),
    createRing(positiveOffset),
  );

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 32, 20),
    material,
  );
  hub.castShadow = true;
  hub.receiveShadow = true;
  housing.add(hub);

  return housing;
}

function createTool(material: THREE.Material, accentMaterial: THREE.Material): { tool: THREE.Group } & ToolRig {
  const tool = new THREE.Group();
  const wrist = createJointHousing(0.16, 0.24, accentMaterial, material, "y");
  tool.add(wrist);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.22), material);
  palm.position.y = 0.28;
  palm.castShadow = true;
  palm.receiveShadow = true;
  tool.add(palm);

  const createFinger = () => {
    const finger = new THREE.Group();
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.4, 0.09),
      material,
    );
    link.position.y = 0.2;
    link.castShadow = true;
    link.receiveShadow = true;
    finger.add(link);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.13),
      accentMaterial,
    );
    pad.position.y = 0.4;
    pad.castShadow = true;
    pad.receiveShadow = true;
    finger.add(pad);

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
    new THREE.CylinderGeometry(0.72, 0.82, 0.14, 72),
    materials.dark,
  );
  basePlate.position.y = 0.07;
  basePlate.receiveShadow = true;
  root.add(basePlate);

  const baseYaw = new THREE.Group();
  baseYaw.position.y = ROBOT_BASE_YAW_HEIGHT;
  root.add(baseYaw);
  rig.baseYaw = baseYaw;

  const baseColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.52, 0.42, 64),
    materials.metal,
  );
  baseColumn.position.y = 0.2;
  baseColumn.castShadow = true;
  baseYaw.add(baseColumn);

  const shoulderPitch = new THREE.Group();
  shoulderPitch.position.y = ROBOT_SHOULDER_HEIGHT;
  baseYaw.add(shoulderPitch);
  rig.shoulderPitch = shoulderPitch;
  shoulderPitch.add(createJointHousing(0.32, 0.34, materials.joint, materials.dark, "z"));

  shoulderPitch.add(
    createCylinderBetween(
      new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(0, ROBOT_UPPER_ARM_LENGTH - 0.2, 0),
      0.16,
      materials.metal,
    ),
  );

  const elbowPitch = new THREE.Group();
  elbowPitch.position.y = ROBOT_UPPER_ARM_LENGTH;
  shoulderPitch.add(elbowPitch);
  rig.elbowPitch = elbowPitch;
  elbowPitch.add(createJointHousing(0.28, 0.32, materials.joint, materials.dark, "z"));

  elbowPitch.add(
    createCylinderBetween(
      new THREE.Vector3(0, 0.16, 0),
      new THREE.Vector3(0, ROBOT_FOREARM_LENGTH - 0.18, 0),
      0.13,
      materials.metal,
    ),
  );

  const wrist1Pitch = new THREE.Group();
  wrist1Pitch.position.y = ROBOT_FOREARM_LENGTH;
  elbowPitch.add(wrist1Pitch);
  rig.wrist1Pitch = wrist1Pitch;
  wrist1Pitch.add(createJointHousing(0.21, 0.28, materials.joint, materials.dark, "z"));

  wrist1Pitch.add(
    createCylinderBetween(
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0, ROBOT_WRIST_LINK_LENGTH - 0.08, 0),
      0.09,
      materials.metal,
    ),
  );

  const wrist2Yaw = new THREE.Group();
  wrist2Yaw.position.y = ROBOT_WRIST_LINK_LENGTH;
  wrist1Pitch.add(wrist2Yaw);
  rig.wrist2Yaw = wrist2Yaw;
  wrist2Yaw.add(createJointHousing(0.18, 0.26, materials.joint, materials.dark, "y"));

  const wrist3Roll = new THREE.Group();
  wrist3Roll.position.y = ROBOT_WRIST_STACK_LENGTH;
  wrist2Yaw.add(wrist3Roll);
  rig.wrist3Roll = wrist3Roll;
  const { tool, gripper, pinchAnchor } = createTool(materials.metal, materials.joint);
  wrist3Roll.add(tool);

  return { root, rig, gripper, pinchAnchor };
}
