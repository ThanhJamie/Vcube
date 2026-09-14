import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { UnifiedCadToolbar } from './tool3d/UnifiedCadToolbar';
import { Icon } from '@frontend/ui';
import { useInViewport } from '../hooks/useInViewport';
import { disposeHierarchy } from '../three/dispose';

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
  className = 'h-96 w-full',
  onLayerChange
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isInViewport = useInViewport(wrapperRef, { rootMargin: '100px', threshold: 0 });

  const [wireframe, setWireframe] = useState(initialWireframe);
  const [isRotating, setIsRotating] = useState(initialAutoRotate);
  const isRotatingRef = useRef(initialAutoRotate);
  const [currentSlice, setCurrentSlice] = useState(100);
  const [activeAngle, setActiveAngle] = useState<'iso' | 'top' | 'front' | 'side'>('iso');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Sync isRotating state with ref for animation loop
  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

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
  // Main Three.js Scene Setup (Lazy loaded: only runs when in viewport ±100px)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isInViewport || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091426);
    sceneRef.current = scene;

    // 2. Clipping plane for layer slicing
    const maxY = 30;
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), (currentSlice / 100) * maxY);
    clipPlaneRef.current = clipPlane;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    if (activeAngle === 'top') {
      camera.position.set(0, 65, 0.001);
      camera.lookAt(0, 0, 0);
    } else if (activeAngle === 'front') {
      camera.position.set(0, 10, 60);
      camera.lookAt(0, 10, 0);
    } else if (activeAngle === 'side') {
      camera.position.set(60, 10, 0);
      camera.lookAt(0, 10, 0);
    } else {
      camera.position.set(45, 35, 45);
      camera.lookAt(0, 5, 0);
    }
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
    } else if (modelType === 'arch') {
      // Topological Arch / Cấu trúc vòm chịu lực FEM
      const archGroup = new THREE.Group();
      const torusGeo = new THREE.TorusGeometry(13, 2.4, 16, 48, Math.PI);
      const torus = new THREE.Mesh(torusGeo, material);
      torus.rotation.x = Math.PI / 2;
      torus.rotation.z = Math.PI;
      torus.position.y = 3;
      archGroup.add(torus);

      const baseGeo = new THREE.BoxGeometry(6, 3, 6);
      const base1 = new THREE.Mesh(baseGeo, material);
      base1.position.set(-13, 1.5, 0);
      archGroup.add(base1);

      const base2 = new THREE.Mesh(baseGeo, material);
      base2.position.set(13, 1.5, 0);
      archGroup.add(base2);

      const nodeGeo = new THREE.CylinderGeometry(4, 4, 3.5, 24);
      const node = new THREE.Mesh(nodeGeo, material);
      node.position.set(0, 16, 0);
      archGroup.add(node);

      meshGroup.add(archGroup);
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
      if (isRotatingRef.current && meshGroupRef.current) {
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
      disposeHierarchy(scene);
      renderer.dispose();
      renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();

      sceneRef.current = null;
      rendererRef.current = null;
      meshGroupRef.current = null;
      clipPlaneRef.current = null;
      cameraRef.current = null;
      materialRef.current = null;
    };
  }, [isInViewport, modelType, showGrid]);

  // Slicer change handler
  const handleSliceChange = (val: number) => {
    setCurrentSlice(val);
    if (clipPlaneRef.current) {
      const maxY = 30;
      clipPlaneRef.current.constant = (val / 100) * maxY;
    }
    onLayerChange?.(val);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative bg-surface-inverse select-none rounded-lg overflow-hidden border border-surface-inverse-raised flex flex-col font-sans ${className}`}
    >
      {/* Standby placeholder when scrolled out of viewport */}
      {!isInViewport && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-inverse text-on-inverse/60 font-mono text-xs z-10 select-none">
          <Icon name="view_in_ar" size={28} className="mb-2 text-accent/60 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-on-inverse/80">
            WebGL Standby (±100px)
          </span>
          <span className="text-[11px] text-on-inverse/50 mt-1">
            Cuộn vào khung nhìn để hiển thị mô hình 3D
          </span>
        </div>
      )}

      {/* 3D Canvas container */}
      <div ref={canvasContainerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Optional Minimal Model Badge */}
      {showTitleBadge && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-surface-inverse/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-surface-inverse-raised/60 text-xs text-on-inverse shadow-e2 z-10">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          <span className="font-mono text-xs font-bold text-on-inverse/90 uppercase tracking-wider">
            {modelType}
          </span>
        </div>
      )}

      {/* Top Right: Unified Clean CAD Toolbar */}
      {isInViewport && (
        <div className="absolute top-3 right-3 z-panel pointer-events-auto">
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
      )}

      {/* Layer Slicer Slider Bar (Only when explicitly enabled) */}
      {isInViewport && showLayerSlicer && (
        <div className="absolute bottom-3 left-3 right-3 bg-surface-inverse/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-surface-inverse-raised/60 flex items-center justify-between gap-4 text-on-inverse shadow-e3 z-10">
          <div className="flex items-center gap-2 shrink-0">
            <Icon name="layers" size={18} className="text-accent" />
            <span className="font-mono text-xs font-bold text-on-inverse/90">LỚP IN: {currentSlice}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={currentSlice}
            onChange={(e) => handleSliceChange(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-inverse-raised rounded-full appearance-none cursor-pointer accent-accent"
          />
          <span className="font-mono text-xs text-on-inverse/70 shrink-0">0.16mm Layer</span>
        </div>
      )}
    </div>
  );
};

export default ThreeModelViewer;
