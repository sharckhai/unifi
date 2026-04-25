import * as THREE from "three";
import {
  CUBE_SIZE_BY_KIND,
  CUBE_WEIGHT_KG_BY_KIND,
  GRIPPER_APPROACH_CLEARANCE,
  GRIPPER_LIFT_CLEARANCE,
  HOME_POSE,
  SORTING_BATCH_SIZE,
  SORTING_BINS,
  SORTING_INNER_RADIUS,
  SORTING_OUTER_RADIUS,
} from "./constants";
import {
  easeInOut,
  isAngleBetween,
  lerpPose,
  polarPoint,
  solvePoseForTarget,
  toDegrees,
} from "./motion";
import { applyGripperToRig } from "./rig";
import type {
  ActiveSort,
  CubeKind,
  GripperRig,
  JointPose,
  RapierModule,
  RapierRigidBody,
  RapierWorld,
  SortPhase,
  SortedCubeEvent,
  SortingCube,
} from "./types";

type SortingSimulationOptions = {
  RAPIER: RapierModule;
  world: RapierWorld;
  sceneRoot: THREE.Group;
  gripper: GripperRig;
  pinchAnchor: THREE.Object3D;
  heavyMaterial: THREE.Material;
  lightMaterial: THREE.Material;
  onCubeSorted?: (event: SortedCubeEvent) => void;
};

function getBodyPosition(body: RapierRigidBody) {
  const position = body.translation();
  return new THREE.Vector3(position.x, position.y, position.z);
}

function getPhaseDuration(phase: SortPhase, weightKg = 1) {
  const loadSlowdown = 1 + Math.max(0, weightKg - 1) * 0.045;

  switch (phase) {
    case "approach":
      return 1;
    case "descend":
      return 0.5 * loadSlowdown;
    case "lift":
      return 0.58 * loadSlowdown;
    case "transfer":
      return 0.80 * loadSlowdown;
    case "release":
      return 0.2;
  }
}

function getPoseFollowRate(phase: SortPhase) {
  if (phase === "approach") {
    return 5.2;
  }

  return 12;
}

function getGripperTarget(sort: ActiveSort) {
  const phaseProgress = easeInOut(
    THREE.MathUtils.clamp(sort.phaseTime / getPhaseDuration(sort.phase, sort.cube.weightKg), 0, 1),
  );
  const grabPoint = sort.grabPoint.clone();
  const approachPoint = grabPoint.clone().add(new THREE.Vector3(0, GRIPPER_APPROACH_CLEARANCE, 0));
  const liftPoint = grabPoint.clone().add(new THREE.Vector3(0, GRIPPER_LIFT_CLEARANCE, 0));
  const dropPoint = sort.dropPoint.clone();

  switch (sort.phase) {
    case "approach":
      return approachPoint;
    case "descend":
      return approachPoint.lerp(grabPoint, phaseProgress);
    case "lift":
      return grabPoint.lerp(liftPoint, phaseProgress);
    case "transfer":
      return liftPoint.lerp(dropPoint, phaseProgress);
    case "release":
      return dropPoint;
  }
}

function getGripperOpenAmount(sort: ActiveSort | null) {
  if (!sort) {
    return 1;
  }

  const phaseProgress = easeInOut(
    THREE.MathUtils.clamp(sort.phaseTime / getPhaseDuration(sort.phase, sort.cube.weightKg), 0, 1),
  );

  switch (sort.phase) {
    case "approach":
      return 1;
    case "descend":
      return 1 - phaseProgress;
    case "lift":
    case "transfer":
      return 0;
    case "release":
      return phaseProgress;
  }
}

