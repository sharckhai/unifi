"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";

type TrophyModel = {
  id: string;
  label: string;
  src: string;
};

const TROPHY_MODELS: TrophyModel[] = [
  { id: "aikido-base", label: "Aikido Base", src: "/models/3mf/aikido-base.3mf" },
  { id: "base", label: "Base", src: "/models/3mf/base.3mf" },
  { id: "base-pioneer", label: "Base Pioneer", src: "/models/3mf/base-pioneer.3mf" },
  { id: "base-trophy-bbh", label: "Base Trophy BBH", src: "/models/3mf/base-trophy-bbh.3mf" },
  {
    id: "brandenburg-gate-3d-model",
    label: "Brandenburg Gate 3D Model",
    src: "/models/3mf/brandenburg-gate-3d-model.3mf",
  },
  {
    id: "brandenburg-gate-3d-model-1",
    label: "Brandenburg Gate 3D Model 1",
    src: "/models/3mf/brandenburg-gate-3d-model-1.3mf",
  },
  { id: "buena", label: "Buena", src: "/models/3mf/buena.3mf" },
  { id: "entire-base", label: "Entire Base", src: "/models/3mf/entire-base.3mf" },
  { id: "entire-top", label: "Entire Top", src: "/models/3mf/entire-top.3mf" },
  {
    id: "final-buena-insert",
    label: "Final Buena Insert",
    src: "/models/3mf/final-buena-insert.3mf",
  },
  { id: "gate", label: "Gate", src: "/models/3mf/gate.3mf" },
  { id: "gradium-top", label: "Gradium Top", src: "/models/3mf/gradium-top.3mf" },
  { id: "hera", label: "Hera", src: "/models/3mf/hera.3mf" },
  { id: "hera-track-base", label: "Hera Track Base", src: "/models/3mf/hera-track-base.3mf" },
  { id: "inca", label: "Inca", src: "/models/3mf/inca.3mf" },
  { id: "inca-track-base", label: "Inca Track Base", src: "/models/3mf/inca-track-base.3mf" },
  { id: "peec-ai-base", label: "PEEC AI Base", src: "/models/3mf/peec-ai-base.3mf" },
  { id: "peec-ai-insert", label: "PEEC AI Insert", src: "/models/3mf/peec-ai-insert.3mf" },
  { id: "pioneer-base", label: "Pioneer Base", src: "/models/3mf/pioneer-base.3mf" },
  { id: "pioneer-top", label: "Pioneer Top", src: "/models/3mf/pioneer-top.3mf" },
  { id: "qontext-insert", label: "Qontext Insert", src: "/models/3mf/qontext-insert.3mf" },
  { id: "qontext-track", label: "Qontext Track", src: "/models/3mf/qontext-track.3mf" },
  { id: "reonic-base", label: "Reonic Base", src: "/models/3mf/reonic-base.3mf" },
  { id: "reonic-insert", label: "Reonic Insert", src: "/models/3mf/reonic-insert.3mf" },
  {
    id: "telli-aicoustic-instert",
    label: "Telli Aicoustic Instert",
    src: "/models/3mf/telli-aicoustic-instert.3mf",
  },
  {
    id: "tellixaicoustic-base",
    label: "TellixAicoustic Base",
    src: "/models/3mf/tellixaicoustic-base.3mf",
  },
  { id: "test-base", label: "Test Base", src: "/models/3mf/test-base.3mf" },
  { id: "track-base", label: "Track Base", src: "/models/3mf/track-base.3mf" },
];

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export default function TrophiesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedModelId, setSelectedModelId] = useState(TROPHY_MODELS[0].id);
  const [loadState, setLoadState] = useState("Bereit");
  const selectedModel = useMemo(
    () => TROPHY_MODELS.find((model) => model.id === selectedModelId) ?? TROPHY_MODELS[0],
    [selectedModelId],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let controls: OrbitControlsImpl | null = null;

    const setupScene = async () => {
      const [{ OrbitControls }, { ThreeMFLoader }] = await Promise.all([
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/loaders/3MFLoader.js"),
      ]);

      if (disposed) {
        return;
      }

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        36,
        container.clientWidth / container.clientHeight,
        0.1,
        100,
      );
      camera.position.set(3.7, 2.6, 4.4);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = false;
      controls.target.set(0, 0.65, 0);

      const ambientLight = new THREE.HemisphereLight(0xffffff, 0x4b5563, 2.3);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
      keyLight.position.set(4, 6, 3);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x8fb3ff, 1.2);
      fillLight.position.set(-3, 2.5, -4);
      scene.add(fillLight);

      const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.2, 0.06, 96),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.74,
          metalness: 0.03,
          transparent: true,
          opacity: 0.9,
        }),
      );
      floor.position.y = -0.03;
      floor.receiveShadow = true;
      scene.add(floor);

      const modelRoot = new THREE.Group();
      scene.add(modelRoot);

      setLoadState(`Lade ${selectedModel.label} ...`);

      try {
        const loader = new ThreeMFLoader();
        const object = await loader.loadAsync(selectedModel.src);

        if (disposed) {
          disposeObject(object);
          return;
        }

        object.rotation.x = -Math.PI / 2;
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) {
            return;
          }

          child.castShadow = true;
          child.receiveShadow = true;
        });

        const assetRoot = new THREE.Group();
        assetRoot.add(object);
        assetRoot.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(assetRoot);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);

        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = maxDimension > 0 ? 2.35 / maxDimension : 1;
        assetRoot.scale.setScalar(scale);
        assetRoot.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);

        modelRoot.add(assetRoot);
        setLoadState(`${selectedModel.label} geladen`);
      } catch (error) {
        console.error(error);
        setLoadState(`${selectedModel.label} konnte nicht geladen werden`);
      }

      const resize = () => {
        if (!renderer) {
          return;
        }

        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      const animate = () => {
        animationFrame = window.requestAnimationFrame(animate);
        modelRoot.rotation.y += 0.0032;
        controls?.update();
        renderer?.render(scene as THREE.Scene, camera);
      };

      animate();
    };

    void setupScene();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      controls?.dispose();

      if (scene) {
        disposeObject(scene);
      }

      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [selectedModel]);

  return (
    <main className="min-h-screen px-6 py-8 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700"
            >
              Zurueck zu UNIFI
            </Link>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              3MF-Modellgalerie
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Importierte Trophy- und Base-Objekte als Three.js-Vorschau. Waehle ein
              Modell aus der Liste, um es direkt im Viewer zu laden.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <span className="block font-semibold">Status</span>
            <span>{loadState}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 shadow-inner">
            <div ref={containerRef} className="h-[62vh] min-h-[420px] w-full" />
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="mb-4 px-2">
              <h2 className="text-lg font-semibold text-slate-950">Modelle</h2>
              <p className="mt-1 text-sm text-slate-600">
                {TROPHY_MODELS.length} importierte 3MF-Dateien
              </p>
            </div>

            <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
              {TROPHY_MODELS.map((model) => {
                const isSelected = model.id === selectedModel.id;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModelId(model.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{model.label}</span>
                    <span
                      className={`mt-1 block truncate text-xs ${
                        isSelected ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {model.src}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
