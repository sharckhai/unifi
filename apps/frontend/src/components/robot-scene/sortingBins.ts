import * as THREE from "three";
import {
  BOX_WALL_THICKNESS,
  SORTING_INNER_RADIUS,
  SORTING_OUTER_RADIUS,
  SORTING_WALL_HEIGHT,
} from "./constants";
import { polarPoint, toRadians } from "./motion";
import type { RapierModule, RapierWorld, SortingBin } from "./types";

function createLabelSprite(label: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(247,245,239,0.9)";
    context.fillRect(12, 18, 232, 60);
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.strokeRect(12, 18, 232, 60);
    context.fillStyle = "#172033";
    context.font = "700 30px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 128, 49);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(0.76, 0.28, 1);
  return sprite;
}

function createBoxWall(
  size: THREE.Vector3,
  position: THREE.Vector3,
  material: THREE.Material,
  yaw = 0,
) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  wall.position.copy(position);
  wall.rotation.y = yaw;
  wall.castShadow = true;
  wall.receiveShadow = true;
  return wall;
}

function createSectorFloorGeometry(bin: SortingBin) {
  const positions: number[] = [];
  const indices: number[] = [];
  const steps = 24;
  const y = BOX_WALL_THICKNESS * 0.52;

  for (let index = 0; index <= steps; index += 1) {
    const angle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / steps);
    const outer = polarPoint(SORTING_OUTER_RADIUS, angle, y);
    const inner = polarPoint(SORTING_INNER_RADIUS, angle, y);

    positions.push(outer.x, outer.y, outer.z, inner.x, inner.y, inner.z);
  }

  for (let index = 0; index < steps; index += 1) {
    const outerA = index * 2;
    const innerA = outerA + 1;
    const outerB = outerA + 2;
    const innerB = outerA + 3;
    indices.push(outerA, innerA, outerB, innerA, innerB, outerB);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createSectorWallSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  material: THREE.Material,
) {
  const center = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const yaw = Math.atan2(-direction.z, direction.x);

  center.y = BOX_WALL_THICKNESS + SORTING_WALL_HEIGHT * 0.5;

  return createBoxWall(
    new THREE.Vector3(length + BOX_WALL_THICKNESS, SORTING_WALL_HEIGHT, BOX_WALL_THICKNESS),
    center,
    material,
    yaw,
  );
}

function createSectorOutline(bin: SortingBin, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  const steps = 32;
  const y = BOX_WALL_THICKNESS + SORTING_WALL_HEIGHT + 0.012;

  for (let index = 0; index <= steps; index += 1) {
    points.push(
      polarPoint(
        SORTING_OUTER_RADIUS,
        THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / steps),
        y,
      ),
    );
  }

  for (let index = steps; index >= 0; index -= 1) {
    points.push(
      polarPoint(
        SORTING_INNER_RADIUS,
        THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / steps),
        y,
      ),
    );
  }

  points.push(points[0].clone());

  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export function createSortingSector(bin: SortingBin) {
  const group = new THREE.Group();
  const color = `#${bin.color.toString(16).padStart(6, "0")}`;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: bin.color,
    roughness: 0.38,
    metalness: 0.04,
    transparent: true,
    opacity: 0.42,
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: bin.color,
    roughness: 0.68,
    metalness: 0.02,
    transparent: true,
    opacity: bin.hasBottom ? 0.26 : 0.1,
    side: THREE.DoubleSide,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: bin.color,
    transparent: true,
    opacity: 0.74,
  });

  const floor = new THREE.Mesh(createSectorFloorGeometry(bin), floorMaterial);
  floor.receiveShadow = true;
  group.add(floor);

  const wallSteps = 9;

  for (let index = 0; index < wallSteps; index += 1) {
    const startAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / wallSteps);
    const endAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, (index + 1) / wallSteps);

    group.add(
      createSectorWallSegment(
        polarPoint(SORTING_OUTER_RADIUS, startAngle),
        polarPoint(SORTING_OUTER_RADIUS, endAngle),
        wallMaterial,
      ),
      createSectorWallSegment(
        polarPoint(SORTING_INNER_RADIUS, startAngle),
        polarPoint(SORTING_INNER_RADIUS, endAngle),
        wallMaterial,
      ),
    );
  }

  group.add(
    createSectorWallSegment(
      polarPoint(SORTING_INNER_RADIUS, bin.angleStart),
      polarPoint(SORTING_OUTER_RADIUS, bin.angleStart),
      wallMaterial,
    ),
    createSectorWallSegment(
      polarPoint(SORTING_INNER_RADIUS, bin.angleEnd),
      polarPoint(SORTING_OUTER_RADIUS, bin.angleEnd),
      wallMaterial,
    ),
    createSectorOutline(bin, edgeMaterial),
  );

  const label = createLabelSprite(bin.label, color);
  label.position.copy(bin.position).setY(SORTING_WALL_HEIGHT + 0.52);
  group.add(label);

  return group;
}