export function createSortingSimulation({
  RAPIER,
  world,
  sceneRoot,
  gripper,
  pinchAnchor,
  heavyMaterial,
  lightMaterial,
  onCubeSorted,
}: SortingSimulationOptions) {
  const cubeGeometryByKind: Record<CubeKind, THREE.BoxGeometry> = {
    heavy: new THREE.BoxGeometry(
      CUBE_SIZE_BY_KIND.heavy,
      CUBE_SIZE_BY_KIND.heavy,
      CUBE_SIZE_BY_KIND.heavy,
    ),
    light: new THREE.BoxGeometry(
      CUBE_SIZE_BY_KIND.light,
      CUBE_SIZE_BY_KIND.light,
      CUBE_SIZE_BY_KIND.light,
    ),
  };
  const cubes: SortingCube[] = [];
  const starterBin = SORTING_BINS[0];
  const heavyBin = SORTING_BINS[1];
  const lightBin = SORTING_BINS[2];
  let activeSort: ActiveSort | null = null;
  let cubeCounter = 0;
  let currentPose: JointPose = { ...HOME_POSE };
  let currentGripperOpen = 1;
  let pendingPoseTarget: JointPose | null = null;
  let totalSorted = 0;
  let simulationTime = 0;

  const syncCubeMeshes = () => {
    cubes.forEach((cube) => {
      const position = cube.body.translation();
      const rotation = cube.body.rotation();
      cube.mesh.position.set(position.x, position.y, position.z);
      cube.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
  };

  const removeCube = (cube: SortingCube) => {
    const index = cubes.indexOf(cube);

    if (index >= 0) {
      cubes.splice(index, 1);
    }

    sceneRoot.remove(cube.mesh);
    world.removeRigidBody(cube.body);
  };

  const spawnCube = (stackIndex = 0) => {
    const kind: CubeKind = Math.random() > 0.5 ? "heavy" : "light";
    const weightKg = CUBE_WEIGHT_KG_BY_KIND[kind];
    const cubeSize = CUBE_SIZE_BY_KIND[kind];
    const angle = THREE.MathUtils.lerp(
      starterBin.angleStart + 16,
      starterBin.angleEnd - 16,
      Math.random(),
    );
    const radius = THREE.MathUtils.lerp(
      SORTING_INNER_RADIUS + 0.36,
      SORTING_OUTER_RADIUS - 0.36,
      Math.random(),
    );
    const spawnPoint = polarPoint(radius, angle);
    const x = spawnPoint.x;
    const z = spawnPoint.z;
    const y = 1.35 + stackIndex * 0.2 + Math.random() * 0.26;
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.54)
        .setAngularDamping(1.12),
    );
    body.enableCcd(true);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(cubeSize * 0.5, cubeSize * 0.5, cubeSize * 0.5)
        .setDensity(kind === "heavy" ? 7.4 : 1.15)
        .setFriction(0.86)
        .setRestitution(0.04),
      body,
    );

    const mesh = new THREE.Mesh(
      cubeGeometryByKind[kind],
      kind === "heavy" ? heavyMaterial : lightMaterial,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneRoot.add(mesh);
    cubes.push({
      id: cubeCounter,
      kind,
      weightKg,
      size: cubeSize,
      mesh,
      body,
      sorted: false,
      reserved: false,
      grabbed: false,
    });
    cubeCounter += 1;
  };

  const spawnBatch = () => {
    for (let index = 0; index < SORTING_BATCH_SIZE; index += 1) {
      spawnCube(index);
    }
  };

  const resetCubes = () => {
    activeSort = null;
    currentPose = { ...HOME_POSE };
    currentGripperOpen = 1;
    pendingPoseTarget = null;
    totalSorted = 0;
    simulationTime = 0;
    applyGripperToRig(gripper, currentGripperOpen);

    while (cubes.length > 0) {
      removeCube(cubes[0]);
    }

    spawnBatch();
  };

  const isInsideStarter = (position: THREE.Vector3, cubeSize: number) => {
    const radius = Math.hypot(position.x, position.z);
    const angle = toDegrees(Math.atan2(position.x, position.z));

    return (
      radius > SORTING_INNER_RADIUS + cubeSize * 0.5 &&
      radius < SORTING_OUTER_RADIUS - cubeSize * 0.5 &&
      isAngleBetween(angle, starterBin.angleStart, starterBin.angleEnd) &&
      position.y > 0.08 &&
      position.y < 0.82
    );
  };

  const findNextCube = () =>
    cubes.find((cube) => {
      if (cube.sorted || cube.reserved || cube.grabbed) {
        return false;
      }

      const position = getBodyPosition(cube.body);
      const velocity = cube.body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);

      return isInsideStarter(position, cube.size) && speed < 0.42;
    }) ?? null;

  const beginSort = (cube: SortingCube) => {
    const targetBin = cube.kind === "heavy" ? heavyBin : lightBin;
    const cubePosition = getBodyPosition(cube.body);
    cube.reserved = true;

    activeSort = {
      cube,
      phase: "approach",
      phaseTime: 0,
      startedAt: simulationTime,
      targetBin,
      grabPoint: cubePosition,
      dropPoint: targetBin.position.clone().add(new THREE.Vector3(0, 0.83, 0)),
    };
  };

  const releaseCube = (sort: ActiveSort) => {
    const releasePosition = sceneRoot.worldToLocal(pinchAnchor.getWorldPosition(new THREE.Vector3()));

    sort.cube.grabbed = false;
    sort.cube.sorted = true;
    sort.cube.reserved = false;
    sort.cube.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    sort.cube.body.setTranslation(
      { x: releasePosition.x, y: releasePosition.y, z: releasePosition.z },
      true,
    );
    sort.cube.body.setLinvel({ x: 0, y: -0.85, z: 0 }, true);
    sort.cube.body.setAngvel({ x: 0.2, y: 0.5, z: -0.15 }, true);
    totalSorted += 1;
    onCubeSorted?.({
      id: sort.cube.id,
      kind: sort.cube.kind,
      weightKg: sort.cube.weightKg,
      sortDurationSeconds: simulationTime - sort.startedAt,
      totalSorted,
    });
    spawnCube();
  };

  const advanceSortPhase = (sort: ActiveSort) => {
    if (sort.phase === "approach") {
      sort.grabPoint = getBodyPosition(sort.cube.body);
      sort.phase = "descend";
      sort.phaseTime = 0;
      return;
    }

    if (sort.phase === "descend") {
      sort.cube.grabbed = true;
      sort.cube.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      sort.cube.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      sort.cube.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      sort.phase = "lift";
      sort.phaseTime = 0;
      return;
    }

    if (sort.phase === "lift") {
      sort.phase = "transfer";
      sort.phaseTime = 0;
      return;
    }

    if (sort.phase === "transfer") {
      releaseCube(sort);
      sort.phase = "release";
      sort.phaseTime = 0;
      return;
    }

    activeSort = null;
  };

  const update = (delta: number) => {
    simulationTime += delta;

    if (!activeSort) {
      const nextCube = findNextCube();

      if (nextCube) {
        beginSort(nextCube);
      }
    }

    if (activeSort) {
      activeSort.phaseTime += delta;
      const target = getGripperTarget(activeSort);
      const poseTarget = solvePoseForTarget(
        target,
        activeSort.cube.kind === "heavy" ? -18 : 18,
        currentPose,
      );
      pendingPoseTarget = poseTarget;
      currentPose = lerpPose(
        currentPose,
        poseTarget,
        1 - Math.exp(-delta * getPoseFollowRate(activeSort.phase)),
      );
      currentGripperOpen = THREE.MathUtils.lerp(
        currentGripperOpen,
        getGripperOpenAmount(activeSort),
        1 - Math.exp(-delta * 12),
      );
    } else {
      pendingPoseTarget = null;
      currentPose = lerpPose(currentPose, HOME_POSE, 1 - Math.exp(-delta * 1.7));
      currentGripperOpen = THREE.MathUtils.lerp(currentGripperOpen, 1, 1 - Math.exp(-delta * 3.2));
    }

    return { currentPose, currentGripperOpen, activeSort };
  };

  const completeFrame = () => {
    if (activeSort && activeSort.phaseTime >= getPhaseDuration(activeSort.phase, activeSort.cube.weightKg)) {
      if (pendingPoseTarget) {
        currentPose = pendingPoseTarget;
      }
      pendingPoseTarget = null;
      advanceSortPhase(activeSort);
    }
  };

  const carryGrabbedCube = (sort: ActiveSort) => {
    const carriedPosition = sceneRoot.worldToLocal(pinchAnchor.getWorldPosition(new THREE.Vector3()));
    sort.cube.body.setNextKinematicTranslation({
      x: carriedPosition.x,
      y: carriedPosition.y,
      z: carriedPosition.z,
    });
    sort.cube.body.setNextKinematicRotation({ x: 0, y: 0, z: 0, w: 1 });
  };

  spawnBatch();

  return {
    spawnCube: () => spawnCube(),
    resetCubes,
    syncCubeMeshes,
    update,
    completeFrame,
    carryGrabbedCube,
  };
}
