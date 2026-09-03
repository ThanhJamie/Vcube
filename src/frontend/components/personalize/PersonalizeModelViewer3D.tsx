import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export interface PersonalizeModelViewer3DProps {
  modelType?: string;
  colorHex?: string;
  materialName?: string;
  engravingText?: string;
  fontFamily?: string;
  fontSizeMm?: number;
  engravingDepth?: 'laser' | 'embossed' | 'recessed';
  engravingPosition?: 'center' | 'top-left' | 'bottom-right';
  logoName?: string | null;
  lidExplodeDistance?: number; // 0 to 40 mm
  className?: string;
  dimensions?: { x: number; y: number; z: number };
}

export const PersonalizeModelViewer3D: React.FC<PersonalizeModelViewer3DProps> = ({
  modelType = 'arduino-case',
  colorHex = '#00687a',
  materialName = 'PETG Technical Pro',
  engravingText = 'PROTOTYPE-01',
  fontFamily = 'JetBrains Mono',
  fontSizeMm = 12,
  engravingDepth = 'embossed',
  engravingPosition = 'center',
  logoName = null,
  lidExplodeDistance = 0,
  className = 'w-full h-full min-h-[420px]',
  dimensions = { x: 120.0, y: 85.5, z: 45.2 }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Engine Viewport Controls State (Harmonized with /quote)
  const [cameraMode, setCameraMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'xray'>('solid');
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [layerHeightPercent, setLayerHeightPercent] = useState<number>(100);
  const [isSlicingActive, setIsSlicingActive] = useState<boolean>(false);

  // Caliper 2-point measurement state (from /quote)
  const [measurementActive, setMeasurementActive] = useState<boolean>(false);
  const [caliperPoints, setCaliperPoints] = useState<THREE.Vector3[]>([]);
  const [caliperDistance, setCaliperDistance] = useState<number | null>(null);

  // Local Lid lift slider state
  const [localLidLift, setLocalLidLift] = useState<number>(lidExplodeDistance);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const lidGroupRef = useRef<THREE.Group | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const textTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Bed Dimensions (True mm standard Bambu/Industrial build plate)
  const bedDimensions = { x: 256, y: 256, z: 256 };

  // Sync external lid distance
  useEffect(() => {
    setLocalLidLift(lidExplodeDistance);
  }, [lidExplodeDistance]);

  // Generate dynamic 2D canvas texture for engraving / embossed text on 3D lid
  const generateTextCanvasTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill background with matching case color tone
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle CAD technical grid watermark on surface
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    for (let i = 64; i < 1024; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Top tech badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VCUBE ENGINEERING // ISO-52900', 80, 120);

    // Pin 1 Indicator / Notch marker
    ctx.fillStyle = '#00d2ff';
    ctx.beginPath();
    ctx.arc(80, 80, 14, 0, Math.PI * 2);
    ctx.fill();

    // Render Custom Engraving Text
    if (engravingText && engravingText.trim()) {
      let posX = 512;
      let posY = 512;
      let align: CanvasTextAlign = 'center';

      if (engravingPosition === 'top-left') {
        posX = 120;
        posY = 300;
        align = 'left';
      } else if (engravingPosition === 'bottom-right') {
        posX = 900;
        posY = 750;
        align = 'right';
      }

      ctx.textAlign = align;

      // Font size calculation mapped to canvas pixels
      const pixelSize = Math.max(36, Math.min(140, Math.round(fontSizeMm * 6.5)));
      ctx.font = `bold ${pixelSize}px "${fontFamily}", "JetBrains Mono", sans-serif`;

      if (engravingDepth === 'laser') {
        // High contrast dark carbon laser etching
        ctx.fillStyle = '#09101d';
        ctx.fillText(engravingText, posX, posY);

        // Subtle heat-affected border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeText(engravingText, posX, posY);
      } else if (engravingDepth === 'embossed') {
        // Physical 3D Embossed effect (drop shadow highlight + raised white/cyan fill)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(engravingText, posX + 4, posY + 4);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(engravingText, posX, posY);

        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.strokeText(engravingText, posX, posY);
      } else {
        // Recessed pocket (engraved groove)
        ctx.fillStyle = '#020617';
        ctx.fillText(engravingText, posX, posY);
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeText(engravingText, posX, posY);
      }

      // Decorative technical dimension frame around text
      if (engravingPosition === 'center') {
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(140, 360, 744, 300);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(0, 210, 255, 0.7)';
        ctx.font = '22px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`ENGRAVE AREA [±0.05mm]`, 870, 350);
      }
    }

    // Logo Vector Stamp if uploaded
    if (logoName) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 36px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ LOGO: ${logoName.toUpperCase()}`, 512, 820);

      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(260, 770, 504, 70);
    }

    // Bottom Tech Specs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MATERIAL: ${materialName.toUpperCase()} • HIGH TOLERANCE HOUSING`, 512, 940);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [colorHex, engravingText, fontFamily, fontSizeMm, engravingDepth, engravingPosition, logoName, materialName]);

  // Handle Caliper Measurement Click
  const handleMeasureClick = useCallback((worldPoint: THREE.Vector3) => {
    setCaliperPoints(prev => {
      if (prev.length >= 2) {
        setCaliperDistance(null);
        return [worldPoint];
      }
      const next = [...prev, worldPoint];
      if (next.length === 2) {
        const dist = Number(next[0].distanceTo(next[1]).toFixed(2));
        setCaliperDistance(dist);
      }
      return next;
    });
  }, []);

  // Main Three.js Scene Setup & Geometry Pipeline
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070f1e); // CAD dark navy canvas matching /quote
    sceneRef.current = scene;

    // 2. Slicing Clip Plane
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), isSlicingActive ? (layerHeightPercent / 100) * 50 : 1000);
    clipPlaneRef.current = clipPlane;

    // 3. Cameras
    const aspect = width / height;
    const persCamera = new THREE.PerspectiveCamera(45, aspect, 0.5, 50000);
    const initDist = 280;
    persCamera.position.set(initDist * 0.75, initDist * 0.7, initDist * 0.85);
    persCamera.lookAt(0, dimensions.z * 0.3, 0);
    perspectiveCameraRef.current = persCamera;

    const frustumSize = 280;
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.5,
      50000
    );
    orthoCamera.position.set(initDist * 0.75, initDist * 0.7, initDist * 0.85);
    orthoCamera.lookAt(0, dimensions.z * 0.3, 0);
    orthoCameraRef.current = orthoCamera;

    const currentCam = cameraMode === 'orthographic' ? orthoCamera : persCamera;
    activeCameraRef.current = currentCam;

    // 4. WebGL Renderer with local clipping enabled
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 5. Studio Multi-directional CAD Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(80, 120, 80);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2ff, 0.75); // Cyan technical edge
    dirLight2.position.set(-80, 70, -80);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xfff5ea, 0.45); // Warm fill
    dirLight3.position.set(0, -30, 80);
    scene.add(dirLight3);

    // 6. Millimeter CAD Build Plate Grid & Axis Lines (True 1:1 mm Scale)
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(
        bedDimensions.x,
        Math.round(bedDimensions.x / 10),
        0x008ba3,
        0x1e293b
      );
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Coordinate Axes Helper at Bed Corner
      const axesHelper = new THREE.AxesHelper(35);
      axesHelper.position.set(-bedDimensions.x / 2, 0.2, bedDimensions.y / 2);
      scene.add(axesHelper);

      // Build Volume Cage
      const buildBoxGeo = new THREE.BoxGeometry(bedDimensions.x, bedDimensions.z, bedDimensions.y);
      const edges = new THREE.EdgesGeometry(buildBoxGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35
      });
      const wireframeBox = new THREE.LineSegments(edges, lineMat);
      wireframeBox.position.set(0, bedDimensions.z / 2, 0);
      scene.add(wireframeBox);
    }

    // 7. Group for Model Meshes
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    meshGroupRef.current = rootGroup;

    // Build PBR Material
    const pbrColor = new THREE.Color(colorHex);
    let roughness = 0.3;
    let metalness = 0.15;
    let isWireframe = renderMode === 'wireframe';
    let isXray = renderMode === 'xray';

    if (materialName.includes('Resin')) {
      roughness = 0.15;
      metalness = 0.1;
    } else if (materialName.includes('PETG')) {
      roughness = 0.25;
      metalness = 0.2;
    } else if (materialName.includes('ABS')) {
      roughness = 0.4;
      metalness = 0.05;
    }

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: pbrColor,
      roughness: roughness,
      metalness: metalness,
      wireframe: isWireframe,
      transparent: isXray,
      opacity: isXray ? 0.45 : 1.0,
      clippingPlanes: isSlicingActive ? [clipPlane] : [],
      clipShadows: true,
      side: THREE.DoubleSide
    });

    // Generate Custom Text Texture for Lid
    const lidTexture = generateTextCanvasTexture();
    textTextureRef.current = lidTexture;

    const lidTopMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: lidTexture,
      roughness: roughness,
      metalness: metalness,
      wireframe: isWireframe,
      transparent: isXray,
      opacity: isXray ? 0.45 : 1.0,
      clippingPlanes: isSlicingActive ? [clipPlane] : [],
      side: THREE.DoubleSide
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.3,
      wireframe: isWireframe,
      transparent: isXray,
      opacity: isXray ? 0.45 : 1.0,
      clippingPlanes: isSlicingActive ? [clipPlane] : [],
      side: THREE.DoubleSide
    });

    // --- PROCEDURAL HIGH-PRECISION ARDUINO CASE / ENGINEERING ENCLOSURE ---
    const caseLength = 110; // X mm
    const caseWidth = 75;   // Z mm
    const baseHeight = 26;  // Y mm
    const wallThick = 3.2;

    // 1. Enclosure Base Tub (Outer Box)
    const baseGroup = new THREE.Group();

    // Outer Main Base Housing
    const outerBaseGeo = new THREE.BoxGeometry(caseLength, baseHeight, caseWidth);
    const baseMesh = new THREE.Mesh(outerBaseGeo, baseMaterial);
    baseMesh.position.y = baseHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData = { partName: 'Enclosure Base Housing' };
    baseGroup.add(baseMesh);

    // Inner Cavity (visual hollow representation)
    const innerCavityGeo = new THREE.BoxGeometry(caseLength - wallThick * 2, baseHeight - wallThick, caseWidth - wallThick * 2);
    const innerCavityMesh = new THREE.Mesh(innerCavityGeo, accentMaterial);
    innerCavityMesh.position.y = (baseHeight / 2) + (wallThick / 2);
    baseGroup.add(innerCavityMesh);

    // 4 PCB Standoff Mounting Bosses inside
    const standoffGeo = new THREE.CylinderGeometry(3.5, 3.5, 8, 16);
    const standoffPositions = [
      { x: -caseLength / 2 + 14, z: -caseWidth / 2 + 12 },
      { x: caseLength / 2 - 14, z: -caseWidth / 2 + 12 },
      { x: -caseLength / 2 + 14, z: caseWidth / 2 - 12 },
      { x: caseLength / 2 - 14, z: caseWidth / 2 - 12 }
    ];

    standoffPositions.forEach((pos, idx) => {
      const standoffMesh = new THREE.Mesh(standoffGeo, baseMaterial);
      standoffMesh.position.set(pos.x, 8, pos.z);
      standoffMesh.castShadow = true;
      standoffMesh.userData = { partName: `M3 Mounting Boss #${idx + 1}` };
      baseGroup.add(standoffMesh);

      // Inner Screw hole
      const holeGeo = new THREE.CylinderGeometry(1.5, 1.5, 8.2, 12);
      const holeMesh = new THREE.Mesh(holeGeo, accentMaterial);
      holeMesh.position.set(pos.x, 8.1, pos.z);
      baseGroup.add(holeMesh);
    });

    // USB Port Cutout (Front Left)
    const usbCutoutGeo = new THREE.BoxGeometry(16, 12, 5);
    const usbCutout = new THREE.Mesh(usbCutoutGeo, accentMaterial);
    usbCutout.position.set(-caseLength / 2 + 22, 12, -caseWidth / 2 + 1);
    baseGroup.add(usbCutout);

    // DC Power Jack Cutout
    const dcJackGeo = new THREE.CylinderGeometry(5.5, 5.5, 6, 16);
    const dcJack = new THREE.Mesh(dcJackGeo, accentMaterial);
    dcJack.rotation.x = Math.PI / 2;
    dcJack.position.set(caseLength / 2 - 25, 12, -caseWidth / 2 + 1);
    baseGroup.add(dcJack);

    // Heat Ventilation Slots on Base Sides
    for (let i = -3; i <= 3; i++) {
      const ventGeo = new THREE.BoxGeometry(4, 10, 4);
      const ventMesh = new THREE.Mesh(ventGeo, accentMaterial);
      ventMesh.position.set(i * 12, 12, caseWidth / 2 - 1);
      baseGroup.add(ventMesh);
    }

    rootGroup.add(baseGroup);

    // 2. Detachable Snap-fit Lid Group (with live text engraving surface)
    const lidGroup = new THREE.Group();
    lidGroupRef.current = lidGroup;

    const lidThick = 6;
    const lidWidth = caseLength + 2.5;
    const lidDepth = caseWidth + 2.5;

    // Multi-material Box: Face 2 (Top, +Y) gets the custom engraved canvas texture!
    // Three.js Box Materials order: [px, nx, py, ny, pz, nz] -> py is index 2
    const lidMaterials = [
      baseMaterial,   // right (+x)
      baseMaterial,   // left (-x)
      lidTopMaterial, // top (+y) -> ENGRAVING TEXTURE
      accentMaterial, // bottom (-y)
      baseMaterial,   // front (+z)
      baseMaterial    // back (-z)
    ];

    const lidGeo = new THREE.BoxGeometry(lidWidth, lidThick, lidDepth);
    const lidMesh = new THREE.Mesh(lidGeo, lidMaterials);
    lidMesh.position.y = lidThick / 2;
    lidMesh.castShadow = true;
    lidMesh.receiveShadow = true;
    lidMesh.userData = { partName: 'Customized Engraved Snap-Fit Lid' };
    lidGroup.add(lidMesh);

    // Snap-fit lip flange underneath lid
    const lipGeo = new THREE.BoxGeometry(caseLength - wallThick * 2 - 0.6, 4, caseWidth - wallThick * 2 - 0.6);
    const lipMesh = new THREE.Mesh(lipGeo, baseMaterial);
    lipMesh.position.y = -2;
    lidGroup.add(lipMesh);

    // Position lid at the top of the base + lift offset
    lidGroup.position.y = baseHeight + localLidLift;
    rootGroup.add(lidGroup);

    // 8. Bounding Box & Dimensions Overlay
    if (showBoundingBox) {
      const box3 = new THREE.Box3().setFromObject(rootGroup);
      const boxSize = new THREE.Vector3();
      box3.getSize(boxSize);
      const boxCenter = new THREE.Vector3();
      box3.getCenter(boxCenter);

      const bboxGeo = new THREE.BoxGeometry(
        Math.max(boxSize.x, 1),
        Math.max(boxSize.y, 1),
        Math.max(boxSize.z, 1)
      );
      const bboxEdges = new THREE.EdgesGeometry(bboxGeo);
      const bboxMat = new THREE.LineBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.8
      });
      const bboxSegments = new THREE.LineSegments(bboxEdges, bboxMat);
      bboxSegments.position.copy(boxCenter);
      scene.add(bboxSegments);
    }

    // 9. Caliper Measurement Markers
    if (caliperPoints.length > 0) {
      caliperPoints.forEach((pt) => {
        const sphereGeo = new THREE.SphereGeometry(2.5, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const marker = new THREE.Mesh(sphereGeo, sphereMat);
        marker.position.copy(pt);
        scene.add(marker);
      });

      if (caliperPoints.length === 2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(caliperPoints);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xef4444,
          dashSize: 4,
          gapSize: 2,
          linewidth: 2
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        scene.add(line);
      }
    }

    // 10. Mouse / Touch Raycasting Handlers (Orbit, Pan, Caliper Click)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragDistance = 0;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getPointerPos = (e: MouseEvent | Touch) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragDistance = 0;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (isDragging) {
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
        const currentCamera = activeCameraRef.current;
        const targetY = (baseHeight + localLidLift) / 2;
        const lookTarget = new THREE.Vector3(0, targetY, 0);

        if (e.buttons === 1 && !e.shiftKey) {
          // Orbit Camera
          if (currentCamera) {
            const offset = currentCamera.position.clone().sub(lookTarget);
            const spherical = new THREE.Spherical().setFromVector3(offset);
            spherical.theta -= deltaX * 0.007;
            spherical.phi -= deltaY * 0.007;
            spherical.phi = Math.max(0.04, Math.min(Math.PI * 0.48, spherical.phi));
            currentCamera.position.copy(lookTarget.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
            currentCamera.lookAt(lookTarget);
          }
        } else if (e.buttons === 2 || (e.buttons === 1 && e.shiftKey)) {
          // Pan Camera
          if (currentCamera) {
            const panFactor = Math.max(0.08, currentCamera.position.length() * 0.001);
            currentCamera.position.x -= deltaX * panFactor;
            currentCamera.position.y += deltaY * panFactor;
          }
        }
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      if (dragDistance < 5 && measurementActive) {
        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
        const currentCamera = activeCameraRef.current;
        if (currentCamera && meshGroupRef.current) {
          raycaster.setFromCamera(mouse, currentCamera);
          const intersects = raycaster.intersectObjects(meshGroupRef.current.children, true);
          if (intersects.length > 0) {
            handleMeasureClick(intersects[0].point);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentCamera = activeCameraRef.current;
      if (!currentCamera) return;

      if (cameraMode === 'orthographic') {
        const oCam = orthoCameraRef.current;
        if (oCam) {
          oCam.zoom += e.deltaY * -0.0015;
          oCam.zoom = Math.max(0.02, Math.min(20, oCam.zoom));
          oCam.updateProjectionMatrix();
        }
      } else {
        const pCam = perspectiveCameraRef.current;
        if (pCam) {
          const targetY = (baseHeight + localLidLift) / 2;
          const lookTarget = new THREE.Vector3(0, targetY, 0);
          const offset = pCam.position.clone().sub(lookTarget);
          const currentDist = offset.length();
          const zoomRate = Math.max(0.2, currentDist * 0.0018);
          const newDist = Math.max(10, Math.min(45000, currentDist + e.deltaY * zoomRate));
          offset.normalize().multiplyScalar(newDist);
          pCam.position.copy(lookTarget.clone().add(offset));
        }
      }
    };

    // Touch handlers
    let touchStartPos = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - touchStartPos.x;
      const deltaY = e.touches[0].clientY - touchStartPos.y;

      const currentCamera = activeCameraRef.current;
      const targetY = (baseHeight + localLidLift) / 2;
      const lookTarget = new THREE.Vector3(0, targetY, 0);

      if (currentCamera) {
        const offset = currentCamera.position.clone().sub(lookTarget);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= deltaX * 0.008;
        spherical.phi -= deltaY * 0.008;
        spherical.phi = Math.max(0.04, Math.min(Math.PI * 0.48, spherical.phi));
        currentCamera.position.copy(lookTarget.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
        currentCamera.lookAt(lookTarget);
      }
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
    domEl.addEventListener('contextmenu', (e) => e.preventDefault());

    // 11. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && meshGroupRef.current && !isDragging) {
        meshGroupRef.current.rotation.y += 0.008;
      }

      const activeCam = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
      if (activeCam && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, activeCam);
      }
    };
    animate();

    // 12. Resize Observer
    let resizeRafId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 0 && h > 0) {
            const asp = w / h;
            if (perspectiveCameraRef.current) {
              perspectiveCameraRef.current.aspect = asp;
              perspectiveCameraRef.current.updateProjectionMatrix();
            }
            if (orthoCameraRef.current) {
              const fSize = 280;
              orthoCameraRef.current.left = (-fSize * asp) / 2;
              orthoCameraRef.current.right = (fSize * asp) / 2;
              orthoCameraRef.current.top = fSize / 2;
              orthoCameraRef.current.bottom = -fSize / 2;
              orthoCameraRef.current.updateProjectionMatrix();
            }
            if (rendererRef.current) {
              rendererRef.current.setSize(w, h, false);
            }
          }
        }
      });
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchmove', onTouchMove);
      domEl.removeEventListener('touchend', onTouchEnd);
      if (container.contains(domEl)) container.removeChild(domEl);
      renderer.dispose();
    };
  }, [
    modelType,
    colorHex,
    materialName,
    engravingText,
    fontFamily,
    fontSizeMm,
    engravingDepth,
    engravingPosition,
    logoName,
    localLidLift,
    cameraMode,
    renderMode,
    showBoundingBox,
    showGrid,
    isSlicingActive,
    layerHeightPercent,
    measurementActive,
    caliperPoints,
    dimensions,
    generateTextCanvasTexture,
    handleMeasureClick
  ]);

  // Update Clipping Plane on layer slider change
  useEffect(() => {
    if (clipPlaneRef.current) {
      if (isSlicingActive) {
        clipPlaneRef.current.constant = (layerHeightPercent / 100) * 55;
      } else {
        clipPlaneRef.current.constant = 1000;
      }
    }
  }, [layerHeightPercent, isSlicingActive]);

  // Switch Viewport Presets
  const setViewPreset = (view: 'top' | 'front' | 'side' | 'iso') => {
    setActivePreset(view);
    if (!meshGroupRef.current) return;
    meshGroupRef.current.rotation.set(0, 0, 0);
    const d = 260;

    const setCamPos = (cam: THREE.Camera) => {
      if (view === 'top') {
        cam.position.set(0, d * 1.3, 0.01);
      } else if (view === 'front') {
        cam.position.set(0, 20, d * 1.1);
      } else if (view === 'side') {
        cam.position.set(d * 1.1, 20, 0);
      } else {
        cam.position.set(d * 0.75, d * 0.65, d * 0.85);
      }
      cam.lookAt(0, 20, 0);
    };

    if (perspectiveCameraRef.current) setCamPos(perspectiveCameraRef.current);
    if (orthoCameraRef.current) setCamPos(orthoCameraRef.current);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.set(0, 0, 0);
      meshGroupRef.current.position.set(0, 0, 0);
    }
    const d = 260;
    if (perspectiveCameraRef.current) {
      perspectiveCameraRef.current.position.set(d * 0.75, d * 0.7, d * 0.85);
      perspectiveCameraRef.current.lookAt(0, 20, 0);
    }
    if (orthoCameraRef.current) {
      orthoCameraRef.current.position.set(d * 0.75, d * 0.7, d * 0.85);
      orthoCameraRef.current.lookAt(0, 20, 0);
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.updateProjectionMatrix();
    }
    setActivePreset('iso');
  };

  // Clear Caliper Measurement
  const clearMeasurement = () => {
    setCaliperPoints([]);
    setCaliperDistance(null);
  };

  // Quick 90 deg rotation
  const handleRotate90 = (axis: 'x' | 'y' | 'z') => {
    if (!meshGroupRef.current) return;
    if (axis === 'x') meshGroupRef.current.rotation.x += Math.PI / 2;
    if (axis === 'y') meshGroupRef.current.rotation.y += Math.PI / 2;
    if (axis === 'z') meshGroupRef.current.rotation.z += Math.PI / 2;
  };

  return (
    <div
      className={`relative bg-[#070f1e] overflow-hidden border border-[#1e2e48] flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen p-0'
          : `rounded-xl ${className}`
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing min-h-[350px]" />

      {/* TOP BAR: Header HUD & Dimensions */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Zone: Live Status & mm dimensions */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e2e48] shadow-md text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse shrink-0"></span>
          <span className="font-tech text-xs font-bold text-cyan-300 tracking-wide shrink-0">REALTIME 3D ENGINE</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="font-tech text-[11px] text-cyan-200 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/50">
            {dimensions.x.toFixed(1)} × {dimensions.y.toFixed(1)} × {dimensions.z.toFixed(1)} mm
          </span>
          {engravingText && (
            <span className="font-tech text-[11px] text-[#FFD700] bg-amber-950/70 px-2 py-0.5 rounded border border-amber-600/50 hidden md:inline truncate max-w-[150px]">
              "{engravingText}"
            </span>
          )}
        </div>

        {/* Right Zone: Viewport Camera Presets (ISO / TOP / FRONT / SIDE) */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#091426]/90 backdrop-blur-md p-1 rounded-lg border border-[#1e2e48] shadow-md text-xs">
          {(['iso', 'top', 'front', 'side'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setViewPreset(view)}
              className={`px-2.5 py-1 rounded text-[11px] font-tech font-bold uppercase transition-all cursor-pointer ${
                activePreset === view
                  ? 'bg-[#00687a] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={`Góc nhìn ${view.toUpperCase()}`}
            >
              {view === 'iso' ? '3D ISO' : view === 'top' ? 'TOP (CĂN CHỮ)' : view.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* LEFT FLOATING CAD HUD: Engineering Inspection Telemetry */}
      <div className="absolute top-14 left-2.5 z-20 pointer-events-none hidden sm:flex flex-col gap-1.5 text-[10px] font-tech text-white">
        <div className="pointer-events-auto bg-[#091426]/90 border border-[#1e2e48] p-2.5 rounded-lg backdrop-blur-md shadow-lg space-y-1 w-44">
          <div className="text-cyan-400 font-bold uppercase tracking-wider pb-1 border-b border-slate-700/60 flex items-center justify-between">
            <span>CAD HUD SPEC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">DÀI (X):</span>
            <span className="font-bold text-cyan-200">{dimensions.x} mm</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">RỘNG (Y):</span>
            <span className="font-bold text-cyan-200">{dimensions.y} mm</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">CAO (Z):</span>
            <span className="font-bold text-cyan-200">{dimensions.z} mm</span>
          </div>
          <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700/60">
            <span className="text-slate-400">VẬT LIỆU:</span>
            <span className="font-bold text-amber-300 truncate max-w-[85px]">{materialName}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">KHẮC:</span>
            <span className="font-bold text-emerald-400 uppercase">{engravingDepth}</span>
          </div>
        </div>

        {/* Caliper 2-point measurement Result Card */}
        {measurementActive && (
          <div className="pointer-events-auto bg-[#091426]/95 border border-rose-500/60 p-2.5 rounded-lg backdrop-blur-md shadow-lg space-y-1 w-44">
            <div className="text-rose-400 font-bold uppercase flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">straighten</span>
                THƯỚC ĐO CAD
              </span>
              <button
                onClick={clearMeasurement}
                className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Xóa
              </button>
            </div>
            <p className="text-[9px] text-slate-300">
              {caliperPoints.length === 0 && 'Nhấp điểm 1 trên mô hình...'}
              {caliperPoints.length === 1 && 'Nhấp điểm 2 trên mô hình...'}
              {caliperPoints.length === 2 && 'Khoảng cách đo được:'}
            </p>
            {caliperDistance !== null && (
              <div className="text-sm font-bold text-rose-300 bg-rose-950/60 py-0.5 px-1.5 rounded border border-rose-800 text-center">
                {caliperDistance} mm
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT FLOATING TOOLBAR: Render Modes, Projection, Caliper, Slicing, Explosion */}
      <div className="absolute top-14 right-2.5 z-20 flex flex-col gap-1.5 pointer-events-auto">
        {/* Render Mode (Solid / Wireframe / X-Ray) */}
        <div className="bg-[#091426]/90 border border-[#1e2e48] p-1 rounded-lg backdrop-blur-md flex flex-col gap-1 shadow-md">
          <button
            type="button"
            onClick={() => setRenderMode('solid')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              renderMode === 'solid' ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Chế độ Đặc (Solid PBR)"
          >
            <span className="material-symbols-outlined text-sm">view_in_ar</span>
          </button>
          <button
            type="button"
            onClick={() => setRenderMode('wireframe')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              renderMode === 'wireframe' ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Khung dây CAD (Wireframe Mesh)"
          >
            <span className="material-symbols-outlined text-sm">grid_4x4</span>
          </button>
          <button
            type="button"
            onClick={() => setRenderMode('xray')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              renderMode === 'xray' ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Soi X-Ray trong suốt (Inspect Internal Cavity)"
          >
            <span className="material-symbols-outlined text-sm">opacity</span>
          </button>
        </div>

        {/* Projection Mode (Perspective vs Ortho) */}
        <div className="bg-[#091426]/90 border border-[#1e2e48] p-1 rounded-lg backdrop-blur-md flex flex-col gap-1 shadow-md">
          <button
            type="button"
            onClick={() => setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              cameraMode === 'orthographic' ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title={cameraMode === 'orthographic' ? 'Chế độ Trục đo phẳng (Ortho)' : 'Chế độ Phối cảnh (Perspective)'}
          >
            <span className="material-symbols-outlined text-sm">
              {cameraMode === 'orthographic' ? 'crop_square' : 'deployed_code'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              showBoundingBox ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Bật/Tắt Khung bao kích thước (Bounding Box)"
          >
            <span className="material-symbols-outlined text-sm">filter_center_focus</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              showGrid ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Bật/Tắt Lưới bàn in mm"
          >
            <span className="material-symbols-outlined text-sm">border_all</span>
          </button>
        </div>

        {/* Caliper 2-point measurement toggle */}
        <div className="bg-[#091426]/90 border border-[#1e2e48] p-1 rounded-lg backdrop-blur-md flex flex-col gap-1 shadow-md">
          <button
            type="button"
            onClick={() => {
              setMeasurementActive(!measurementActive);
              if (measurementActive) clearMeasurement();
            }}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              measurementActive ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-white'
            }`}
            title="Thước kẹp đo kích thước 2 điểm (Caliper mm)"
          >
            <span className="material-symbols-outlined text-sm">straighten</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSlicingActive(!isSlicingActive)}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              isSlicingActive ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Mô phỏng mặt cắt lớp in (Slicing Layers Plane)"
          >
            <span className="material-symbols-outlined text-sm">layers</span>
          </button>
        </div>

        {/* Quick 90° Rotations */}
        <div className="bg-[#091426]/90 border border-[#1e2e48] p-1 rounded-lg backdrop-blur-md flex flex-col gap-1 shadow-md">
          <button
            type="button"
            onClick={() => handleRotate90('x')}
            className="p-1.5 rounded text-[10px] font-tech font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xoay 90° trục X"
          >
            +90°X
          </button>
          <button
            type="button"
            onClick={() => handleRotate90('y')}
            className="p-1.5 rounded text-[10px] font-tech font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xoay 90° trục Y"
          >
            +90°Y
          </button>
        </div>
      </div>

      {/* INTERACTIVE BOTTOM CONTROLS STRIP */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Exploded View Lid Lift Slider (Mở nắp kiểm tra bên trong) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e2e48] shadow-md text-xs text-white">
          <span className="material-symbols-outlined text-sm text-cyan-400">vertical_align_top</span>
          <span className="text-[10px] font-tech uppercase text-slate-300 font-bold hidden sm:inline">
            TÁCH NẮP HỘP:
          </span>
          <input
            type="range"
            min={0}
            max={35}
            value={localLidLift}
            onChange={(e) => setLocalLidLift(Number(e.target.value))}
            className="w-20 sm:w-28 accent-[#00687a] cursor-pointer"
            title="Kéo trượt để mở nắp hộp kiểm tra chân cắm bên trong"
          />
          <span className="font-tech text-xs text-cyan-300 font-bold w-10">
            +{localLidLift}mm
          </span>
        </div>

        {/* Center: Layer Slicing Slider (When Slicing active) */}
        {isSlicingActive && (
          <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/50 shadow-md text-xs text-white">
            <span className="material-symbols-outlined text-sm text-cyan-400 animate-spin">cyclone</span>
            <span className="text-[10px] font-tech uppercase text-cyan-300 font-bold">LỚP IN:</span>
            <input
              type="range"
              min={1}
              max={100}
              value={layerHeightPercent}
              onChange={(e) => setLayerHeightPercent(Number(e.target.value))}
              className="w-24 sm:w-36 accent-cyan-400 cursor-pointer"
            />
            <span className="font-tech text-xs text-cyan-300 font-bold">
              {layerHeightPercent}%
            </span>
          </div>
        )}

        {/* Right: Camera Reset, Auto Rotate & Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#091426]/90 backdrop-blur-md px-2 py-1.5 rounded-lg border border-[#1e2e48] shadow-md text-xs">
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-tech font-bold transition-colors cursor-pointer ${
              isRotating ? 'bg-[#00687a] text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Tự động xoay 360°"
          >
            <span className="material-symbols-outlined text-sm">360</span>
            <span className="hidden md:inline">360°</span>
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            className="px-2 py-1 rounded text-xs flex items-center gap-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-tech font-bold cursor-pointer"
            title="Đặt lại góc nhìn trung tâm"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span className="hidden md:inline">RESET</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            <span className="material-symbols-outlined text-sm">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
