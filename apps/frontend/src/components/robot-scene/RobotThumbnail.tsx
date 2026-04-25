"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HOME_POSE } from "./constants";
import { applyPoseToRig } from "./motion";
import { applyGripperToRig, buildRobotRig } from "./rig";
import { ROBOT_COLOR_THEMES } from "./sceneSetup";
import type { RobotColorTheme } from "./types";

type RobotThumbnailProps = {
  theme: RobotColorTheme;
  className?: string;
  interactive?: boolean;
};

export function RobotThumbnail({
  theme,
  className = "h-56 w-full",
  interactive = false,
}: RobotThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(3.2, 2.55, 4.45);
    camera.lookAt(0.08, 1.34, 0);

    const palette =
      ROBOT_COLOR_THEMES.find((item) => item.id === theme) ?? ROBOT_COLOR_THEMES[0];
    const metalMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.shell,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.72,
      clearcoatRoughness: 0.22,
    });
    const jointMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.joint,
      roughness: 0.34,
      metalness: 0.06,
      clearcoat: 0.5,
      clearcoatRoughness: 0.28,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: palette.dark,
      roughness: 0.48,
      metalness: 0.18,
    });

    const { root: robot, rig, gripper } = buildRobotRig({
      metal: metalMaterial,
      joint: jointMaterial,
      dark: darkMaterial,
    });
    robot.position.set(0, -0.35, 0);
    robot.rotation.y = -0.34;
    scene.add(robot);

    applyPoseToRig(rig, HOME_POSE);
    applyGripperToRig(gripper, 1);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.8, 5.4, 3.4);
    scene.add(keyLight);
    scene.add(new THREE.HemisphereLight(0xdce6ff, 0xf7f5ef, 2.35));

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });

    let animationFrame = 0;
    const renderFrame = () => {
      if (interactive) {
        robot.rotation.y += 0.005;
        animationFrame = window.requestAnimationFrame(renderFrame);
      }

      renderer.render(scene, camera);
    };

    resizeObserver.observe(container);
    renderFrame();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
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
      });
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive, theme]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label={`3D-Roboter Thumbnail im Theme ${theme}`}
    />
  );
}
