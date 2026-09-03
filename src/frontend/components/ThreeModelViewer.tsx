import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeModelViewerProps {
  modelType?: 'gear' | 'box' | 'drone' | 'arch' | 'vase' | string;
  color?: string;
  wireframe?: boolean;
  showGrid?: boolean;
  autoRotate?: boolean;
  layerHeightSlider?: number; // 0 to 100
  className?: string;
  onLayerChange?: (progress: number) => void;
}

export const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({
  modelType = 'gear',
  color = '#00687a',
  wireframe: initialWireframe = false,
  showGrid = true,
  autoRotate: initialAutoRotate = true,
  className = 'h-96 w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(initialWireframe);
  const [isRotating, setIsRotating] = useState(initialAutoRotate);
  const [currentSlice, setCurrentSlice] = useState(100);
  const [clipPlaneActive, setClipPlaneActive] = useState(false);
  const [viewMode, setViewMode] = useState<'perspective' | 'ortho'>('perspective');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [activeAngle, setActiveAngle] = useState<'iso' | 'top' | 'front' | 'side'>('iso');

  useEffect(() => {
    setWireframe(initialWireframe);
  }, [initialWireframe]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep industrial navy dark
    sceneRef.current = scene;

    // Clipping plane for layer slicing simulation
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 25);
    clipPlaneRef.current = clipPlane;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(45, 35, 45);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(30, 50, 30);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x57dffe, 0.6); // Cyan rim light
    dirLight2.position.set(-30, 20, -30);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight.position.set(0, 40, 0);
    scene.add(pointLight);

    // Grid Floor (Build Plate)
    const gridHelper = new THREE.GridHelper(60, 30, 0x00687a, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Axis Helper
    const axesHelper = new THREE.AxesHelper(15);
    axesHelper.position.set(-28, 0.1, -28);
    scene.add(axesHelper);

    // Create 3D Model Group
    const group = new THREE.Group();
    scene.add(group);
    meshGroupRef.current = group;

    // Construct Mesh based on modelType
    const meshColor = new THREE.Color(color);
    const material = new THREE.MeshStandardMaterial({
      color: meshColor,
      roughness: 0.25,
      metalness: 0.35,
      wireframe: wireframe,
      clippingPlanes: clipPlaneActive ? [clipPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide
    });

    if (modelType === 'gear' || modelType.includes('planetary') || modelType.includes('gear')) {
      // Build detailed Gear
      const gearGroup = new THREE.Group();

      // Main Gear body
      const cylinderGeo = new THREE.CylinderGeometry(14, 14, 6, 32);
      const centerHole = new THREE.CylinderGeometry(5, 5, 7, 24);
      const gearBody = new THREE.Mesh(cylinderGeo, material);
      gearBody.position.y = 3;
      gearGroup.add(gearBody);

      // Gear Teeth
      const numTeeth = 16;
      for (let i = 0; i < numTeeth; i++) {
        const angle = (i / numTeeth) * Math.PI * 2;
        const toothGeo = new THREE.BoxGeometry(2.5, 6, 3.5);
        const tooth = new THREE.Mesh(toothGeo, material);
        tooth.position.x = Math.cos(angle) * 14.5;
        tooth.position.z = Math.sin(angle) * 14.5;
        tooth.position.y = 3;
        tooth.rotation.y = -angle;
        gearGroup.add(tooth);
      }

      // Inner Sun gear
      const innerGeo = new THREE.TorusGeometry(8, 1.5, 16, 32);
      const innerTorus = new THREE.Mesh(innerGeo, material);
      innerTorus.rotation.x = Math.PI / 2;
      innerTorus.position.y = 3;
      gearGroup.add(innerTorus);

      // Keyway notch
      const hubGeo = new THREE.CylinderGeometry(6, 6, 8, 24);
      const hub = new THREE.Mesh(hubGeo, material);
      hub.position.y = 4;
      gearGroup.add(hub);

      group.add(gearGroup);
    } else if (modelType === 'box' || modelType.includes('arduino') || modelType.includes('case')) {
      // Build Arduino Case
      const boxGroup = new THREE.Group();

      const baseGeo = new THREE.BoxGeometry(26, 8, 18);
      const baseMesh = new THREE.Mesh(baseGeo, material);
      baseMesh.position.y = 4;
      boxGroup.add(baseMesh);

      // Lid lip
      const lidGeo = new THREE.BoxGeometry(27, 2, 19);
      const lidMesh = new THREE.Mesh(lidGeo, material);
      lidMesh.position.y = 9;
      boxGroup.add(lidMesh);

      // Honeycomb vent cylinders
      for (let x = -8; x <= 8; x += 4) {
        for (let z = -4; z <= 4; z += 4) {
          const ventGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 6);
          const ventMesh = new THREE.Mesh(ventGeo, new THREE.MeshStandardMaterial({ color: 0x091426 }));
          ventMesh.position.set(x, 9.2, z);
          boxGroup.add(ventMesh);
        }
      }

      // Port cutouts
      const usbGeo = new THREE.BoxGeometry(4, 3, 6);
      const usbMesh = new THREE.Mesh(usbGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
      usbMesh.position.set(-12.5, 4, 0);
      boxGroup.add(usbMesh);

      group.add(boxGroup);
    } else if (modelType === 'drone') {
      // Drone Frame
      const droneGroup = new THREE.Group();
      const centerBody = new THREE.BoxGeometry(10, 4, 10);
      droneGroup.add(new THREE.Mesh(centerBody, material));

      // 4 Arms
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const armGeo = new THREE.BoxGeometry(20, 2.5, 4);
        const arm = new THREE.Mesh(armGeo, material);
        arm.position.x = Math.cos(angle) * 12;
        arm.position.z = Math.sin(angle) * 12;
        arm.position.y = 0;
        arm.rotation.y = -angle;
        droneGroup.add(arm);

        // Motor mount
        const motorGeo = new THREE.CylinderGeometry(4, 4, 3, 16);
        const motor = new THREE.Mesh(motorGeo, material);
        motor.position.x = Math.cos(angle) * 20;
        motor.position.z = Math.sin(angle) * 20;
        motor.position.y = 1;
        droneGroup.add(motor);
      }
      group.position.y = 2;
      group.add(droneGroup);
    } else {
      // Architectural / Parametric Vase
      const vaseGroup = new THREE.Group();
      const cylinderGeo = new THREE.CylinderGeometry(8, 12, 28, 24, 16, true);
      const vaseMesh = new THREE.Mesh(cylinderGeo, material);
      vaseMesh.position.y = 14;
      vaseGroup.add(vaseMesh);

      // Base disc
      const discGeo = new THREE.CylinderGeometry(12, 12, 1.5, 24);
      const discMesh = new THREE.Mesh(discGeo, material);
      discMesh.position.y = 0.75;
      vaseGroup.add(discMesh);

      group.add(vaseGroup);
    }

    // Interactive Drag Controls (Custom smooth orbit)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !meshGroupRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      meshGroupRef.current.rotation.y += deltaX * 0.01;
      meshGroupRef.current.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.05;
      camera.position.z = Math.max(15, Math.min(100, camera.position.z));
    };

    // Touch support for mobile
    let touchStart = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !meshGroupRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      meshGroupRef.current.rotation.y += deltaX * 0.01;
      meshGroupRef.current.rotation.x += deltaY * 0.01;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('touchstart', onTouchStart);
    domEl.addEventListener('touchmove', onTouchMove);
    domEl.addEventListener('touchend', onTouchEnd);

    // Intersection Observer to pause rendering when offscreen (Performance Optimization)
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isVisible = entry.isIntersecting;
      }
    });
    intersectionObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Skip GPU render pass when not in viewport
      if (!isVisible) return;

      if (isRotating && meshGroupRef.current && !isDragging) {
        meshGroupRef.current.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer with rAF debounce
    let resizeRafId: number | null = null;
    let lastW = 0;
    let lastH = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
            lastW = w;
            lastH = h;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h, false);
          }
        }
      });
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchmove', onTouchMove);
      domEl.removeEventListener('touchend', onTouchEnd);
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [modelType, color, wireframe, clipPlaneActive]);

  // Update layer slice height
  const handleSliceChange = (val: number) => {
    setCurrentSlice(val);
    if (clipPlaneRef.current) {
      const maxY = 30;
      const computedY = (val / 100) * maxY;
      clipPlaneRef.current.constant = computedY;
      setClipPlaneActive(val < 100);
    }
  };

  const resetView = () => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  const setCameraAngle = (angle: 'iso' | 'top' | 'front' | 'side') => {
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
  };

  return (
    <div className={`relative bg-[#091426] rounded-xl overflow-hidden border border-[#1e293b] flex flex-col ${className}`}>
      {/* 3D Canvas container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Industrial Overlay HUD controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#0b1c30]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#334155]/60 text-xs text-white">
        <span className="w-2 h-2 rounded-full bg-[#57dffe] animate-pulse"></span>
        <span className="font-tech text-[11px] text-cyan-300">REALTIME 3D ENGINE</span>
        <span className="text-[#94a3b8]">|</span>
        <span className="font-tech text-slate-300 uppercase">{modelType}</span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#0b1c30]/80 backdrop-blur-md p-1.5 rounded-lg border border-[#334155]/60">
        {/* Camera Orientation Presets */}
        <div className="hidden sm:flex items-center gap-0.5 bg-[#0f172a] p-0.5 rounded border border-[#334155]/40 mr-1 text-[9px] font-mono">
          {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
            <button
              key={ang}
              onClick={() => setCameraAngle(ang)}
              className={`px-1.5 py-0.5 rounded uppercase font-bold transition-colors cursor-pointer ${
                activeAngle === ang ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={`Góc nhìn ${ang.toUpperCase()}`}
            >
              {ang}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsRotating(!isRotating)}
          title={isRotating ? 'Dừng xoay tự động' : 'Bật xoay tự động'}
          className={`p-1.5 rounded hover:bg-[#1e293b] transition-colors cursor-pointer ${isRotating ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined text-lg">360</span>
        </button>
        <button
          onClick={() => setWireframe(!wireframe)}
          title={wireframe ? 'Chế độ Đặc (Solid)' : 'Chế độ Khung dây (Wireframe)'}
          className={`p-1.5 rounded hover:bg-[#1e293b] transition-colors cursor-pointer ${wireframe ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined text-lg">grid_4x4</span>
        </button>
        <button
          onClick={resetView}
          title="Đặt lại góc nhìn chuẩn"
          className="p-1.5 rounded hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">center_focus_strong</span>
        </button>
      </div>

      {/* Layer Slicer Slider Bar */}
      <div className="absolute bottom-3 left-3 right-3 bg-[#0b1c30]/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-[#334155]/60 flex items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-cyan-400 text-sm">layers</span>
          <span className="font-tech text-xs text-slate-300">LỚP IN: {currentSlice}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={currentSlice}
          onChange={(e) => handleSliceChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <span className="font-tech text-[10px] text-slate-400 shrink-0">0.16mm Layer</span>
      </div>
    </div>
  );
};
