import * as THREE from "three";
import { createRobotAudio } from "./audio";
import { HOME_POSE, ROBOT_FOREARM_LENGTH, SORTING_BINS } from "./constants";
import { applyPoseToRig, clampPolarAngle } from "./motion";
import { applyGripperToRig, buildRobotRig } from "./rig";
import { addBinColliders, createSortingSector } from "./sortingBins";
import { createSortingSimulation } from "./sortingSimulation";
import type {
  CameraViewMode,
  PickCostEffectPayload,
  RapierModule,
  RapierWorld,
  RobotColorTheme,
  SceneActions,
  SortedCubeEvent,
} from "./types";

type RobotSceneRuntime = {
  actions: SceneActions;
  cleanup: () => void;
};

type RobotMaterialPalette = {
  id: RobotColorTheme;
  label: string;
  shell: number;
  joint: number;
  dark: number;
};

type PickCostEffect = {
  label: THREE.Sprite;
  sparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  velocities: Float32Array;
  age: number;
  duration: number;
};

const SCENE_FLOOR_RADIUS = 3.25;
const NORMAL_CAMERA_FOV = 38;
const CINEMATIC_CAMERA_FOV = 37;
const POV_CAMERA_FOV = 68;
const ARM_LOGO_CAMERA_FOV = 43;
const ROBOT_HERO_CAMERA_FOV = 32;
const CAMERA_TRANSITION_SPEED = 5.5;

export const ROBOT_COLOR_THEMES: RobotMaterialPalette[] = [
  { id: "white", label: "White", shell: 0xf8fafc, joint: 0xe5e7eb, dark: 0x10141d },
  { id: "graphite", label: "Graphite", shell: 0x202532, joint: 0x9ca3af, dark: 0x070a11 },
  { id: "ice", label: "Ice", shell: 0xf0f9ff, joint: 0xbfe3ff, dark: 0x123047 },
  { id: "copper", label: "Copper", shell: 0xfff7ed, joint: 0xc47a4a, dark: 0x24140f },
  { id: "cobalt", label: "Cobalt", shell: 0xdbeafe, joint: 0x2563eb, dark: 0x0f172a },
  { id: "mint", label: "Mint", shell: 0xecfdf5, joint: 0x34d399, dark: 0x064e3b },
  { id: "ember", label: "Ember", shell: 0xffedd5, joint: 0xf97316, dark: 0x431407 },
  { id: "violet", label: "Violet", shell: 0xf5f3ff, joint: 0x8b5cf6, dark: 0x2e1065 },
  { id: "aurora", label: "Aurora", shell: 0xecfeff, joint: 0x06b6d4, dark: 0x083344 },
  { id: "nebula", label: "Nebula", shell: 0xfdf4ff, joint: 0xd946ef, dark: 0x3b0764 },
  { id: "wasabi", label: "Wasabi", shell: 0xf7fee7, joint: 0x84cc16, dark: 0x1a2e05 },
  { id: "sandstorm", label: "Sandstorm", shell: 0xfef3c7, joint: 0xd97706, dark: 0x451a03 },
  { id: "abyss", label: "Abyss", shell: 0xe0f2fe, joint: 0x0284c7, dark: 0x082f49 },
  { id: "orchid", label: "Orchid", shell: 0xfce7f3, joint: 0xdb2777, dark: 0x500724 },
  { id: "racing", label: "Racing", shell: 0xfef2f2, joint: 0xdc2626, dark: 0x111827 },
  { id: "prism", label: "Prism", shell: 0xffffff, joint: 0x7c3aed, dark: 0x0f172a },
];

type RobotSceneOptions = {
  robotTheme?: RobotColorTheme;
  speedMultiplier?: number;
  cameraViewMode?: CameraViewMode;
  binLabelsVisible?: boolean;
  costParticlesEnabled?: boolean;
};

function createCostLabelTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(15, 23, 42, 0.82)";
  context.fillRect(28, 32, 456, 112);
  context.strokeStyle = "rgba(31, 85, 255, 0.72)";
  context.lineWidth = 5;
  context.strokeRect(28, 32, 456, 112);
  context.fillStyle = "#f8fafc";
  context.font = "800 54px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, 82);
  context.fillStyle = "rgba(191, 219, 254, 0.92)";
  context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  context.fillText("COST / PICK", canvas.width / 2, 122);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

export async function startRobotScene(
  container: HTMLDivElement,
  onCubeSorted?: (event: SortedCubeEvent) => void,
  options: RobotSceneOptions = {},
): Promise<RobotSceneRuntime> {
  const RAPIER: RapierModule = await import("@dimforge/rapier3d-compat");
  await (RAPIER.init as (options?: object) => Promise<void>)({});

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    NORMAL_CAMERA_FOV,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(4.25, 3.05, 5.55);

  const orbitTarget = new THREE.Vector3(0.08, 0.86, 0.48);
  const cameraOffset = new THREE.Vector3().subVectors(camera.position, orbitTarget);
  const orbit = new THREE.Spherical().setFromVector3(cameraOffset);
  orbit.phi = clampPolarAngle(orbit.phi);
  let cameraViewMode: CameraViewMode = options.cameraViewMode ?? "normal";
  let targetCameraFov = NORMAL_CAMERA_FOV;
  let targetCameraRoll = 0;
  let currentCameraRoll = 0;
  const targetCameraPosition = camera.position.clone();
  const targetCameraLookAt = orbitTarget.clone();
  const currentCameraLookAt = orbitTarget.clone();

  const updateCameraOrbit = () => {
    targetCameraFov = NORMAL_CAMERA_FOV;
    targetCameraRoll = 0;
    targetCameraPosition.setFromSpherical(orbit).add(orbitTarget);
    targetCameraLookAt.copy(orbitTarget);
  };

  updateCameraOrbit();
  camera.lookAt(currentCameraLookAt);

  const sceneRoot = new THREE.Group();
  sceneRoot.position.set(-0.16, -1.08, 0);
  sceneRoot.rotation.y = -0.32;
  scene.add(sceneRoot);

  const world: RapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(SCENE_FLOOR_RADIUS, SCENE_FLOOR_RADIUS, 0.08, 96),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.01,
      transparent: true,
      opacity: 0.94,
    }),
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  sceneRoot.add(floor);

  const grid = new THREE.GridHelper(SCENE_FLOOR_RADIUS * 2, 32, 0x1f55ff, 0x9aaeff);
  grid.position.y = 0.012;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.16;
  });
  sceneRoot.add(grid);

  const robotPalette =
    ROBOT_COLOR_THEMES.find((theme) => theme.id === options.robotTheme) ??
    ROBOT_COLOR_THEMES[0];
  const metalMaterial = new THREE.MeshPhysicalMaterial({
    color: robotPalette.shell,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.72,
    clearcoatRoughness: 0.22,
  });
  const jointMaterial = new THREE.MeshPhysicalMaterial({
    color: robotPalette.joint,
    roughness: 0.34,
    metalness: 0.06,
    clearcoat: 0.5,
    clearcoatRoughness: 0.28,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: robotPalette.dark,
    roughness: 0.48,
    metalness: 0.18,
  });
  const heavyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b78,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.12,
    roughness: 0.52,
  });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x14532d,
    emissiveIntensity: 0.1,
    roughness: 0.5,
  });

  const { root: robot, rig, gripper, pinchAnchor } = buildRobotRig({
    metal: metalMaterial,
    joint: jointMaterial,
    dark: darkMaterial,
  });
  sceneRoot.add(robot);
  applyGripperToRig(gripper, 1);

  const armLogoLocalY = ROBOT_FOREARM_LENGTH * 0.5;
  const armLogoCameraAnchor = new THREE.Object3D();
  const armLogoTargetAnchor = new THREE.Object3D();
  armLogoCameraAnchor.position.set(0.88, armLogoLocalY + 0.15, 1.42);
  armLogoTargetAnchor.position.set(0, armLogoLocalY + 0.2, 0.112);
  rig.elbowPitch.add(armLogoCameraAnchor, armLogoTargetAnchor);

  const povCameraPosition = new THREE.Vector3();
  const povCameraTarget = new THREE.Vector3();
  const wiggleOffset = new THREE.Vector3();
  const armLogoCameraPosition = new THREE.Vector3();
  const armLogoCameraTarget = new THREE.Vector3();
  const robotHeroFocus = new THREE.Vector3();
  const robotHeroFocusOffset = new THREE.Vector3();
  const robotHeroCameraPosition = new THREE.Vector3();

  const setRobotHeroFocus = (
    target: THREE.Object3D,
    localOffset: THREE.Vector3,
    shakeAmount = 0,
  ) => {
    robotHeroFocusOffset.copy(localOffset);
    target.localToWorld(robotHeroFocus.copy(robotHeroFocusOffset));
    robotHeroFocus.x += Math.sin(elapsedTime * 18.1) * shakeAmount;
    robotHeroFocus.y += Math.cos(elapsedTime * 14.7) * shakeAmount * 0.55;
  };

  let elapsedTime = 0;

  const updateCinematicCamera = (elapsedSeconds: number) => {
    const sweep = elapsedSeconds * 0.22;
    const radius = 5.78 + Math.sin(elapsedSeconds * 0.42) * 0.16;
    const height = 2.32 + Math.sin(elapsedSeconds * 0.58) * 0.1;
    const target = new THREE.Vector3(
      Math.sin(elapsedSeconds * 0.31) * 0.05,
      0.34,
      0.18,
    );

    targetCameraFov = CINEMATIC_CAMERA_FOV;
    targetCameraRoll = 0;
    targetCameraPosition.set(Math.cos(sweep) * radius, height, Math.sin(sweep) * radius);
    targetCameraLookAt.copy(target);
  };

  const updateRobotHeroCamera = (elapsedSeconds: number) => {
    const heroTime = elapsedSeconds * 0.74;
    elapsedTime = heroTime;
    const sequenceTime = heroTime % 8.4;
    const beat = Math.floor(heroTime * 2.35);
    const beatKick = Math.sin(heroTime * 15.8) * 0.035;
    const cutShake = Math.sin(beat * 12.9898) * 0.045;

    targetCameraFov = ROBOT_HERO_CAMERA_FOV + Math.sin(heroTime * 7.2) * 2.6;

    if (sequenceTime < 1.05) {
      const progress = sequenceTime / 1.05;
      robotHeroCameraPosition.set(
        THREE.MathUtils.lerp(4.7, 1.95, progress),
        0.46 + progress * 0.28 + beatKick,
        THREE.MathUtils.lerp(3.35, 1.05, progress),
      );
      setRobotHeroFocus(robot, new THREE.Vector3(0, 1.42, 0.1), 0.018);
      targetCameraRoll = -0.16 + progress * 0.08 + cutShake;
    } else if (sequenceTime < 2.05) {
      const progress = (sequenceTime - 1.05) / 1;
      robotHeroCameraPosition.set(
        THREE.MathUtils.lerp(-1.65, -3.2, progress),
        0.9 + Math.sin(progress * Math.PI) * 0.22,
        THREE.MathUtils.lerp(1.18, -0.55, progress),
      );
      setRobotHeroFocus(rig.elbowPitch, new THREE.Vector3(0, ROBOT_FOREARM_LENGTH * 0.52, 0.12), 0.012);
      targetCameraRoll = 0.18 - progress * 0.26 + cutShake;
    } else if (sequenceTime < 3.1) {
      const progress = (sequenceTime - 2.05) / 1.05;
      robotHeroCameraPosition.set(
        THREE.MathUtils.lerp(1.02, 2.45, progress),
        THREE.MathUtils.lerp(1.28, 0.76, progress),
        THREE.MathUtils.lerp(-2.35, -1.38, progress),
      );
      setRobotHeroFocus(rig.wrist1Pitch, new THREE.Vector3(0, 0.24, 0.02), 0.014);
      targetCameraRoll = -0.24 + Math.sin(progress * Math.PI) * 0.32 + cutShake;
    } else if (sequenceTime < 4.25) {
      const progress = (sequenceTime - 3.1) / 1.15;
      const sweep = -0.7 + progress * 2.4;
      robotHeroCameraPosition.set(
        Math.cos(sweep) * 2.25,
        0.42 + Math.sin(progress * Math.PI) * 0.28,
        Math.sin(sweep) * 2.25,
      );
      setRobotHeroFocus(rig.baseYaw, new THREE.Vector3(0, 0.32 + progress * 0.22, 0.18), 0.01);
      targetCameraRoll = 0.12 + Math.sin(progress * Math.PI * 2) * 0.13 + cutShake;
    } else if (sequenceTime < 5.4) {
      const progress = (sequenceTime - 4.25) / 1.15;
      robotHeroCameraPosition.set(
        THREE.MathUtils.lerp(-3.15, -1.35, progress),
        THREE.MathUtils.lerp(0.66, 1.12, progress),
        THREE.MathUtils.lerp(-1.9, -3.05, progress),
      );
      setRobotHeroFocus(rig.shoulderPitch, new THREE.Vector3(0, 0.42, 0.08), 0.012);
      targetCameraRoll = -0.08 - progress * 0.18 + cutShake;
    } else if (sequenceTime < 6.55) {
      const progress = (sequenceTime - 5.4) / 1.15;
      robotHeroCameraPosition.set(
        THREE.MathUtils.lerp(0.76, 2.82, progress),
        1.16 + Math.sin(progress * Math.PI) * 0.12,
        THREE.MathUtils.lerp(2.42, 1.18, progress),
      );
      setRobotHeroFocus(pinchAnchor, new THREE.Vector3(0, 0.08, 0), 0.016);
      targetCameraRoll = 0.24 - progress * 0.36 + cutShake;
    } else {
      const progress = (sequenceTime - 6.55) / 1.85;
      const sweep = 2.6 + progress * 3.2;
      const radius = 3.25 - Math.sin(progress * Math.PI) * 0.86;
      robotHeroCameraPosition.set(
        Math.cos(sweep) * radius,
        0.78 + Math.sin(progress * Math.PI * 2) * 0.18,
        Math.sin(sweep) * radius,
      );
      setRobotHeroFocus(
        robot,
        new THREE.Vector3(0, 1.06 + Math.cos(heroTime * 1.5) * 0.22, 0.08),
        0.014,
      );
      targetCameraRoll = Math.sin(progress * Math.PI * 3) * 0.18 + cutShake;
    }

    targetCameraPosition.copy(robotHeroCameraPosition);
    targetCameraLookAt.copy(robotHeroFocus);
  };

  const updatePovCamera = (elapsedSeconds: number, withActionWiggle: boolean) => {
    targetCameraFov = POV_CAMERA_FOV;
    targetCameraRoll = 0;
    povCameraPosition.copy(pinchAnchor.localToWorld(new THREE.Vector3(0, -0.84, 0.24)));
    povCameraTarget.copy(pinchAnchor.localToWorld(new THREE.Vector3(0, 0.82, -0.1)));

    if (withActionWiggle) {
      wiggleOffset.set(
        Math.sin(elapsedSeconds * 9.1) * 0.018 + Math.sin(elapsedSeconds * 17.3) * 0.006,
        Math.sin(elapsedSeconds * 11.7) * 0.012,
        Math.cos(elapsedSeconds * 8.4) * 0.014,
      );
      povCameraPosition.add(wiggleOffset);
      povCameraTarget.addScaledVector(wiggleOffset, 0.35);
    }

    targetCameraPosition.copy(povCameraPosition);
    targetCameraLookAt.copy(povCameraTarget);
  };

  const updateArmLogoCamera = () => {
    targetCameraFov = ARM_LOGO_CAMERA_FOV;
    targetCameraRoll = 0;
    armLogoCameraAnchor.getWorldPosition(armLogoCameraPosition);
    armLogoTargetAnchor.getWorldPosition(armLogoCameraTarget);
    targetCameraPosition.copy(armLogoCameraPosition);
    targetCameraLookAt.copy(armLogoCameraTarget);
  };

  const updateCameraForMode = (elapsedSeconds: number) => {
    if (cameraViewMode === "cinematic") {
      updateCinematicCamera(elapsedSeconds);
      return;
    }

    if (cameraViewMode === "robotHero") {
      updateRobotHeroCamera(elapsedSeconds);
      return;
    }

    if (cameraViewMode === "povAction") {
      updatePovCamera(elapsedSeconds, true);
      return;
    }

    if (cameraViewMode === "armLogo") {
      updateArmLogoCamera();
      return;
    }

    updateCameraOrbit();
  };

  const applyCameraToTarget = () => {
    camera.position.copy(targetCameraPosition);
    currentCameraLookAt.copy(targetCameraLookAt);
    currentCameraRoll = targetCameraRoll;

    if (Math.abs(camera.fov - targetCameraFov) > 0.001) {
      camera.fov = targetCameraFov;
      camera.updateProjectionMatrix();
    }

    camera.lookAt(currentCameraLookAt);
    camera.rotateZ(currentCameraRoll);
  };

  let cameraTransitionSecondsRemaining = 0;

  const updateCameraTransform = (deltaSeconds: number) => {
    if (cameraTransitionSecondsRemaining <= 0) {
      applyCameraToTarget();
      return;
    }

    const ease = 1 - Math.exp(-CAMERA_TRANSITION_SPEED * deltaSeconds);
    const nextFov = THREE.MathUtils.lerp(camera.fov, targetCameraFov, ease);

    camera.position.lerp(targetCameraPosition, ease);
    currentCameraLookAt.lerp(targetCameraLookAt, ease);
    currentCameraRoll = THREE.MathUtils.lerp(currentCameraRoll, targetCameraRoll, ease);
    cameraTransitionSecondsRemaining = Math.max(
      0,
      cameraTransitionSecondsRemaining - deltaSeconds,
    );

    if (Math.abs(camera.fov - nextFov) > 0.001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }

    camera.lookAt(currentCameraLookAt);
    camera.rotateZ(currentCameraRoll);

    if (cameraTransitionSecondsRemaining === 0) {
      applyCameraToTarget();
    }
  };

  const setCameraViewMode = (nextCameraViewMode: CameraViewMode) => {
    const previousCameraViewMode = cameraViewMode;
    cameraViewMode = nextCameraViewMode;
    activePointerId = null;
    renderer.domElement.style.cursor = cameraViewMode === "normal" ? "grab" : "default";

    if (previousCameraViewMode !== nextCameraViewMode) {
      cameraTransitionSecondsRemaining = 0.72;
    }

    if (cameraViewMode === "normal") {
      updateCameraOrbit();
    }
  };

  let binLabelsVisible = options.binLabelsVisible ?? true;
  const binLabelSprites: THREE.Object3D[] = [];

  SORTING_BINS.forEach((bin) => {
    const sector = createSortingSector(bin);
    sector.traverse((object) => {
      if (object.userData.isSortingBinLabel) {
        object.visible = binLabelsVisible;
        binLabelSprites.push(object);
      }
    });
    sceneRoot.add(sector);
    addBinColliders(world, RAPIER, bin);
  });

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
  keyLight.position.set(2.8, 5.4, 3.4);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.HemisphereLight(0xdce6ff, 0xf7f5ef, 2.25);
  scene.add(fillLight);

  let animationFrame = 0;
  let activePointerId: number | null = null;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let renderPose = { ...HOME_POSE };
  let renderGripperOpen = 1;
  let costParticlesEnabled = options.costParticlesEnabled ?? false;
  const robotAudio = createRobotAudio();
  const pickCostEffects: PickCostEffect[] = [];

  const disposePickCostEffect = (effect: PickCostEffect) => {
    sceneRoot.remove(effect.label, effect.sparks);
    effect.label.material.map?.dispose();
    effect.label.material.dispose();
    effect.sparks.geometry.dispose();
    effect.sparks.material.dispose();
  };

  const spawnPickCostEffect = (position: THREE.Vector3, totalCostEur: number) => {
    const labelTexture = createCostLabelTexture(`€${totalCostEur.toFixed(4)}`);
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
      }),
    );
    label.position.copy(position).add(new THREE.Vector3(0, 0.52, 0));
    label.scale.set(0.92, 0.34, 1);
    label.renderOrder = 8;

    const sparkCount = 22;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);

    for (let index = 0; index < sparkCount; index += 1) {
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.08 + Math.random() * 0.22;

      sparkPositions[offset] = position.x + Math.cos(angle) * radius;
      sparkPositions[offset + 1] = position.y + 0.24 + Math.random() * 0.22;
      sparkPositions[offset + 2] = position.z + Math.sin(angle) * radius;
      sparkVelocities[offset] = Math.cos(angle) * (0.06 + Math.random() * 0.12);
      sparkVelocities[offset + 1] = 0.22 + Math.random() * 0.24;
      sparkVelocities[offset + 2] = Math.sin(angle) * (0.06 + Math.random() * 0.12);
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        color: 0x1f55ff,
        size: 0.045,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    sparks.renderOrder = 7;

    sceneRoot.add(label, sparks);
    pickCostEffects.push({
      label,
      sparks,
      velocities: sparkVelocities,
      age: 0,
      duration: 1.65,
    });
  };

  const updatePickCostEffects = (deltaSeconds: number) => {
    for (let index = pickCostEffects.length - 1; index >= 0; index -= 1) {
      const effect = pickCostEffects[index];
      effect.age += deltaSeconds;
      const progress = THREE.MathUtils.clamp(effect.age / effect.duration, 0, 1);
      const fade = 1 - progress;
      const positions = effect.sparks.geometry.getAttribute("position");

      for (let sparkIndex = 0; sparkIndex < positions.count; sparkIndex += 1) {
        const offset = sparkIndex * 3;
        positions.setXYZ(
          sparkIndex,
          positions.getX(sparkIndex) + effect.velocities[offset] * deltaSeconds,
          positions.getY(sparkIndex) + effect.velocities[offset + 1] * deltaSeconds,
          positions.getZ(sparkIndex) + effect.velocities[offset + 2] * deltaSeconds,
        );
      }

      positions.needsUpdate = true;
      effect.label.position.y += deltaSeconds * 0.28;
      effect.label.material.opacity = fade;
      effect.sparks.material.opacity = fade * 0.95;

      if (effect.age >= effect.duration) {
        pickCostEffects.splice(index, 1);
        disposePickCostEffect(effect);
      }
    }
  };

  const clearPickCostEffects = () => {
    while (pickCostEffects.length > 0) {
      disposePickCostEffect(pickCostEffects.pop() as PickCostEffect);
    }
  };

  const handleCubeSorted = (event: SortedCubeEvent) => {
    onCubeSorted?.(event);
  };

  const showPickCostEffect = (payload: PickCostEffectPayload) => {
    if (!costParticlesEnabled) {
      return;
    }

    const dropPosition = SORTING_BINS[payload.kind === "heavy" ? 1 : 2].position
      .clone()
      .add(new THREE.Vector3(0, 0.92, 0));
    spawnPickCostEffect(dropPosition, payload.totalCostEur);
  };

  const sortingSimulation = createSortingSimulation({
    RAPIER,
    world,
    sceneRoot,
    gripper,
    pinchAnchor,
    heavyMaterial,
    lightMaterial,
    onCubeSorted: handleCubeSorted,
  });

  const handlePointerDown = (event: PointerEvent) => {
    if (cameraViewMode !== "normal") {
      return;
    }

    activePointerId = event.pointerId;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (cameraViewMode !== "normal") {
      return;
    }

    if (activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;

    orbit.theta -= deltaX * 0.006;
    orbit.phi = clampPolarAngle(orbit.phi - deltaY * 0.005);
    updateCameraOrbit();
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    activePointerId = null;
    renderer.domElement.releasePointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grab";
  };

  const handleWheel = (event: WheelEvent) => {
    if (cameraViewMode !== "normal") {
      return;
    }

    event.preventDefault();
    orbit.radius = THREE.MathUtils.clamp(orbit.radius + event.deltaY * 0.004, 3.2, 8.2);
    updateCameraOrbit();
  };

  let previousTimestamp = performance.now();
  let speedMultiplier = options.speedMultiplier ?? 1;
  setCameraViewMode(cameraViewMode);

  const animate = () => {
    const timestamp = performance.now();
    const delta = Math.min((timestamp - previousTimestamp) / 1000, 1 / 30);
    const elapsedSeconds = timestamp / 1000;
    previousTimestamp = timestamp;

    const state = sortingSimulation.update(delta * speedMultiplier);
    renderPose = state.currentPose;
    renderGripperOpen = state.currentGripperOpen;
    robotAudio.updateMotion(renderPose, renderGripperOpen, delta * speedMultiplier);

    applyGripperToRig(gripper, renderGripperOpen);
    applyPoseToRig(rig, renderPose);
    sceneRoot.updateMatrixWorld(true);

    if (state.activeSort?.cube.grabbed) {
      sortingSimulation.carryGrabbedCube(state.activeSort);
    }

    sortingSimulation.completeFrame();

    const physicsSteps = Math.max(1, Math.round(speedMultiplier));
    for (let step = 0; step < physicsSteps; step += 1) {
      world.step();
    }

    sortingSimulation.syncCubeMeshes();
    applyPoseToRig(rig, renderPose);
    applyGripperToRig(gripper, renderGripperOpen);
    sceneRoot.updateMatrixWorld(true);
    updatePickCostEffects(delta);
    updateCameraForMode(elapsedSeconds);
    updateCameraTransform(delta);
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };

  const resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  resizeObserver.observe(container);
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);
  renderer.domElement.addEventListener("pointercancel", handlePointerUp);
  renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
  animate();

  const cleanup = () => {
    window.cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    renderer.domElement.removeEventListener("pointermove", handlePointerMove);
    renderer.domElement.removeEventListener("pointerup", handlePointerUp);
    renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
    renderer.domElement.removeEventListener("wheel", handleWheel);
    clearPickCostEffects();
    robotAudio.dispose();
    world.free();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        const material = object.material;

        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material.dispose();
        }
      }

      if (object instanceof THREE.Sprite) {
        const material = object.material;
        material.map?.dispose();
        material.dispose();
      }
    });
    renderer.dispose();

    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    actions: {
      spawnCube: sortingSimulation.spawnCube,
      resetCubes: () => {
        clearPickCostEffects();
        sortingSimulation.resetCubes();
      },
      setSpeedMultiplier: (nextSpeedMultiplier) => {
        speedMultiplier = nextSpeedMultiplier;
      },
      setCameraViewMode,
      setBinLabelsVisible: (visible) => {
        binLabelsVisible = visible;
        binLabelSprites.forEach((label) => {
          label.visible = visible;
        });
      },
      setCostParticlesEnabled: (enabled) => {
        costParticlesEnabled = enabled;
      },
      setSoundEnabled: robotAudio.setEnabled,
      showPickCostEffect,
    },
    cleanup,
  };
}
