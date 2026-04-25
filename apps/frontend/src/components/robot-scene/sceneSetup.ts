import * as THREE from "three";
import { HOME_POSE, SORTING_BINS, SORTING_OUTER_RADIUS } from "./constants";
import { applyPoseToRig, clampPolarAngle } from "./motion";
import { applyGripperToRig, buildRobotRig } from "./rig";
import { addBinColliders, createSortingSector } from "./sortingBins";
import { createSortingSimulation } from "./sortingSimulation";
import type {
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

const SCENE_FLOOR_RADIUS = 3.25;

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
};

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
    38,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(4.25, 3.05, 5.55);

  const orbitTarget = new THREE.Vector3(0.08, 0.86, 0.48);
  const cameraOffset = new THREE.Vector3().subVectors(camera.position, orbitTarget);
  const orbit = new THREE.Spherical().setFromVector3(cameraOffset);
  orbit.phi = clampPolarAngle(orbit.phi);

  const updateCameraOrbit = () => {
    camera.position.copy(new THREE.Vector3().setFromSpherical(orbit).add(orbitTarget));
    camera.lookAt(orbitTarget);
  };

  updateCameraOrbit();

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

  SORTING_BINS.forEach((bin) => {
    sceneRoot.add(createSortingSector(bin));
    addBinColliders(world, RAPIER, bin);
  });

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
  keyLight.position.set(2.8, 5.4, 3.4);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.HemisphereLight(0xdce6ff, 0xf7f5ef, 2.25);
  scene.add(fillLight);

  const sortingSimulation = createSortingSimulation({
    RAPIER,
    world,
    sceneRoot,
    gripper,
    pinchAnchor,
    heavyMaterial,
    lightMaterial,
    onCubeSorted,
  });

  let animationFrame = 0;
  let activePointerId: number | null = null;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let renderPose = { ...HOME_POSE };
  let renderGripperOpen = 1;

  const handlePointerDown = (event: PointerEvent) => {
    activePointerId = event.pointerId;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };

  const handlePointerMove = (event: PointerEvent) => {
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
    event.preventDefault();
    orbit.radius = THREE.MathUtils.clamp(orbit.radius + event.deltaY * 0.004, 3.2, 8.2);
    updateCameraOrbit();
  };

  let previousTimestamp = performance.now();
  let speedMultiplier = options.speedMultiplier ?? 1;

  const animate = () => {
    const timestamp = performance.now();
    const delta = Math.min((timestamp - previousTimestamp) / 1000, 1 / 30);
    previousTimestamp = timestamp;

    const state = sortingSimulation.update(delta * speedMultiplier);
    renderPose = state.currentPose;
    renderGripperOpen = state.currentGripperOpen;

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
      resetCubes: sortingSimulation.resetCubes,
      setSpeedMultiplier: (nextSpeedMultiplier) => {
        speedMultiplier = nextSpeedMultiplier;
      },
    },
    cleanup,
  };
}
