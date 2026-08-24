import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ModelPart, TransformState, MeasurementResult } from '../../types';

interface ModelViewer3DProps {
  modelType?: string;
  parts?: ModelPart[];
  transform: TransformState;
  bedDimensions?: { x: number; y: number; z: number };
  customGeometry?: THREE.BufferGeometry | null;
  customObjectGroup?: THREE.Group | null;
  selectedPartId?: string | null;
  onSelectPart?: (partId: string | null) => void;
  onDropFile?: (file: File) => void;
  cameraMode?: 'perspective' | 'orthographic';
  onCameraModeChange?: (mode: 'perspective' | 'orthographic') => void;
  showBoundingBox?: boolean;
  onToggleBoundingBox?: () => void;
  showDefects?: boolean;
  onToggleDefects?: () => void;
  measurementActive?: boolean;
  onToggleMeasurement?: () => void;
  onMeasurementChange?: (result: MeasurementResult | null) => void;
  compareMode?: 'normal' | 'before' | 'after';
  onUpdateTransform?: (updated: Partial<TransformState>) => void;
  className?: string;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelType = 'gear',
  parts = [],
  transform,
  bedDimensions = { x: 256, y: 256, z: 256 },
  customGeometry = null,
  customObjectGroup = null,
  selectedPartId = null,
  onSelectPart,
  onDropFile,
  cameraMode = 'perspective',
  onCameraModeChange,
  showBoundingBox = true,
  onToggleBoundingBox,
  showDefects = false,
  onToggleDefects,
  measurementActive = false,
  onToggleMeasurement,
  onMeasurementChange,
  compareMode = 'normal',
  onUpdateTransform,
  className = 'h-[380px] sm:h-[460px] w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [modelHeight, setModelHeight] = useState(40);
  const [modelDims, setModelDims] = useState<{ x: number; y: number; z: number }>({ x: 92, y: 92, z: 38 });
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'orbit' | 'pan'>('orbit');
  const [caliperPoints, setCaliperPoints] = useState<THREE.Vector3[]>([]);
  const [caliperDistance, setCaliperDistance] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBedOverflow, setIsBedOverflow] = useState(false);

  // References to Three.js internal objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const boundingBoxMeshRef = useRef<THREE.LineSegments | null>(null);
  const measurementLineRef = useRef<THREE.Line | null>(null);
  const measurePointsMeshesRef = useRef<THREE.Mesh[]>([]);
  const partMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Check if transformed dimensions exceed bed boundaries
  useEffect(() => {
    const scaleMultiplier = (transform.scaleUniform / 100) * (transform.unit === 'inch' ? 25.4 : 1.0);
    const scaledX = modelDims.x * scaleMultiplier;
    const scaledY = modelDims.y * scaleMultiplier;
    const scaledZ = modelDims.z * scaleMultiplier;

    const overflow = scaledX > bedDimensions.x || scaledY > bedDimensions.y || scaledZ > bedDimensions.z;
    setIsBedOverflow(overflow);
  }, [modelDims, transform, bedDimensions]);

  // Handle measurement caliper click
  const handleMeasureClick = useCallback((worldPoint: THREE.Vector3) => {
    setCaliperPoints(prev => {
      if (prev.length >= 2) {
        const next = [worldPoint];
        setCaliperDistance(null);
        if (onMeasurementChange) onMeasurementChange(null);
        return next;
      }
      const next = [...prev, worldPoint];
      if (next.length === 2) {
        const dist = Number(next[0].distanceTo(next[1]).toFixed(2));
        setCaliperDistance(dist);
        if (onMeasurementChange) {
          onMeasurementChange({
            p1: { x: next[0].x, y: next[0].y, z: next[0].z },
            p2: { x: next[1].x, y: next[1].y, z: next[1].z },
            distanceMm: dist
          });
        }
      }
      return next;
    });
  }, [onMeasurementChange]);

  // Main Three.js Scene Setup & Geometry Pipeline
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1120); // Dark engineering CAD navy
    sceneRef.current = scene;

    // 2. Cameras (CAD Extended Frustum with far=50,000 to prevent any zoomout clipping)
    const aspect = width / height;
    const persCamera = new THREE.PerspectiveCamera(45, aspect, 0.5, 50000);
    persCamera.position.set(160, 140, 180);
    persCamera.lookAt(0, 20, 0);
    perspectiveCameraRef.current = persCamera;

    const frustumSize = Math.max(bedDimensions.x, bedDimensions.y, 260);
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.5,
      50000
    );
    orthoCamera.position.set(160, 140, 180);
    orthoCamera.lookAt(0, 20, 0);
    orthoCameraRef.current = orthoCamera;

    const currentCam = cameraMode === 'orthographic' ? orthoCamera : persCamera;
    activeCameraRef.current = currentCam;

    // 4. Renderer with WebGL Local Clipping & Antialiasing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Allows screenshot export
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(70, 100, 70);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2ff, 0.75); // Cyan engineering accent
    dirLight2.position.set(-70, 60, -70);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffeedd, 0.45); // Warm fill
    dirLight3.position.set(0, -30, 60);
    scene.add(dirLight3);

    // 6. Millimeter CAD Build Plate Grid & Axis Lines (True 1:1 mm Scale)
    const bedWidth = bedDimensions.x;
    const bedDepth = bedDimensions.y;
    const bedHeight = bedDimensions.z;

    const gridHelper = new THREE.GridHelper(
      Math.max(bedWidth, bedDepth),
      Math.round(Math.max(bedWidth, bedDepth) / 10),
      0x008ba3,
      0x1e293b
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Coordinate Axes Helper at Bed Corner
    const axesHelper = new THREE.AxesHelper(Math.max(30, bedWidth * 0.15));
    axesHelper.position.set(-bedWidth / 2, 0.2, bedDepth / 2);
    scene.add(axesHelper);

    // Build Volume Cage (True mm)
    const buildBoxGeo = new THREE.BoxGeometry(bedWidth, bedHeight, bedDepth);
    const edges = new THREE.EdgesGeometry(buildBoxGeo);
    const cageColor = isBedOverflow ? 0xef4444 : 0x334155;
    const lineMat = new THREE.LineBasicMaterial({
      color: cageColor,
      transparent: true,
      opacity: isBedOverflow ? 0.75 : 0.35
    });
    const wireframeBox = new THREE.LineSegments(edges, lineMat);
    wireframeBox.position.set(0, bedHeight / 2, 0);
    scene.add(wireframeBox);

    // 7. Group for Model Meshes
    const group = new THREE.Group();
    scene.add(group);
    meshGroupRef.current = group;
    partMeshMapRef.current.clear();

    // Material Generator Helper
    const createMaterial = (partId: string, colorHex: string, isSelected: boolean) => {
      let finalColor = new THREE.Color(colorHex);
      let emissive = new THREE.Color(0x000000);
      let roughness = 0.35;
      let metalness = 0.15;

      // Defect Inspection Overlay
      if (showDefects) {
        finalColor = new THREE.Color(0xf59e0b); // Amber
        emissive = new THREE.Color(0x331a00);
      }

      // Selected Part Glow Highlight
      if (isSelected) {
        emissive = new THREE.Color(0x008ba3);
        roughness = 0.2;
      }

      // Before/After Repair Simulation
      if (compareMode === 'before') {
        finalColor = new THREE.Color(0x991b1b); // Red tone for un-repaired mesh
      }

      return new THREE.MeshStandardMaterial({
        color: finalColor,
        emissive: emissive,
        roughness: roughness,
        metalness: metalness,
        wireframe: wireframe,
        side: THREE.DoubleSide
      });
    };

    let calculatedHeight = 40;
    let computedDimensions = { x: 92, y: 92, z: 38 };

    // --- CASE 1: REAL CUSTOM BUFFER GEOMETRY (STL / Auto-fixed Mesh) ---
    if (customGeometry) {
      const geom = customGeometry.clone();
      geom.computeVertexNormals();
      geom.computeBoundingBox();

      const box = geom.boundingBox || new THREE.Box3();
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Translate geometry so bottom sits at Y = 0 and centered at (0, 0) in X, Z
      geom.translate(-center.x, -box.min.y, -center.z);

      calculatedHeight = size.y;
      computedDimensions = { x: Number(size.x.toFixed(1)), y: Number(size.z.toFixed(1)), z: Number(size.y.toFixed(1)) };
      setModelDims(computedDimensions);
      setModelHeight(calculatedHeight);

      const part0 = parts[0];
      const isPartSelected = part0?.id === selectedPartId;
      const primaryColor = part0?.colorHex || '#00687a';

      if (part0?.visible !== false) {
        const mesh = new THREE.Mesh(geom, createMaterial(part0?.id || 'custom-part', primaryColor, isPartSelected));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { partId: part0?.id || 'custom-part', partName: part0?.name || 'Custom STL Mesh' };

        group.add(mesh);
        if (part0?.id) partMeshMapRef.current.set(part0.id, mesh);
      }

    }
    // --- CASE 2: REAL OBJECT GROUP (3MF Multi-Part / OBJ) ---
    else if (customObjectGroup) {
      const objClone = customObjectGroup.clone(true);

      let partIndex = 0;
      objClone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.geometry) {
            m.geometry.computeVertexNormals();
          }
          const currentPart = parts[partIndex] || parts[0];
          const partId = currentPart?.id || `part-${partIndex}`;
          const isSelected = partId === selectedPartId;
          const partColor = currentPart?.colorHex || (partIndex === 0 ? '#00687a' : '#ea580c');

          m.material = createMaterial(partId, partColor, isSelected);
          m.castShadow = true;
          m.receiveShadow = true;
          m.visible = currentPart ? currentPart.visible !== false : true;
          m.userData = { partId, partName: currentPart?.name || `Component ${partIndex + 1}` };

          partMeshMapRef.current.set(partId, m);
          partIndex++;
        }
      });

      objClone.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(objClone);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      calculatedHeight = size.y;
      computedDimensions = { x: Number(size.x.toFixed(1)), y: Number(size.z.toFixed(1)), z: Number(size.y.toFixed(1)) };
      setModelDims(computedDimensions);
      setModelHeight(calculatedHeight);

      // Center model in X and Z, and place bottom on Y = 0 (build plate)
      objClone.position.set(-center.x, -box.min.y, -center.z);

      group.add(objClone);

    }
    // --- CASE 3: BENCHMARK SAMPLE MODELS (True 1:1 Scale) ---
    else if (modelType === 'gear' || modelType.includes('planetary')) {
      calculatedHeight = 38;
      computedDimensions = { x: 92.5, y: 92.5, z: 38.0 };
      setModelDims(computedDimensions);
      setModelHeight(38);

      const sunPart = parts[0];
      const planetPart = parts[1];
      const ringPart = parts[2];
      const carrierPart = parts[3];

      // 1. Central Sun Gear
      if (sunPart?.visible !== false) {
        const sunGeo = new THREE.CylinderGeometry(16, 16, 28, 24);
        const sunMesh = new THREE.Mesh(
          sunGeo,
          createMaterial(sunPart?.id || 'sun', sunPart?.colorHex || '#00687a', sunPart?.id === selectedPartId)
        );
        sunMesh.position.y = 14;
        sunMesh.castShadow = true;
        sunMesh.userData = { partId: sunPart?.id || 'sun', partName: sunPart?.name || 'Sun Gear Central' };
        group.add(sunMesh);
        if (sunPart?.id) partMeshMapRef.current.set(sunPart.id, sunMesh);
      }

      // 2. Planet Gears Triad
      if (planetPart?.visible !== false) {
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const pGeo = new THREE.CylinderGeometry(12, 12, 24, 20);
          const pMesh = new THREE.Mesh(
            pGeo,
            createMaterial(planetPart?.id || 'planet', planetPart?.colorHex || '#ea580c', planetPart?.id === selectedPartId)
          );
          pMesh.position.x = Math.cos(angle) * 34;
          pMesh.position.z = Math.sin(angle) * 34;
          pMesh.position.y = 14;
          pMesh.castShadow = true;
          pMesh.userData = { partId: planetPart?.id || 'planet', partName: planetPart?.name || 'Planet Gears Triad' };
          group.add(pMesh);
          if (planetPart?.id && i === 0) partMeshMapRef.current.set(planetPart.id, pMesh);
        }
      }

      // 3. Outer Ring Gear Housing
      if (ringPart?.visible !== false) {
        const ringTorus = new THREE.TorusGeometry(46, 7.6, 16, 36);
        const ringMesh = new THREE.Mesh(
          ringTorus,
          createMaterial(ringPart?.id || 'ring', ringPart?.colorHex || '#1C1C1C', ringPart?.id === selectedPartId)
        );
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 14;
        ringMesh.castShadow = true;
        ringMesh.userData = { partId: ringPart?.id || 'ring', partName: ringPart?.name || 'Outer Ring Gear Body' };
        group.add(ringMesh);
        if (ringPart?.id) partMeshMapRef.current.set(ringPart.id, ringMesh);
      }

      // 4. Carrier Plate & Base
      if (carrierPart?.visible !== false) {
        const plateGeo = new THREE.CylinderGeometry(38, 38, 5.6, 30);
        const plateMesh = new THREE.Mesh(
          plateGeo,
          createMaterial(carrierPart?.id || 'carrier', carrierPart?.colorHex || '#64748b', carrierPart?.id === selectedPartId)
        );
        plateMesh.position.y = 2.8;
        plateMesh.receiveShadow = true;
        plateMesh.userData = { partId: carrierPart?.id || 'carrier', partName: carrierPart?.name || 'Carrier Plate' };
        group.add(plateMesh);
        if (carrierPart?.id) partMeshMapRef.current.set(carrierPart.id, plateMesh);
      }

    } else if (modelType === 'box' || modelType.includes('arduino') || modelType.includes('enclosure')) {
      calculatedHeight = 28.5;
      computedDimensions = { x: 86.4, y: 64.0, z: 28.5 };
      setModelDims(computedDimensions);
      setModelHeight(28.5);

      const mainPart = parts[0];
      if (mainPart?.visible !== false) {
        const baseGeo = new THREE.BoxGeometry(80, 24, 56);
        const baseMesh = new THREE.Mesh(
          baseGeo,
          createMaterial(mainPart?.id || 'box-base', mainPart?.colorHex || '#00687a', mainPart?.id === selectedPartId)
        );
        baseMesh.position.y = 12;
        baseMesh.castShadow = true;
        baseMesh.userData = { partId: mainPart?.id || 'box-base', partName: 'Enclosure Base' };
        group.add(baseMesh);
        if (mainPart?.id) partMeshMapRef.current.set(mainPart.id, baseMesh);

        // Snap-fit lid
        const lidGeo = new THREE.BoxGeometry(82, 7, 58);
        const lidMesh = new THREE.Mesh(
          lidGeo,
          createMaterial('lid', '#1C1C1C', false)
        );
        lidMesh.position.y = 28;
        lidMesh.castShadow = true;
        group.add(lidMesh);
      }
    } else {
      // Drone Frame / Generic Mesh
      calculatedHeight = 18;
      computedDimensions = { x: 180.0, y: 180.0, z: 18.0 };
      setModelDims(computedDimensions);
      setModelHeight(18);

      const dronePart = parts[0];
      if (dronePart?.visible !== false) {
        const bodyGeo = new THREE.BoxGeometry(40, 12, 40);
        const bodyMesh = new THREE.Mesh(
          bodyGeo,
          createMaterial(dronePart?.id || 'drone-body', dronePart?.colorHex || '#1C1C1C', dronePart?.id === selectedPartId)
        );
        bodyMesh.position.y = 6;
        group.add(bodyMesh);

        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + Math.PI / 4;
          const armGeo = new THREE.BoxGeometry(65, 6, 12);
          const arm = new THREE.Mesh(armGeo, createMaterial('arm', '#1C1C1C', false));
          arm.position.x = Math.cos(angle) * 45;
          arm.position.z = Math.sin(angle) * 45;
          arm.position.y = 6;
          arm.rotation.y = -angle;
          arm.castShadow = true;
          group.add(arm);
        }
      }
    }

    // 8. Apply Transformations (Scale, Rotation, Translation)
    const scaleFactor = (transform.scaleUniform / 100) * (transform.unit === 'inch' ? 25.4 : 1.0);
    group.scale.set(
      scaleFactor * (transform.scaleX || 1),
      scaleFactor * (transform.scaleY || 1),
      scaleFactor * (transform.scaleZ || 1)
    );
    group.rotation.x = THREE.MathUtils.degToRad(transform.rotationX);
    group.rotation.y = THREE.MathUtils.degToRad(transform.rotationY);
    group.rotation.z = THREE.MathUtils.degToRad(transform.rotationZ);
    group.position.x = transform.positionX || 0;
    group.position.z = transform.positionZ || 0;
    group.updateMatrixWorld(true);

    // 9. Bounding Box Mesh Overlay (Accurately enclosing transformed group)
    if (showBoundingBox) {
      const box3 = new THREE.Box3().setFromObject(group);
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
        color: isBedOverflow ? 0xef4444 : 0x00d2ff,
        transparent: true,
        opacity: 0.8
      });
      const bboxSegments = new THREE.LineSegments(bboxEdges, bboxMat);
      bboxSegments.position.copy(boxCenter);
      scene.add(bboxSegments);
      boundingBoxMeshRef.current = bboxSegments;
    }

    // 10. Measurement Caliper 3D Line & Endpoints
    if (caliperPoints.length > 0) {
      caliperPoints.forEach((pt) => {
        const sphereGeo = new THREE.SphereGeometry(2.5, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const marker = new THREE.Mesh(sphereGeo, sphereMat);
        marker.position.copy(pt);
        scene.add(marker);
        measurePointsMeshesRef.current.push(marker);
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
        measurementLineRef.current = line;
      }
    }

    // 11. Dynamic Optimal Camera Auto-fit
    const maxDim = Math.max(computedDimensions.x, computedDimensions.y, computedDimensions.z, 50);
    const bedMax = Math.max(bedDimensions.x, bedDimensions.y);
    const fitDist = Math.max(maxDim * 1.8, bedMax * 1.2, 160);

    persCamera.position.set(fitDist * 0.75, fitDist * 0.65, fitDist * 0.85);
    persCamera.lookAt(0, calculatedHeight / 2, 0);
    orthoCamera.position.set(fitDist * 0.75, fitDist * 0.65, fitDist * 0.85);
    orthoCamera.lookAt(0, calculatedHeight / 2, 0);

    // 11. Mouse & Touch Raycasting & Interaction Handlers
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
        const targetY = calculatedHeight / 2;
        const lookTarget = new THREE.Vector3(0, targetY, 0);

        // Orbit Mode: Orbit active camera around target center
        if (interactionMode === 'orbit' && (e.buttons === 1 && !e.shiftKey)) {
          if (currentCamera) {
            const offset = currentCamera.position.clone().sub(lookTarget);
            const spherical = new THREE.Spherical().setFromVector3(offset);
            spherical.theta -= deltaX * 0.007;
            spherical.phi -= deltaY * 0.007;
            spherical.phi = Math.max(0.04, Math.min(Math.PI * 0.48, spherical.phi));
            currentCamera.position.copy(lookTarget.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
            currentCamera.lookAt(lookTarget);
          }
        }
        // Pan Mode (Right Click, Shift+Left Click, or Pan Button active)
        else if (interactionMode === 'pan' || e.buttons === 2 || (e.buttons === 1 && e.shiftKey)) {
          if (currentCamera) {
            const panFactor = Math.max(0.08, currentCamera.position.length() * 0.001);
            currentCamera.position.x -= deltaX * panFactor;
            currentCamera.position.y += deltaY * panFactor;
          }
        }
      } else {
        // Hover Raycast for Part Tooltip
        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
        const currentCamera = activeCameraRef.current;
        if (currentCamera && meshGroupRef.current) {
          raycaster.setFromCamera(mouse, currentCamera);
          const intersects = raycaster.intersectObjects(meshGroupRef.current.children, true);
          if (intersects.length > 0) {
            const first = intersects[0].object;
            if (first.userData?.partName) {
              setHoveredPartName(first.userData.partName);
            }
          } else {
            setHoveredPartName(null);
          }
        }
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;

      // Click detected (dragDistance < 5px)
      if (dragDistance < 5) {
        const pos = getPointerPos(e);
        mouse.x = pos.x;
        mouse.y = pos.y;
        const currentCamera = activeCameraRef.current;

        if (currentCamera && meshGroupRef.current) {
          raycaster.setFromCamera(mouse, currentCamera);
          const intersects = raycaster.intersectObjects(meshGroupRef.current.children, true);

          if (intersects.length > 0) {
            const hit = intersects[0];
            // Measurement Mode: Click point
            if (measurementActive) {
              handleMeasureClick(hit.point);
              return;
            }

            // Part Selection
            const partId = hit.object.userData?.partId;
            if (partId && onSelectPart) {
              onSelectPart(partId);
            }
          } else if (!measurementActive && onSelectPart) {
            onSelectPart(null);
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
          oCam.zoom = Math.max(0.02, Math.min(30, oCam.zoom));
          oCam.updateProjectionMatrix();
        }
      } else {
        const pCam = perspectiveCameraRef.current;
        if (pCam) {
          const targetY = calculatedHeight / 2;
          const lookTarget = new THREE.Vector3(0, targetY, 0);
          const offset = pCam.position.clone().sub(lookTarget);
          const currentDist = offset.length();
          const zoomRate = Math.max(0.2, currentDist * 0.0018);
          const zoomDelta = e.deltaY * zoomRate;
          const newDist = Math.max(5, Math.min(45000, currentDist + zoomDelta));
          offset.normalize().multiplyScalar(newDist);
          pCam.position.copy(lookTarget.clone().add(offset));
        }
      }
    };

    // Touch Support for Mobile/Tablet
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
      const targetY = calculatedHeight / 2;
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

    // 12. Render Animation Loop
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

    // 13. Resize Observer with requestAnimationFrame debounce
    let resizeRafId: number | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const w = Math.floor(entry.contentRect.width);
          const h = Math.floor(entry.contentRect.height);
          if (w > 0 && h > 0 && (w !== lastWidth || h !== lastHeight)) {
            lastWidth = w;
            lastHeight = h;
            const aspect = w / h;
            if (perspectiveCameraRef.current) {
              perspectiveCameraRef.current.aspect = aspect;
              perspectiveCameraRef.current.updateProjectionMatrix();
            }
            if (orthoCameraRef.current) {
              const fSize = Math.max(bedDimensions.x, bedDimensions.y, 260);
              orthoCameraRef.current.left = (-fSize * aspect) / 2;
              orthoCameraRef.current.right = (fSize * aspect) / 2;
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
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
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
  }, [
    modelType,
    parts,
    transform,
    bedDimensions,
    wireframe,
    clipPlaneActive,
    clippingAxis,
    showDefects,
    showBoundingBox,
    cameraMode,
    interactionMode,
    selectedPartId,
    caliperPoints,
    compareMode,
    customGeometry,
    customObjectGroup,
    handleMeasureClick,
    onSelectPart,
    measurementActive
  ]);

  // Clipping Plane Slider Handler
  const handleSliceChange = (val: number) => {
    setCurrentSlice(val);
    if (clipPlaneRef.current) {
      let normal = new THREE.Vector3(0, -1, 0);
      let maxDist = modelHeight;
      if (clippingAxis === 'x') {
        normal = new THREE.Vector3(-1, 0, 0);
        maxDist = modelDims.x;
      } else if (clippingAxis === 'y') {
        normal = new THREE.Vector3(0, 0, -1);
        maxDist = modelDims.y;
      }

      clipPlaneRef.current.normal.copy(normal);
      clipPlaneRef.current.constant = (val / 100) * (maxDist / 2);
      setClipPlaneActive(val < 100);
    }
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.set(0, 0, 0);
      meshGroupRef.current.position.set(0, 0, 0);
    }
    const maxDim = Math.max(modelDims.x, modelDims.y, modelDims.z, 50);
    const bedMax = Math.max(bedDimensions.x, bedDimensions.y);
    const dist = Math.max(maxDim * 1.8, bedMax * 1.2, 160);
    if (perspectiveCameraRef.current) {
      perspectiveCameraRef.current.position.set(dist * 0.75, dist * 0.65, dist * 0.85);
      perspectiveCameraRef.current.lookAt(0, modelHeight / 2, 0);
    }
    if (orthoCameraRef.current) {
      orthoCameraRef.current.position.set(dist * 0.75, dist * 0.65, dist * 0.85);
      orthoCameraRef.current.lookAt(0, modelHeight / 2, 0);
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  // Auto-fit Model in Viewport
  const handleAutoFit = () => {
    const box = new THREE.Box3();
    if (meshGroupRef.current) {
      box.setFromObject(meshGroupRef.current);
    }
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const radius = Math.max(sphere.radius, bedDimensions.x * 0.45, 45);
    const cameraDist = radius * 2.2;

    if (perspectiveCameraRef.current) {
      perspectiveCameraRef.current.position.set(cameraDist * 0.75, cameraDist * 0.65, cameraDist * 0.85);
      perspectiveCameraRef.current.lookAt(0, modelHeight / 2, 0);
    }
    if (orthoCameraRef.current) {
      orthoCameraRef.current.position.set(cameraDist * 0.75, cameraDist * 0.65, cameraDist * 0.85);
      orthoCameraRef.current.lookAt(0, modelHeight / 2, 0);
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSlicingPlaying, setIsSlicingPlaying] = useState(false);
  const [showQuickTools, setShowQuickTools] = useState(true);

  // Auto-slicing simulation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSlicingPlaying) {
      timer = setInterval(() => {
        setCurrentSlice(prev => {
          if (prev >= 100) return 5;
          return prev + 2;
        });
      }, 80);
    }
    return () => clearInterval(timer);
  }, [isSlicingPlaying]);

  // Sync slicing with clipPlane
  useEffect(() => {
    if (isSlicingPlaying) {
      handleSliceChange(currentSlice);
    }
  }, [currentSlice, isSlicingPlaying]);

  // Quick 90 deg rotation
  const handleRotate90 = (axis: 'x' | 'y' | 'z') => {
    if (!onUpdateTransform) return;
    if (axis === 'x') onUpdateTransform({ rotationX: ((transform.rotationX || 0) + 90) % 360 });
    if (axis === 'y') onUpdateTransform({ rotationY: ((transform.rotationY || 0) + 90) % 360 });
    if (axis === 'z') onUpdateTransform({ rotationZ: ((transform.rotationZ || 0) + 90) % 360 });
  };

  // Quick Scale Step
  const handleQuickScaleDelta = (deltaPercent: number) => {
    if (!onUpdateTransform) return;
    const newScale = Math.max(10, Math.min(500, Math.round((transform.scaleUniform || 100) + deltaPercent)));
    onUpdateTransform({ scaleUniform: newScale });
  };

  // Center model on bed
  const handleCenterModel = () => {
    if (!onUpdateTransform) return;
    onUpdateTransform({ positionX: 0, positionZ: 0 });
  };

  // Auto scale model to fit printer bed
  const handleScaleToFitBed = () => {
    if (!onUpdateTransform) return;
    const fitFactor = Math.min(
      (bedDimensions.x * 0.85) / Math.max(1, modelDims.x),
      (bedDimensions.y * 0.85) / Math.max(1, modelDims.y),
      (bedDimensions.z * 0.85) / Math.max(1, modelDims.z)
    );
    const targetScale = Math.max(5, Math.min(300, Math.round(fitFactor * 100)));
    onUpdateTransform({ scaleUniform: targetScale, positionX: 0, positionZ: 0 });
  };

  // Switch Viewport Presets
  const setViewPreset = (view: 'top' | 'front' | 'side' | 'iso') => {
    setActivePreset(view);
    if (!meshGroupRef.current) return;
    meshGroupRef.current.rotation.set(0, 0, 0);
    const maxDim = Math.max(modelDims.x, modelDims.y, modelDims.z, 50);
    const bedMax = Math.max(bedDimensions.x, bedDimensions.y);
    const d = Math.max(maxDim * 1.8, bedMax * 1.2, 160);

    const setCamPos = (cam: THREE.Camera) => {
      if (view === 'top') {
        cam.position.set(0, d * 1.4, 0.01);
      } else if (view === 'front') {
        cam.position.set(0, modelHeight / 2, d * 1.2);
      } else if (view === 'side') {
        cam.position.set(d * 1.2, modelHeight / 2, 0);
      } else {
        cam.position.set(d * 0.75, d * 0.65, d * 0.85);
      }
      cam.lookAt(0, modelHeight / 2, 0);
    };

    if (perspectiveCameraRef.current) setCamPos(perspectiveCameraRef.current);
    if (orthoCameraRef.current) setCamPos(orthoCameraRef.current);
  };

  // Capture High-Resolution Thumbnail PNG
  const handleCaptureThumbnail = () => {
    if (!rendererRef.current || !sceneRef.current) return;
    const activeCam = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    if (!activeCam) return;

    rendererRef.current.render(sceneRef.current, activeCam);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `VCube_3D_Thumbnail_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Clear Caliper Measurement
  const clearMeasurement = () => {
    setCaliperPoints([]);
    setCaliperDistance(null);
    if (onMeasurementChange) onMeasurementChange(null);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFile) {
          onDropFile(e.dataTransfer.files[0]);
        }
      }}
      className={`relative bg-[#070f1e] overflow-hidden border ${
        isBedOverflow ? 'border-rose-600 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'border-[#1e2e48]'
      } flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen p-0'
          : `rounded-xl ${className}`
      }`}
    >
      {/* Drag and Drop Over Canvas Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#00687a]/85 backdrop-blur-md flex flex-col items-center justify-center text-white border-2 border-dashed border-cyan-400">
          <span className="material-symbols-outlined text-4xl animate-bounce text-cyan-300">upload_file</span>
          <p className="font-tech text-sm font-bold mt-2 uppercase tracking-wider">Thả tập tin 3MF / STL / OBJ vào đây</p>
          <span className="text-xs text-cyan-200">Hệ thống sẽ bóc tách cấu trúc 3D tự động</span>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing min-h-[300px]" />

      {/* UNIFIED TOP BAR: Status, Dimensions & CAD Toolbar (No Overlap) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 pointer-events-none">
        {/* LEFT ZONE: Status & Geometry Metrics */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e2e48] shadow-lg text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse"></span>
          <span className="font-tech text-xs font-bold text-cyan-300 tracking-wide">VCUBE 3D</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="font-tech text-slate-300 text-[11px] hidden sm:inline">
            Bàn: {bedDimensions.x}×{bedDimensions.y}×{bedDimensions.z} mm
          </span>
          <span className="font-tech text-[11px] text-cyan-200 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/50">
            {modelDims.x.toFixed(1)}×{modelDims.y.toFixed(1)}×{modelDims.z.toFixed(1)} mm
          </span>
          {isBedOverflow && onUpdateTransform && (
            <button
              type="button"
              onClick={handleScaleToFitBed}
              title="Nhấn để tự động thu nhỏ mô hình vừa vặn trong bàn in"
              className="px-2 py-0.5 text-[10px] bg-rose-900/90 hover:bg-rose-800 text-rose-200 border border-rose-500 rounded font-tech font-bold flex items-center gap-1 animate-pulse shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">fit_screen</span>
              Co vừa bàn
            </button>
          )}
        </div>

        {/* RIGHT ZONE: Grouped CAD Tools Toolbar */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#091426]/95 backdrop-blur-md p-1 rounded-lg border border-[#1e2e48] shadow-lg text-white overflow-x-auto max-w-full">
          {/* Projection Mode */}
          <button
            type="button"
            onClick={() => onCameraModeChange && onCameraModeChange(cameraMode === 'perspective' ? 'orthographic' : 'perspective')}
            title={cameraMode === 'perspective' ? '3D Phối cảnh (Perspective) -> Nhấn đổi Trục đo CAD' : 'Trục đo CAD (Orthographic) -> Nhấn đổi Phối cảnh 3D'}
            className={`px-2 py-1 text-[10px] font-tech font-bold rounded flex items-center gap-1 transition-colors ${
              cameraMode === 'orthographic' ? 'bg-cyan-700 text-white shadow-xs' : 'text-slate-300 hover:bg-[#1e2e48]'
            }`}
          >
            <span className="material-symbols-outlined text-xs">view_in_ar</span>
            <span>{cameraMode === 'perspective' ? 'PERSP' : 'ORTHO'}</span>
          </button>

          <span className="w-px h-4 bg-[#1e2e48] mx-0.5 shrink-0"></span>

          {/* Viewport Presets */}
          <div className="flex items-center gap-0.5 bg-[#0e1a2f] p-0.5 rounded border border-[#1e2e48]/60">
            {(['iso', 'top', 'front', 'side'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setViewPreset(view)}
                className={`px-1.5 py-0.5 text-[9px] font-tech font-bold rounded transition-colors uppercase ${
                  activePreset === view ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'
                }`}
                title={`Góc nhìn ${view.toUpperCase()}`}
              >
                {view}
              </button>
            ))}
          </div>

          <span className="w-px h-4 bg-[#1e2e48] mx-0.5 shrink-0"></span>

          {/* Orbit / Pan Toggle */}
          <button
            type="button"
            onClick={() => setInteractionMode(interactionMode === 'orbit' ? 'pan' : 'orbit')}
            title={interactionMode === 'orbit' ? 'Chế độ Xoay (Orbit). Bấm để chuyển sang Pan' : 'Chế độ Di chuyển (Pan). Bấm để chuyển sang Orbit'}
            className={`p-1.5 rounded transition-colors ${interactionMode === 'pan' ? 'text-cyan-300 bg-cyan-900/60 ring-1 ring-cyan-500' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'}`}
          >
            <span className="material-symbols-outlined text-sm">pan_tool</span>
          </button>

          {/* Auto Fit View */}
          <button
            type="button"
            onClick={handleAutoFit}
            title="Căn chỉnh vừa khung nhìn (Fit Model)"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2e48] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">fit_screen</span>
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            title="Đặt lại vị trí góc nhìn chuẩn (Reset Cam)"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2e48] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">center_focus_strong</span>
          </button>

          {/* 360 Auto-Rotate */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Dừng xoay tự động' : 'Tự động xoay 360°'}
            className={`p-1.5 rounded transition-colors ${isRotating ? 'text-cyan-300 bg-cyan-900/60 ring-1 ring-cyan-500' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'}`}
          >
            <span className="material-symbols-outlined text-sm">360</span>
          </button>

          <span className="w-px h-4 bg-[#1e2e48] mx-0.5 shrink-0"></span>

          {/* Bounding Box */}
          <button
            type="button"
            onClick={onToggleBoundingBox}
            title={showBoundingBox ? 'Ẩn Hộp Giới Hạn (Bounding Box)' : 'Hiện Hộp Giới Hạn (Bounding Box)'}
            className={`p-1.5 rounded transition-colors ${showBoundingBox ? 'text-cyan-300 bg-cyan-900/60' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'}`}
          >
            <span className="material-symbols-outlined text-sm">crop_free</span>
          </button>

          {/* Wireframe */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            title={wireframe ? 'Chế độ Khối đặc' : 'Chế độ Khung dây (Wireframe)'}
            className={`p-1.5 rounded transition-colors ${wireframe ? 'text-cyan-300 bg-cyan-900/60' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'}`}
          >
            <span className="material-symbols-outlined text-sm">grid_4x4</span>
          </button>

          {/* Caliper Measurement */}
          <button
            type="button"
            onClick={onToggleMeasurement}
            title={measurementActive ? 'Tắt Thước Đo 3D' : 'Bật Thước Đo 3D (Caliper)'}
            className={`p-1.5 rounded transition-colors ${
              measurementActive ? 'text-amber-400 bg-amber-950/70 ring-1 ring-amber-500' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">straighten</span>
          </button>

          {/* Overhang Inspection */}
          <button
            type="button"
            onClick={onToggleDefects}
            title={showDefects ? 'Tắt Bản đồ nhiệt Overhang' : 'Bản đồ nhiệt Overhang / Lỗi lưới'}
            className={`p-1.5 rounded transition-colors ${
              showDefects ? 'text-amber-400 bg-amber-950/70 ring-1 ring-amber-500' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">wb_incandescent</span>
          </button>

          <span className="w-px h-4 bg-[#1e2e48] mx-0.5 shrink-0"></span>

          {/* Capture Snapshot */}
          <button
            type="button"
            onClick={handleCaptureThumbnail}
            title="Chụp ảnh Thumbnail 3D (Tải PNG)"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2e48] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Thu nhỏ Viewport' : 'Toàn màn hình Viewport'}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2e48] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* FLOATING QUICK-TRANSFORM PALETTE (LEFT / MID-LEFT) */}
      {onUpdateTransform && (
        <div className="absolute left-2.5 top-16 z-20 flex flex-col gap-1 pointer-events-none">
          {showQuickTools ? (
            <div className="pointer-events-auto bg-[#091426]/95 backdrop-blur-md p-1.5 rounded-lg border border-[#1e2e48] shadow-xl text-white flex flex-col gap-1 w-32 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] font-tech text-slate-400 px-1 border-b border-[#1e2e48] pb-1">
                <span className="text-cyan-300 font-bold">THAO TÁC 3D</span>
                <button
                  type="button"
                  onClick={() => setShowQuickTools(false)}
                  className="hover:text-white text-slate-500"
                  title="Ẩn thanh công cụ nhanh"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>

              {/* Quick Scale Delta */}
              <div className="flex items-center justify-between gap-1 text-[10px] font-tech">
                <span className="text-slate-400">Scale:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickScaleDelta(-10)}
                    title="Giảm 10% tỷ lệ"
                    className="px-1.5 py-0.5 bg-[#0e1a2f] hover:bg-cyan-900 border border-[#1e2e48] rounded text-slate-200"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickScaleDelta(10)}
                    title="Tăng 10% tỷ lệ"
                    className="px-1.5 py-0.5 bg-[#0e1a2f] hover:bg-cyan-900 border border-[#1e2e48] rounded text-slate-200"
                  >
                    +10%
                  </button>
                </div>
              </div>

              {/* Rotate 90 Deg */}
              <div className="flex items-center justify-between gap-1 text-[10px] font-tech pt-0.5">
                <span className="text-slate-400">Xoay 90°:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRotate90('z')}
                    title="Xoay 90° trục Z"
                    className="px-1.5 py-0.5 bg-[#0e1a2f] hover:bg-cyan-900 border border-[#1e2e48] rounded text-slate-200"
                  >
                    Z
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate90('x')}
                    title="Xoay 90° trục X"
                    className="px-1.5 py-0.5 bg-[#0e1a2f] hover:bg-cyan-900 border border-[#1e2e48] rounded text-slate-200"
                  >
                    X
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate90('y')}
                    title="Xoay 90° trục Y"
                    className="px-1.5 py-0.5 bg-[#0e1a2f] hover:bg-cyan-900 border border-[#1e2e48] rounded text-slate-200"
                  >
                    Y
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleCenterModel}
                className="w-full mt-1 py-1 px-1.5 bg-[#0e1a2f] hover:bg-[#1e2e48] text-slate-300 hover:text-white rounded text-[10px] font-tech flex items-center justify-center gap-1 border border-[#1e2e48] transition-colors"
              >
                <span className="material-symbols-outlined text-xs">filter_center_focus</span>
                Căn giữa bàn
              </button>

              <button
                type="button"
                onClick={handleScaleToFitBed}
                className="w-full py-1 px-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 rounded text-[10px] font-tech font-bold flex items-center justify-center gap-1 border border-cyan-800/60 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">aspect_ratio</span>
                Co vừa bàn in
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowQuickTools(true)}
              title="Mở thanh công cụ nhanh"
              className="pointer-events-auto p-1.5 bg-[#091426]/90 backdrop-blur-md rounded-lg border border-[#1e2e48] text-cyan-400 hover:text-white shadow-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">build</span>
            </button>
          )}
        </div>
      )}

      {/* HOVER TOOLTIP */}
      {hoveredPartName && (
        <div className="absolute top-16 right-3 bg-[#091426]/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-700/50 text-[11px] font-tech text-cyan-300 pointer-events-none shadow-lg z-20">
          <span className="text-slate-400">Chi tiết:</span> {hoveredPartName}
        </div>
      )}

      {/* CALIPER ACTIVE HUD */}
      {measurementActive && (
        <div className="absolute top-16 right-3 bg-[#131b2e]/95 backdrop-blur-md p-2.5 rounded-lg border border-amber-500/60 text-xs text-white max-w-xs shadow-xl space-y-1.5 z-20">
          <div className="flex items-center justify-between gap-2 font-bold text-amber-400 font-tech">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">straighten</span>
              THƯỚC ĐO 3D (CALIPER)
            </span>
            <button
              type="button"
              onClick={clearMeasurement}
              className="text-[10px] text-slate-400 hover:text-white uppercase underline cursor-pointer"
            >
              Xóa điểm
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            {caliperPoints.length === 0 && 'Nhấp chuột lên điểm thứ nhất trên mô hình...'}
            {caliperPoints.length === 1 && 'Nhấp chuột lên điểm thứ hai để tính khoảng cách...'}
            {caliperPoints.length === 2 && (
              <span className="text-emerald-400 font-tech font-bold text-sm block">
                Khoảng cách: {caliperDistance} mm
              </span>
            )}
          </p>
        </div>
      )}

      {/* BOTTOM SLICER & CROSS-SECTION CLIPPING BAR */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#091426]/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-[#1e2e48] shadow-xl flex items-center justify-between gap-3 text-white z-20">
        {/* Layer Label & Play/Pause Simulation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSlicingPlaying(!isSlicingPlaying)}
            title={isSlicingPlaying ? 'Dừng mô phỏng cắt lớp' : 'Chạy mô phỏng cắt lớp tự động (Layer Simulation)'}
            className={`p-1 rounded transition-colors ${isSlicingPlaying ? 'text-cyan-300 bg-cyan-900/60 ring-1 ring-cyan-500' : 'text-slate-400 hover:text-white hover:bg-[#1e2e48]'}`}
          >
            <span className="material-symbols-outlined text-sm">
              {isSlicingPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <span className="material-symbols-outlined text-cyan-400 text-sm hidden sm:inline">layers</span>
          <span className="font-tech text-xs text-slate-200 whitespace-nowrap">
            MẶT CẮT: <span className="text-cyan-300 font-bold">{currentSlice}%</span>
          </span>
        </div>

        {/* Axis Selector */}
        <div className="flex items-center gap-0.5 shrink-0 bg-[#0e1a2f] p-0.5 rounded border border-[#1e2e48] text-[10px] font-tech font-bold">
          {(['z', 'x', 'y'] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => setClippingAxis(axis)}
              className={`px-1.5 py-0.5 rounded transition-colors uppercase ${
                clippingAxis === axis ? 'bg-[#00687a] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Cắt theo trục ${axis.toUpperCase()}`}
            >
              {axis}
            </button>
          ))}
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="5"
          max="100"
          value={currentSlice}
          onChange={(e) => {
            setIsSlicingPlaying(false);
            handleSliceChange(Number(e.target.value));
          }}
          className="w-full h-1.5 bg-[#132238] rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        {/* Calculated Height Info */}
        <div className="text-[10px] font-tech text-slate-400 shrink-0 hidden md:block whitespace-nowrap">
          H = {((modelHeight * currentSlice) / 100).toFixed(1)} / {modelHeight.toFixed(1)} mm
        </div>
      </div>
    </div>
  );
};
