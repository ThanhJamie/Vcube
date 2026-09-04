import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { UnifiedCadToolbar } from './tool3d/UnifiedCadToolbar';

interface ThreeModelViewerProps {
  modelType?: 'gear' | 'box' | 'drone' | 'arch' | 'vase' | string;
  color?: string;
  wireframe?: boolean;
  showGrid?: boolean;
  autoRotate?: boolean;
  showLayerSlicer?: boolean;
  showTitleBadge?: boolean;
  className?: string;
  onLayerChange?: (progress: number) => void;
}

export const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({
  modelType = 'gear',
  color = '#00687a',
  wireframe: initialWireframe = false,
  showGrid = true,
  autoRotate: initialAutoRotate = true,
  showLayerSlicer = false,
  showTitleBadge = false,
  className = 'h-96 w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(initialWireframe);
  const [isRotating, setIsRotating] = useState(initialAutoRotate);
  const [currentSlice, setCurrentSlice] = useState(100);
  const [activeAngle, setActiveAngle] = useState<'iso' | 'top' | 'front' | 'side'>('iso');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Sync wireframe prop changes
  useEffect(() => {
    setWireframe(initialWireframe);
  }, [initialWireframe]);

  // Update material wireframe in-place without destroying canvas
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.wireframe = wireframe;
      materialRef.current.needsUpdate = true;
    }
  }, [wireframe]);

  // Update material color in-place without destroying canvas
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(color);
      materialRef.current.needsUpdate = true;
    }
  }, [color]);

  // Set camera angle preset
  const setCameraAngle = useCallback((angle: 'iso' | 'top' | 'front' | 'side') => {
    setActiveAngle(angle);
    setIsRotating(false);
    if (!cameraRef.current || !meshGroupRef.current) return;
    meshGroupRef.current.rotation.set(0, 0, 0);

    if (angle === 'iso') {
      cameraRef.current.position.set(45, 35, 45);
      cameraRef.current.lookAt(0, 5, 0);
    } else if (angle === 'top') {
      cameraRef.current.position.set(0, 65, 0.001);
      cameraRef.current.lookAt(0, 0, 0);
    } else if (angle === 'front') {
      cameraRef.current.position.set(0, 10, 60);
      cameraRef.current.lookAt(0, 10, 0);
    } else if (angle === 'side') {
      cameraRef.current.position.set(60, 10, 0);
      cameraRef.current.lookAt(0, 10, 0);
    }
  }, []);

  const resetView = useCallback(() => {
    setCameraAngle('iso');
  }, [setCameraAngle]);

  // -------------------------------------------------------------------------
  // Main Three.js Scene Setup (Mounts once per container)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091426);
    sceneRef.current = scene;

    // 2. Clipping plane for layer slicing
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 25);
    clipPlaneRef.current = clipPlane;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(45, 35, 45);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // 4. Renderer with pixelRatio clamped to 2
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(30, 50, 30);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x57dffe, 0.6);
    dirLight2.position.set(-30, 20, -30);
    scene.add(dirLight2);

    // 6. Build Plate Grid
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(60, 30, 0x00687a, 0x1e293b);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      const axesHelper = new THREE.AxesHelper(15);
      axesHelper.position.set(-28, 0.1, -28);
      scene.add(axesHelper);
    }

    // 7. Material
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.25,
      wireframe: wireframe,
      clippingPlanes: [clipPlane],
      clipShadows: true,
      side: THREE.DoubleSide
    });
    materialRef.current = material;

    // 8. Geometry creation by modelType
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    if (modelType === 'drone') {
      const arm1Geo = new THREE.BoxGeometry(32, 2.5, 4);
      const arm1 = new THREE.Mesh(arm1Geo, material);
      arm1.rotation.y = Math.PI / 4;
      meshGroup.add(arm1);

      const arm2 = new THREE.Mesh(arm1Geo, material);
      arm2.rotation.y = -Math.PI / 4;
      meshGroup.add(arm2);

      const centerGeo = new THREE.CylinderGeometry(6, 6, 4, 24);
      const center = new THREE.Mesh(centerGeo, material);
      meshGroup.add(center);

      [-11, 11].forEach((x) => {
        [-11, 11].forEach((z) => {
          const motorGeo = new THREE.CylinderGeometry(3.5, 3.5, 5, 16);
          const motor = new THREE.Mesh(motorGeo, material);
          motor.position.set(x, 3, z);
          meshGroup.add(motor);
        });
      });
      meshGroup.position.y = 5;
    } else if (modelType === 'box') {
      const boxGeo = new THREE.BoxGeometry(22, 14, 18);
      const box = new THREE.Mesh(boxGeo, material);
      box.position.y = 7;
      meshGroup.add(box);

      const lidGeo = new THREE.BoxGeometry(23, 2.5, 19);
      const lid = new THREE.Mesh(lidGeo, material);
      lid.position.y = 15;
      meshGroup.add(lid);
    } else {
      // Default: Precision Industrial Gear
      const gearGroup = new THREE.Group();
      const coreGeo = new THREE.CylinderGeometry(14, 14, 6, 32);
      const core = new THREE.Mesh(coreGeo, material);
      core.castShadow = true;
      gearGroup.add(core);

      const hubGeo = new THREE.CylinderGeometry(6, 6, 10, 32);
      const hub = new THREE.Mesh(hubGeo, material);
      gearGroup.add(hub);

      const teethCount = 18;
      for (let i = 0; i < teethCount; i++) {
        const toothAngle = (i / teethCount) * Math.PI * 2;
        const toothGeo = new THREE.BoxGeometry(3, 6, 5);
        const tooth = new THREE.Mesh(toothGeo, material);
        tooth.position.x = Math.cos(toothAngle) * 15.5;
        tooth.position.z = Math.sin(toothAngle) * 15.5;
        tooth.rotation.y = -toothAngle;
        gearGroup.add(tooth);
      }
      gearGroup.position.y = 4;
      meshGroup.add(gearGroup);
    }

    // 9. Interactive Pointer Drag for Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && meshGroupRef.current) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        meshGroupRef.current.rotation.y += deltaX * 0.01;
        meshGroupRef.current.rotation.x = Math.max(
          -Math.PI / 4,
          Math.min(Math.PI / 4, meshGroupRef.current.rotation.x + deltaY * 0.008)
        );
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cameraRef.current) {
        const target = new THREE.Vector3(0, 5, 0);
        const offset = cameraRef.current.position.clone().sub(target);
        const dist = offset.length();
        const zoomDelta = e.deltaY * 0.05;
        const newDist = Math.max(20, Math.min(150, dist + zoomDelta));
        offset.normalize().multiplyScalar(newDist);
        cameraRef.current.position.copy(target.clone().add(offset));
      }
    };

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 10. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (isRotating && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, true);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);

      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }

      // Safe GPU VRAM release & WebGL context destruction
      const gl = renderer.getContext();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      renderer.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [modelType, showGrid]); // Scene only rebuilds if fundamental model geometry type changes

  // Slicer change handler
  const handleSliceChange = (val: number) => {
    setCurrentSlice(val);
    if (clipPlaneRef.current) {
      const maxY = 30;
      clipPlaneRef.current.constant = (val / 100) * maxY;
    }
  };

  return (
    <div
      className={`relative bg-[#091426] select-none rounded-2xl overflow-hidden border border-[#1e293b] flex flex-col font-sans ${className}`}
    >
      {/* 3D Canvas container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Optional Minimal Model Badge */}
      {showTitleBadge && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#091426]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#334155]/60 text-xs text-white shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
          <span className="font-mono text-xs font-bold text-slate-200 uppercase">
            {modelType}
          </span>
        </div>
      )}

      {/* Top Right: Unified Clean CAD Toolbar */}
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <UnifiedCadToolbar
          isRotating={isRotating}
          onToggleRotate={() => setIsRotating(!isRotating)}
          wireframe={wireframe}
          onToggleWireframe={() => setWireframe(!wireframe)}
          onResetView={resetView}
          showAnglePresets={true}
          activeAngle={activeAngle}
          onSelectAngle={setCameraAngle}
        />
      </div>

      {/* Layer Slicer Slider Bar (Only when explicitly enabled) */}
      {showLayerSlicer && (
        <div className="absolute bottom-3 left-3 right-3 bg-[#091426]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#334155]/60 flex items-center justify-between gap-4 text-white shadow-xl">
          <div className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[#57DFFE] text-sm">layers</span>
            <span className="font-mono text-xs text-slate-300">LỚP IN: {currentSlice}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={currentSlice}
            onChange={(e) => handleSliceChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#57DFFE]"
          />
          <span className="font-mono text-[10px] text-slate-400 shrink-0">0.16mm Layer</span>
        </div>
      )}
    </div>
  );
};