function addFixedCollider(
  world: RapierWorld,
  RAPIER: RapierModule,
  center: THREE.Vector3,
  halfExtents: THREE.Vector3,
  friction = 0.84,
  yaw = 0,
) {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
      .setFriction(friction),
  );
}

function addWallSegmentCollider(
  world: RapierWorld,
  RAPIER: RapierModule,
  start: THREE.Vector3,
  end: THREE.Vector3,
  friction = 0.84,
) {
  const center = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const yaw = Math.atan2(-direction.z, direction.x);

  center.y = BOX_WALL_THICKNESS + SORTING_WALL_HEIGHT * 0.5;
  addFixedCollider(
    world,
    RAPIER,
    center,
    new THREE.Vector3(
      (direction.length() + BOX_WALL_THICKNESS) * 0.5,
      SORTING_WALL_HEIGHT * 0.5,
      BOX_WALL_THICKNESS * 0.5,
    ),
    friction,
    yaw,
  );
}

function addSectorFloorColliders(world: RapierWorld, RAPIER: RapierModule, bin: SortingBin) {
  const floorSteps = 7;
  const radialLength = SORTING_OUTER_RADIUS - SORTING_INNER_RADIUS;
  const averageRadius = (SORTING_OUTER_RADIUS + SORTING_INNER_RADIUS) * 0.5;
  const angleSpan = bin.angleEnd - bin.angleStart;

  for (let index = 0; index < floorSteps; index += 1) {
    const startAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / floorSteps);
    const endAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, (index + 1) / floorSteps);
    const midAngle = (startAngle + endAngle) * 0.5;
    const center = polarPoint(averageRadius, midAngle, BOX_WALL_THICKNESS * 0.5);
    const radialStart = polarPoint(SORTING_INNER_RADIUS, midAngle);
    const radialEnd = polarPoint(SORTING_OUTER_RADIUS, midAngle);
    const radialDirection = radialEnd.sub(radialStart);
    const yaw = Math.atan2(-radialDirection.z, radialDirection.x);
    const tangentLength =
      averageRadius * Math.abs(toRadians(angleSpan / floorSteps)) + BOX_WALL_THICKNESS * 1.8;

    addFixedCollider(
      world,
      RAPIER,
      center,
      new THREE.Vector3(radialLength * 0.5, BOX_WALL_THICKNESS * 0.5, tangentLength * 0.5),
      0.92,
      yaw,
    );
  }
}

export function addBinColliders(world: RapierWorld, RAPIER: RapierModule, bin: SortingBin) {
  const wallSteps = 9;

  for (let index = 0; index < wallSteps; index += 1) {
    const startAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, index / wallSteps);
    const endAngle = THREE.MathUtils.lerp(bin.angleStart, bin.angleEnd, (index + 1) / wallSteps);

    addWallSegmentCollider(
      world,
      RAPIER,
      polarPoint(SORTING_OUTER_RADIUS, startAngle),
      polarPoint(SORTING_OUTER_RADIUS, endAngle),
    );
    addWallSegmentCollider(
      world,
      RAPIER,
      polarPoint(SORTING_INNER_RADIUS, startAngle),
      polarPoint(SORTING_INNER_RADIUS, endAngle),
    );
  }

  addWallSegmentCollider(
    world,
    RAPIER,
    polarPoint(SORTING_INNER_RADIUS, bin.angleStart),
    polarPoint(SORTING_OUTER_RADIUS, bin.angleStart),
  );
  addWallSegmentCollider(
    world,
    RAPIER,
    polarPoint(SORTING_INNER_RADIUS, bin.angleEnd),
    polarPoint(SORTING_OUTER_RADIUS, bin.angleEnd),
  );

  if (bin.hasBottom) {
    addSectorFloorColliders(world, RAPIER, bin);
  }
}
