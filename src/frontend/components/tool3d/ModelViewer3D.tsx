import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ModelPart, TransformState, MeasurementResult, PlateInfo } from '../../types';

export interface ModelViewer3DProps {
  fileName?: string;
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
  // Multi-Plate Support
  plates?: PlateInfo[];
  activePlateIndex?: number;
  onSelectPlate?: (plateIndex: number) => void;
}

/**
 * Cleanly and recursively disposes every BufferGeometry, Material (and sub-materials), and Texture
 * within an Object3D hierarchy to completely eliminate VRAM and GPU memory leaks.
 */
export function disposeHierarchy(rootNode: THREE.Object3D, preserveMaterials = false) {
  rootNode.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && !mesh.userData?.isSharedGeometry) {
      mesh.geometry.dispose();
    }
    if (!preserveMaterials && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        for (const key of Object.keys(mat)) {
          const val = (mat as any)[key];
          if (val && typeof val === 'object' && val.isTexture) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
  while (rootNode.children.length > 0) {
    const child = rootNode.children[0];
    rootNode.remove(child);
  }
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  fileName,
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
  className = 'h-[380px] sm:h-[460px] w-full',
  plates = [],
  activePlateIndex = 1,
  onSelectPlate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootWrapperRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modelHeight, setModelHeight] = useState(40);
  const [modelDims, setModelDims] = useState<{ x: number; y: number; z: number }>({ x: 92, y: 92, z: 38 });
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);
  const [interactionMode] = useState<'orbit' | 'pan'>('orbit');
  const [caliperPoints, setCaliperPoints] = useState<THREE.Vector3[]>([]);
  const [caliperDistance, setCaliperDistance] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBedOverflow, setIsBedOverflow] = useState(false);
  const [currentSlice, setCurrentSlice] = useState<number>(100);
  const [activeAngle, setActiveAngle] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [fps, setFps] = useState<number>(60);
  const [localBoundingBox, setLocalBoundingBox] = useState<boolean>(showBoundingBox);
  const [localMeasurementActive, setLocalMeasurementActive] = useState<boolean>(measurementActive);

  // Sync props to local state
  useEffect(() => {
    setLocalBoundingBox(showBoundingBox);
  }, [showBoundingBox]);

  useEffect(() => {
    setLocalMeasurementActive(measurementActive);
  }, [measurementActive]);

  const isBoundingBoxActive = showBoundingBox !== undefined ? showBoundingBox : localBoundingBox;
  const isMeasurementActive = measurementActive !== undefined ? measurementActive : localMeasurementActive;

  // Active plate object
  const currentPlate = plates.find(p => p.index === activePlateIndex) || (plates.length > 0 ? plates[0] : null);

  // References to Three.js internal objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const stencilGroupRef = useRef<THREE.Group | null>(null);
  const capMeshRef = useRef<THREE.Mesh | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const orbitTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 20, 0));
  const boundingBoxMeshRef = useRef<THREE.LineSegments | null>(null);
  const measurementLineRef = useRef<THREE.Line | null>(null);
  const measurePointsMeshesRef = useRef<THREE.Mesh[]>([]);
  const partMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Clipping Plane for Slicer (pointing downward, clips y > constant)
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 50000));

  // Stencil materials for cross-section capping
  const stencilMatBackRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.AlwaysStencilFunc,
    side: THREE.BackSide,
    clippingPlanes: [clipPlaneRef.current],
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.IncrementWrapStencilOp,
    stencilZPass: THREE.KeepStencilOp
  }));

  const stencilMatFrontRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.AlwaysStencilFunc,
    side: THREE.FrontSide,
    clippingPlanes: [clipPlaneRef.current],
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.DecrementWrapStencilOp,
    stencilZPass: THREE.KeepStencilOp
  }));

  const capMaterialRef = useRef<THREE.MeshStandardMaterial>(new THREE.MeshStandardMaterial({
    color: 0x008ba3,
    roughness: 0.35,
    metalness: 0.1,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.ReplaceStencilOp,
    stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
    side: THREE.DoubleSide
  }));

  // Rendering control refs
  const animationFrameIdRef = useRef<number | null>(null);
  const isRotatingRef = useRef<boolean>(isRotating);
  isRotatingRef.current = isRotating;
  const cameraModeRef = useRef<'perspective' | 'orthographic'>(cameraMode);
  cameraModeRef.current = cameraMode;

  // Immediate frame render request
  const requestRender = useCallback(() => {
    const activeCam = cameraModeRef.current === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    if (activeCam && rendererRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, activeCam);
    }
  }, []);

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

  const localMeasurementActiveRef = useRef(localMeasurementActive);
  localMeasurementActiveRef.current = localMeasurementActive;

  const onSelectPartRef = useRef(onSelectPart);
  onSelectPartRef.current = onSelectPart;

  const handleMeasureClickRef = useRef(handleMeasureClick);
  handleMeasureClickRef.current = handleMeasureClick;

  // Fullscreen Management with HTML5 Fullscreen API + Fallback + Body Lock
  const handleToggleFullscreen = useCallback(async () => {
    try {
      const isCurrentlyFs = !!document.fullscreenElement || isFullscreen;
      if (!isCurrentlyFs) {
        if (rootWrapperRef.current?.requestFullscreen) {
          await rootWrapperRef.current.requestFullscreen();
        } else if ((rootWrapperRef.current as any)?.webkitRequestFullscreen) {
          await (rootWrapperRef.current as any).webkitRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native requestFullscreen failed or blocked, falling back to CSS fullscreen:', err);
      setIsFullscreen(prev => !prev);
    }
  }, [isFullscreen]);

  // Synchronize fullscreen state with browser events and keyboard shortcuts (ESC)
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isFullscreen || !!document.fullscreenElement)) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Lock body scroll when in fullscreen to prevent unwanted page scrolling behind CAD
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Force resize on fullscreen transition start and end
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        const asp = w / h;
        if (perspectiveCameraRef.current) {
          perspectiveCameraRef.current.aspect = asp;
          perspectiveCameraRef.current.updateProjectionMatrix();
        }
        if (orthoCameraRef.current) {
          const fSize = Math.max(bedDimensions.x, bedDimensions.y, 260);
          orthoCameraRef.current.left = (-fSize * asp) / 2;
          orthoCameraRef.current.right = (fSize * asp) / 2;
          orthoCameraRef.current.top = fSize / 2;
          orthoCameraRef.current.bottom = -fSize / 2;
          orthoCameraRef.current.updateProjectionMatrix();
        }
        rendererRef.current.setSize(w, h, true);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        requestRender();
      }
    };

    updateSize();
    const t1 = setTimeout(updateSize, 80);
    const t2 = setTimeout(updateSize, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, bedDimensions, requestRender]);

  // ---------------------------------------------------------------------------------
  // 1. SCENE GRAPH INITIALIZATION (Runs ONCE on mount; NOT destroyed on state change)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1120);
    sceneRef.current = scene;

    // 2. Cameras
    const aspect = width / height;
    const persCamera = new THREE.PerspectiveCamera(45, aspect, 0.5, 50000);
    const initialBedMax = Math.max(bedDimensions.x, bedDimensions.y, bedDimensions.z, 250);
    const initCamDist = initialBedMax * 2.2;
    persCamera.position.set(initCamDist * 0.75, initCamDist * 0.7, initCamDist * 0.85);
    persCamera.lookAt(0, bedDimensions.z * 0.2, 0);
    perspectiveCameraRef.current = persCamera;

    const frustumSize = Math.max(bedDimensions.x, bedDimensions.y, 260) * 1.8;
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.5,
      50000
    );
    orthoCamera.position.set(initCamDist * 0.75, initCamDist * 0.7, initCamDist * 0.85);
    orthoCamera.lookAt(0, bedDimensions.z * 0.2, 0);
    orthoCameraRef.current = orthoCamera;
    activeCameraRef.current = cameraMode === 'orthographic' ? orthoCamera : persCamera;

    // 3. WebGL Renderer with Stencil & Local Clipping Enabled
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true
    });
    renderer.setSize(width, height, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    const domEl = renderer.domElement;
    domEl.style.display = 'block';
    domEl.style.width = '100%';
    domEl.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(domEl);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(70, 100, 70);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2ff, 0.75);
    dirLight2.position.set(-70, 60, -70);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffeedd, 0.45);
    dirLight3.position.set(0, -30, 60);
    scene.add(dirLight3);

    // 5. Millimeter CAD Build Plate Grid & Axis Lines
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

    const axesHelper = new THREE.AxesHelper(Math.max(30, bedWidth * 0.15));
    axesHelper.position.set(-bedWidth / 2, 0.2, bedDepth / 2);
    scene.add(axesHelper);

    // Build Volume Cage
    const buildBoxGeo = new THREE.BoxGeometry(bedWidth, bedHeight, bedDepth);
    const edges = new THREE.EdgesGeometry(buildBoxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35
    });
    const wireframeBox = new THREE.LineSegments(edges, lineMat);
    wireframeBox.position.set(0, bedHeight / 2, 0);
    scene.add(wireframeBox);

    // 6. Model Mesh Group & Stencil Holder Group
    const modelGroup = new THREE.Group();
    modelGroup.name = 'ModelGroup';
    scene.add(modelGroup);
    meshGroupRef.current = modelGroup;

    const stencilGroup = new THREE.Group();
    stencilGroup.name = 'StencilGroup';
    stencilGroup.visible = false;
    scene.add(stencilGroup);
    stencilGroupRef.current = stencilGroup;

    // 7. Stencil Cross-Section Capping Plane Mesh
    const capPlaneGeo = new THREE.PlaneGeometry(2000, 2000);
    const capMesh = new THREE.Mesh(capPlaneGeo, capMaterialRef.current);
    capMesh.name = 'CrossSectionCapMesh';
    capMesh.rotation.x = -Math.PI / 2; // Flat horizontal plane with normal (0, 1, 0)
    capMesh.renderOrder = 3;
    capMesh.visible = false;
    scene.add(capMesh);
    capMeshRef.current = capMesh;

    // 8. Interaction Handlers (Mouse, Wheel, Touch)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragDistance = 0;
    let lastRaycastTime = 0;
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
      // GIMBAL LOCK PREVENTION: Restore standard camera Up vector (0, 1, 0) if previously viewing [TOP]
      if (activeCameraRef.current && activeCameraRef.current.up.y !== 1) {
        activeCameraRef.current.up.set(0, 1, 0);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (isDragging) {
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
        const currentCamera = activeCameraRef.current;
        const lookTarget = orbitTargetRef.current;

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
        } else if (interactionMode === 'pan' || e.buttons === 2 || (e.buttons === 1 && e.shiftKey)) {
          if (currentCamera) {
            const panFactor = Math.max(0.08, currentCamera.position.length() * 0.001);
            currentCamera.position.x -= deltaX * panFactor;
            currentCamera.position.y += deltaY * panFactor;
            orbitTargetRef.current.x -= deltaX * panFactor;
            orbitTargetRef.current.y += deltaY * panFactor;
          }
        }
      } else {
        // Hover Raycast for Part Tooltip with 30ms throttle to prevent main thread choke
        const now = performance.now();
        if (now - lastRaycastTime > 30) {
          lastRaycastTime = now;
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
      }
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
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
            if (localMeasurementActiveRef.current && handleMeasureClickRef.current) {
              handleMeasureClickRef.current(hit.point);
              return;
            }
            const partId = hit.object.userData?.partId;
            if (partId && onSelectPartRef.current) {
              onSelectPartRef.current(partId);
            }
          } else if (!localMeasurementActiveRef.current && onSelectPartRef.current) {
            onSelectPartRef.current(null);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentCamera = activeCameraRef.current;
      if (!currentCamera) return;

      if (cameraModeRef.current === 'orthographic') {
        const oCam = orthoCameraRef.current;
        if (oCam) {
          oCam.zoom += e.deltaY * -0.0015;
          oCam.zoom = Math.max(0.02, Math.min(30, oCam.zoom));
          oCam.updateProjectionMatrix();
        }
      } else {
        const pCam = perspectiveCameraRef.current;
        if (pCam) {
          const lookTarget = orbitTargetRef.current;
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

    let initialPinchDistance = 0;

    const onTouchStart = (e: TouchEvent) => {
      // GIMBAL LOCK PREVENTION: Restore standard camera Up vector (0, 1, 0) if previously viewing [TOP]
      if (activeCameraRef.current && activeCameraRef.current.up.y !== 1) {
        activeCameraRef.current.up.set(0, 1, 0);
      }
      if (e.touches.length === 1) {
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging = true;
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        const currentCamera = activeCameraRef.current;
        const lookTarget = orbitTargetRef.current;

        if (currentCamera) {
          const offset = currentCamera.position.clone().sub(lookTarget);
          const spherical = new THREE.Spherical().setFromVector3(offset);
          spherical.theta -= deltaX * 0.008;
          spherical.phi -= deltaY * 0.008;
          spherical.phi = Math.max(0.04, Math.min(Math.PI * 0.48, spherical.phi));
          currentCamera.position.copy(lookTarget.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
          currentCamera.lookAt(lookTarget);
        }
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && initialPinchDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentPinchDistance = Math.hypot(dx, dy);
        const pinchDelta = initialPinchDistance - currentPinchDistance;

        const pCam = perspectiveCameraRef.current;
        if (pCam) {
          const lookTarget = orbitTargetRef.current;
          const offset = pCam.position.clone().sub(lookTarget);
          const currentDist = offset.length();
          const zoomDelta = pinchDelta * Math.max(0.5, currentDist * 0.004);
          const newDist = Math.max(10, Math.min(45000, currentDist + zoomDelta));
          offset.normalize().multiplyScalar(newDist);
          pCam.position.copy(lookTarget.clone().add(offset));
        }
        initialPinchDistance = currentPinchDistance;
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
      initialPinchDistance = 0;
    };

    domEl.style.touchAction = 'none';
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('touchstart', onTouchStart, { passive: false });
    domEl.addEventListener('touchmove', onTouchMove, { passive: false });
    domEl.addEventListener('touchend', onTouchEnd);
    domEl.addEventListener('contextmenu', (e) => e.preventDefault());

    // WebGL Context Loss & Restoration Listeners
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost detected in ModelViewer3D. Preventing engine crash...');
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };

    const handleContextRestored = () => {
      console.info('WebGL context restored in ModelViewer3D. Rebuilding render queue...');
    };

    domEl.addEventListener('webglcontextlost', handleContextLost, false);
    domEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 9. Resize Observer (Debounced with RAF)
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
              const fSize = Math.max(bedDimensions.x, bedDimensions.y, 260);
              orthoCameraRef.current.left = (-fSize * asp) / 2;
              orthoCameraRef.current.right = (fSize * asp) / 2;
              orthoCameraRef.current.top = fSize / 2;
              orthoCameraRef.current.bottom = -fSize / 2;
              orthoCameraRef.current.updateProjectionMatrix();
            }
            if (rendererRef.current) {
              rendererRef.current.setSize(w, h, true);
              rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            }
          }
        }
      });
    });
    resizeObserver.observe(container);

    // 10. Continuous 60 FPS High-Precision Render Loop with Realtime Telemetry
    let isLoopRunning = true;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const renderLoop = (now: number) => {
      if (!isLoopRunning) return;
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);

      // Skip render calculations when tab is backgrounded to save GPU & battery
      if (document.hidden) return;

      // Realtime measured FPS calculation every 500ms
      frameCount++;
      if (now - lastFpsTime >= 500) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        setFps(Math.max(1, Math.min(120, measuredFps)));
        frameCount = 0;
        lastFpsTime = now;
      }

      // Smooth 360 Auto-Rotation
      if (isRotatingRef.current && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.008;
        if (stencilGroupRef.current) {
          stencilGroupRef.current.rotation.y = meshGroupRef.current.rotation.y;
        }
      }

      const activeCam = cameraModeRef.current === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
      if (activeCam && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, activeCam);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isLoopRunning = false;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeObserver.disconnect();
      domEl.removeEventListener('webglcontextlost', handleContextLost);
      domEl.removeEventListener('webglcontextrestored', handleContextRestored);
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
      disposeHierarchy(scene);
      renderer.dispose();
    };
  }, [bedDimensions.x, bedDimensions.y, bedDimensions.z]);

  // Separate Camera Mode Switcher (changes active camera without destroying WebGL context)
  useEffect(() => {
    activeCameraRef.current = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    requestRender();
  }, [cameraMode, requestRender]);

  // ---------------------------------------------------------------------------------
  // 2. MODEL GEOMETRY BUILDING (Runs ONLY when customGeometry / customObjectGroup / modelType changes)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    const group = meshGroupRef.current;
    const stencilGroup = stencilGroupRef.current;
    if (!group || !stencilGroup) return;

    // Cleanly dispose existing meshes in hierarchy before rebuilding (preserve shared stencil materials)
    disposeHierarchy(group);
    disposeHierarchy(stencilGroup, true);
    partMeshMapRef.current.clear();

    const createPartMaterial = (partId: string, colorHex: string, isSelected: boolean) => {
      let finalColor = new THREE.Color(colorHex);
      let emissive = new THREE.Color(0x000000);
      let roughness = 0.35;
      let metalness = 0.15;

      if (showDefects) {
        finalColor = new THREE.Color(0xf59e0b);
        emissive = new THREE.Color(0x331a00);
      }
      if (isSelected) {
        emissive = new THREE.Color(0x008ba3);
        roughness = 0.2;
      }
      if (compareMode === 'before') {
        finalColor = new THREE.Color(0x991b1b);
      }

      return new THREE.MeshStandardMaterial({
        color: finalColor,
        emissive: emissive,
        roughness: roughness,
        metalness: metalness,
        wireframe: wireframe,
        clippingPlanes: [clipPlaneRef.current],
        clipShadows: true,
        side: THREE.DoubleSide
      });
    };

    const registerMeshWithStencil = (mesh: THREE.Mesh) => {
      mesh.renderOrder = 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Create matching stencil meshes for Stencil Cross-Section Capping (share geometry with tag)
      const backMesh = new THREE.Mesh(mesh.geometry, stencilMatBackRef.current);
      backMesh.position.copy(mesh.position);
      backMesh.rotation.copy(mesh.rotation);
      backMesh.scale.copy(mesh.scale);
      backMesh.renderOrder = 1;
      backMesh.userData = { isSharedGeometry: true };
      stencilGroup.add(backMesh);

      const frontMesh = new THREE.Mesh(mesh.geometry, stencilMatFrontRef.current);
      frontMesh.position.copy(mesh.position);
      frontMesh.rotation.copy(mesh.rotation);
      frontMesh.scale.copy(mesh.scale);
      frontMesh.renderOrder = 1;
      frontMesh.userData = { isSharedGeometry: true };
      stencilGroup.add(frontMesh);
    };

    let calculatedHeight = 40;
    let computedDimensions = { x: 92, y: 92, z: 38 };

    // --- CASE 1: REAL CUSTOM BUFFER GEOMETRY (STL) ---
    if (customGeometry && customGeometry.attributes.position && customGeometry.attributes.position.count >= 3) {
      // Use customGeometry directly WITHOUT duplicate memory allocation
      const geom = customGeometry;
      if (!geom.boundingBox) geom.computeBoundingBox();

      const box = geom.boundingBox || new THREE.Box3();
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const safeX = Number.isFinite(size.x) && size.x > 0.01 ? Number(size.x.toFixed(1)) : 85.0;
      const safeY = Number.isFinite(size.y) && size.y > 0.01 ? Number(size.y.toFixed(1)) : 35.0;
      const safeZ = Number.isFinite(size.z) && size.z > 0.01 ? Number(size.z.toFixed(1)) : 60.0;

      calculatedHeight = safeY;
      computedDimensions = { x: safeX, y: safeZ, z: safeY };
      setModelDims(computedDimensions);
      setModelHeight(calculatedHeight);

      const part0 = parts[0];
      const isPartSelected = part0?.id === selectedPartId;
      const primaryColor = part0?.colorHex || '#00687a';

      const mesh = new THREE.Mesh(geom, createPartMaterial(part0?.id || 'custom-part', primaryColor, isPartSelected));
      // Fast zero-allocation GPU matrix centering instead of slow CPU vertex array translation
      if (Number.isFinite(center.x) && Number.isFinite(box.min.y) && Number.isFinite(center.z)) {
        mesh.position.set(-center.x, -box.min.y, -center.z);
      }
      mesh.userData = { partId: part0?.id || 'custom-part', partName: part0?.name || 'Custom STL Mesh', isSharedGeometry: true };
      registerMeshWithStencil(mesh);
      if (part0?.id) partMeshMapRef.current.set(part0.id, mesh);

    }
    // --- CASE 2: REAL OBJECT GROUP (3MF Multi-Part / OBJ) ---
    else if (customObjectGroup) {
      const objClone = customObjectGroup.clone(true);

      // Collect meshes first to avoid mutating children during traverse
      const meshList: THREE.Mesh[] = [];
      objClone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshList.push(child as THREE.Mesh);
        }
      });

      meshList.forEach((m, partIndex) => {
        if (m.geometry) {
          m.geometry = m.geometry.clone();
          m.geometry.computeVertexNormals();
        }

        const currentPart = parts[partIndex] || parts[0];
        const partId = currentPart?.id || `part-${partIndex}`;
        const isSelected = partId === selectedPartId;
        const partColor = currentPart?.colorHex || (partIndex === 0 ? '#00687a' : '#ea580c');
        const partPlateIndex = currentPart?.plateIndex || 1;

        const isPlateVisible = activePlateIndex === 0 || partPlateIndex === activePlateIndex;
        const isPartVisible = (currentPart ? currentPart.visible !== false : true) && isPlateVisible;

        m.material = createPartMaterial(partId, partColor, isSelected);
        m.visible = isPartVisible;
        m.userData = { partId, partName: currentPart?.name || `Component ${partIndex + 1}`, plateIndex: partPlateIndex };
        m.castShadow = true;
        m.receiveShadow = true;
        m.renderOrder = 2;

        // Create matching stencil meshes using internal geometry of m (with isSharedGeometry: true protection)
        const backMesh = new THREE.Mesh(m.geometry, stencilMatBackRef.current);
        backMesh.position.copy(m.position);
        backMesh.rotation.copy(m.rotation);
        backMesh.scale.copy(m.scale);
        backMesh.renderOrder = 1;
        backMesh.userData = { isSharedGeometry: true };
        stencilGroup.add(backMesh);

        const frontMesh = new THREE.Mesh(m.geometry, stencilMatFrontRef.current);
        frontMesh.position.copy(m.position);
        frontMesh.rotation.copy(m.rotation);
        frontMesh.scale.copy(m.scale);
        frontMesh.renderOrder = 1;
        frontMesh.userData = { isSharedGeometry: true };
        stencilGroup.add(frontMesh);

        partMeshMapRef.current.set(partId, m);
      });

      // Keep objClone hierarchy intact and add directly to group
      group.add(objClone);

      objClone.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(objClone);
      
      if (!box.isEmpty()) {
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const safeX = Number.isFinite(size.x) && size.x > 0 ? Number(size.x.toFixed(1)) : 80;
        const safeY = Number.isFinite(size.y) && size.y > 0 ? Number(size.y.toFixed(1)) : 35;
        const safeZ = Number.isFinite(size.z) && size.z > 0 ? Number(size.z.toFixed(1)) : 80;

        calculatedHeight = safeY;
        computedDimensions = { x: safeX, y: safeZ, z: safeY };

        if (Number.isFinite(center.x) && Number.isFinite(box.min.y) && Number.isFinite(center.z)) {
          objClone.position.set(-center.x, -box.min.y, -center.z);
          stencilGroup.position.copy(objClone.position);
        }
      }

      if (currentPlate && currentPlate.dimensions && activePlateIndex > 0) {
        computedDimensions = currentPlate.dimensions;
        calculatedHeight = currentPlate.dimensions.z;
      }

      setModelDims(computedDimensions);
      setModelHeight(calculatedHeight);
    }
    // --- CASE 3: BENCHMARK PROCEDURAL MODELS ---
    else if (modelType === 'gear' || modelType.includes('planetary')) {
      calculatedHeight = 38;
      computedDimensions = { x: 92.5, y: 92.5, z: 38.0 };
      setModelDims(computedDimensions);
      setModelHeight(calculatedHeight);

      const sunPart = parts[0];
      const planetPart = parts[1];
      const ringPart = parts[2];
      const carrierPart = parts[3];

      const sunGeo = new THREE.CylinderGeometry(16, 16, 28, 24);
      const sunMesh = new THREE.Mesh(
        sunGeo,
        createPartMaterial(sunPart?.id || 'sun', sunPart?.colorHex || '#00687a', sunPart?.id === selectedPartId)
      );
      sunMesh.position.y = 14;
      sunMesh.userData = { partId: sunPart?.id || 'sun', partName: sunPart?.name || 'Sun Gear Central', plateIndex: 1 };
      registerMeshWithStencil(sunMesh);
      if (sunPart?.id) partMeshMapRef.current.set(sunPart.id, sunMesh);

      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const pGeo = new THREE.CylinderGeometry(12, 12, 24, 20);
        const pMesh = new THREE.Mesh(
          pGeo,
          createPartMaterial(planetPart?.id || 'planet', planetPart?.colorHex || '#ea580c', planetPart?.id === selectedPartId)
        );
        pMesh.position.x = Math.cos(angle) * 34;
        pMesh.position.z = Math.sin(angle) * 34;
        pMesh.position.y = 14;
        pMesh.userData = { partId: planetPart?.id || 'planet', partName: planetPart?.name || 'Planet Gears Triad', plateIndex: 1 };
        registerMeshWithStencil(pMesh);
        if (planetPart?.id && i === 0) partMeshMapRef.current.set(planetPart.id, pMesh);
      }

      const ringTorus = new THREE.TorusGeometry(46, 7.6, 16, 36);
      const ringMesh = new THREE.Mesh(
        ringTorus,
        createPartMaterial(ringPart?.id || 'ring', ringPart?.colorHex || '#1C1C1C', ringPart?.id === selectedPartId)
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 14;
      ringMesh.userData = { partId: ringPart?.id || 'ring', partName: ringPart?.name || 'Outer Ring Gear Body', plateIndex: 2 };
      registerMeshWithStencil(ringMesh);
      if (ringPart?.id) partMeshMapRef.current.set(ringPart.id, ringMesh);

      const plateGeo = new THREE.CylinderGeometry(38, 38, 5.6, 30);
      const plateMesh = new THREE.Mesh(
        plateGeo,
        createPartMaterial(carrierPart?.id || 'carrier', carrierPart?.colorHex || '#64748b', carrierPart?.id === selectedPartId)
      );
      plateMesh.position.y = 2.8;
      plateMesh.userData = { partId: carrierPart?.id || 'carrier', partName: carrierPart?.name || 'Carrier Plate', plateIndex: 2 };
      registerMeshWithStencil(plateMesh);
      if (carrierPart?.id) partMeshMapRef.current.set(carrierPart.id, plateMesh);

    } else if (modelType === 'box' || modelType.includes('arduino') || modelType.includes('enclosure')) {
      calculatedHeight = 28.5;
      computedDimensions = { x: 86.4, y: 64.0, z: 28.5 };
      setModelDims(computedDimensions);
      setModelHeight(28.5);

      const mainPart = parts[0];
      const baseGeo = new THREE.BoxGeometry(80, 24, 56);
      const baseMesh = new THREE.Mesh(
        baseGeo,
        createPartMaterial(mainPart?.id || 'box-base', mainPart?.colorHex || '#00687a', mainPart?.id === selectedPartId)
      );
      baseMesh.position.y = 12;
      baseMesh.userData = { partId: mainPart?.id || 'box-base', partName: 'Enclosure Base' };
      registerMeshWithStencil(baseMesh);
      if (mainPart?.id) partMeshMapRef.current.set(mainPart.id, baseMesh);

      const lidGeo = new THREE.BoxGeometry(82, 7, 58);
      const lidMesh = new THREE.Mesh(
        lidGeo,
        createPartMaterial('lid', '#1C1C1C', false)
      );
      lidMesh.position.y = 28;
      lidMesh.userData = { partId: 'lid', partName: 'Enclosure Lid' };
      registerMeshWithStencil(lidMesh);

    } else {
      calculatedHeight = 18;
      computedDimensions = { x: 180.0, y: 180.0, z: 18.0 };
      setModelDims(computedDimensions);
      setModelHeight(18);

      const dronePart = parts[0];
      const bodyGeo = new THREE.BoxGeometry(40, 12, 40);
      const bodyMesh = new THREE.Mesh(
        bodyGeo,
        createPartMaterial(dronePart?.id || 'drone-body', dronePart?.colorHex || '#1C1C1C', dronePart?.id === selectedPartId)
      );
      bodyMesh.position.y = 6;
      bodyMesh.userData = { partId: dronePart?.id || 'drone-body', partName: 'Drone Core' };
      registerMeshWithStencil(bodyMesh);
      if (dronePart?.id) partMeshMapRef.current.set(dronePart.id, bodyMesh);

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const armGeo = new THREE.BoxGeometry(65, 6, 12);
        const arm = new THREE.Mesh(armGeo, createPartMaterial('arm', '#1C1C1C', false));
        arm.position.x = Math.cos(angle) * 45;
        arm.position.z = Math.sin(angle) * 45;
        arm.position.y = 6;
        arm.rotation.y = -angle;
        arm.userData = { partId: `arm-${i}`, partName: `Motor Arm ${i + 1}` };
        registerMeshWithStencil(arm);
      }
    }

    // Auto-fit camera smoothly to new object bounds
    group.updateMatrixWorld(true);
    if (group.children.length > 0) {
      try {
        const box = new THREE.Box3().setFromObject(group);
        if (!box.isEmpty()) {
          const sphere = new THREE.Sphere();
          box.getBoundingSphere(sphere);
          const radius = Math.max(sphere.radius, 25);
          const center = sphere.center;

          orbitTargetRef.current.set(center.x, Math.max(center.y, calculatedHeight * 0.4), center.z);

          const pCam = perspectiveCameraRef.current;
          if (pCam && Number.isFinite(radius) && Number.isFinite(center.x)) {
            const fovVertical = (pCam.fov * Math.PI) / 180;
            const aspect = pCam.aspect || 1.0;
            const fovHorizontal = 2 * Math.atan(Math.tan(fovVertical / 2) * aspect);
            const effectiveFov = Math.min(fovVertical, fovHorizontal);
            let camDist = Math.abs(radius / Math.sin(effectiveFov / 2)) * 1.35;
            camDist = Math.max(45, Math.min(3000, camDist));
            
            pCam.up.set(0, 1, 0);
            pCam.position.set(center.x + camDist * 0.75, center.y + camDist * 0.65, center.z + camDist * 0.85);
            pCam.lookAt(orbitTargetRef.current);
            pCam.updateProjectionMatrix();
          }

          const oCam = orthoCameraRef.current;
          if (oCam && Number.isFinite(radius)) {
            const camDist = radius * 2.2;
            const frustum = radius * 2.6;
            const aspect = pCam ? pCam.aspect : 1.0;
            oCam.left = (-frustum * aspect) / 2;
            oCam.right = (frustum * aspect) / 2;
            oCam.top = frustum / 2;
            oCam.bottom = -frustum / 2;
            oCam.up.set(0, 1, 0);
            oCam.position.set(center.x + camDist * 0.75, center.y + camDist * 0.65, center.z + camDist * 0.85);
            oCam.lookAt(orbitTargetRef.current);
            oCam.updateProjectionMatrix();
          }
        }
      } catch (fitErr) {
        console.warn('Camera auto-fit notice:', fitErr);
      }
    }
  }, [customGeometry, customObjectGroup, modelType, parts.length]);

  // ---------------------------------------------------------------------------------
  // 3. TRANSFORM & BOUNDING BOX UNIFORMS (Updates matrix without scene destruction)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    const group = meshGroupRef.current;
    const stencilGroup = stencilGroupRef.current;
    if (!group) return;

    const unitScale = transform.unit === 'inch' ? 25.4 : 1.0;
    const uniformRatio = (transform.scaleUniform ?? 100) / 100;
    const axisRatioX = (transform.scaleX ?? 100) > 5 ? (transform.scaleX ?? 100) / 100 : (transform.scaleX ?? 1.0);
    const axisRatioY = (transform.scaleY ?? 100) > 5 ? (transform.scaleY ?? 100) / 100 : (transform.scaleY ?? 1.0);
    const axisRatioZ = (transform.scaleZ ?? 100) > 5 ? (transform.scaleZ ?? 100) / 100 : (transform.scaleZ ?? 1.0);

    const sx = uniformRatio * axisRatioX * unitScale;
    const sy = uniformRatio * axisRatioY * unitScale;
    const sz = uniformRatio * axisRatioZ * unitScale;

    group.scale.set(sx, sy, sz);
    group.rotation.x = THREE.MathUtils.degToRad(transform.rotationX || 0);
    group.rotation.y = THREE.MathUtils.degToRad(transform.rotationY || 0);
    group.rotation.z = THREE.MathUtils.degToRad(transform.rotationZ || 0);
    group.position.x = transform.positionX || 0;
    group.position.z = transform.positionZ || 0;
    group.updateMatrixWorld(true);

    if (stencilGroup) {
      stencilGroup.scale.copy(group.scale);
      stencilGroup.rotation.copy(group.rotation);
      stencilGroup.position.copy(group.position);
      stencilGroup.updateMatrixWorld(true);
    }

    // Update Bounding Box with persistent Unit Box (Zero GC allocations during slider dragging)
    if (sceneRef.current) {
      let bbox = boundingBoxMeshRef.current;
      if (!bbox) {
        const unitGeo = new THREE.BoxGeometry(1, 1, 1);
        const unitEdges = new THREE.EdgesGeometry(unitGeo);
        const bboxMat = new THREE.LineBasicMaterial({
          color: 0x00d2ff,
          transparent: true,
          opacity: 0.8
        });
        bbox = new THREE.LineSegments(unitEdges, bboxMat);
        bbox.name = 'UnitBoundingBox';
        bbox.visible = false;
        sceneRef.current.add(bbox);
        boundingBoxMeshRef.current = bbox;
      }

      if (isBoundingBoxActive && group.children.length > 0) {
        const box3 = new THREE.Box3().setFromObject(group);
        if (!box3.isEmpty()) {
          const boxSize = new THREE.Vector3();
          box3.getSize(boxSize);
          const boxCenter = new THREE.Vector3();
          box3.getCenter(boxCenter);

          if (
            Number.isFinite(boxSize.x) && Number.isFinite(boxSize.y) && Number.isFinite(boxSize.z) &&
            Number.isFinite(boxCenter.x) && Number.isFinite(boxCenter.y) && Number.isFinite(boxCenter.z) &&
            boxSize.x > 0.01 && boxSize.y > 0.01 && boxSize.z > 0.01
          ) {
            bbox.scale.set(Math.max(boxSize.x, 0.5), Math.max(boxSize.y, 0.5), Math.max(boxSize.z, 0.5));
            bbox.position.copy(boxCenter);
            (bbox.material as THREE.LineBasicMaterial).color.setHex(isBedOverflow ? 0xef4444 : 0x00d2ff);
            bbox.visible = true;
          } else {
            bbox.visible = false;
          }
        } else {
          bbox.visible = false;
        }
      } else {
        bbox.visible = false;
      }
    }

    requestRender();
  }, [transform, isBoundingBoxActive, isBedOverflow, requestRender]);

  // ---------------------------------------------------------------------------------
  // 4. MATERIAL & PLATE VISIBILITY UNIFORMS (No geometry rebuild)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    const group = meshGroupRef.current;
    if (!group) return;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat) return;

        const partId = m.userData?.partId;
        const partPlateIndex = m.userData?.plateIndex || 1;
        const currentPart = parts.find(p => p.id === partId);
        const isSelected = partId === selectedPartId;

        // Visibility
        const isPlateVisible = activePlateIndex === 0 || partPlateIndex === activePlateIndex;
        const isPartVisible = (currentPart ? currentPart.visible !== false : true) && isPlateVisible;
        m.visible = isPartVisible;

        // Colors & Emissive
        mat.wireframe = wireframe;
        if (showDefects) {
          mat.color.setHex(0xf59e0b);
          mat.emissive.setHex(0x331a00);
        } else if (compareMode === 'before') {
          mat.color.setHex(0x991b1b);
          mat.emissive.setHex(0x000000);
        } else {
          const colorHex = currentPart?.colorHex || '#00687a';
          mat.color.set(colorHex);
          if (isSelected) {
            mat.emissive.setHex(0x008ba3);
            mat.roughness = 0.2;
          } else {
            mat.emissive.setHex(0x000000);
            mat.roughness = 0.35;
          }
        }
        mat.needsUpdate = true;
      }
    });

    capMaterialRef.current.color.setHex(showDefects ? 0xf59e0b : 0x008ba3);
    requestRender();
  }, [wireframe, showDefects, compareMode, selectedPartId, parts, activePlateIndex, requestRender]);

  // ---------------------------------------------------------------------------------
  // 5. SLICER & STENCIL CROSS-SECTION CAPPING (Updates clip plane & cap position)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    if (currentSlice >= 100) {
      clipPlaneRef.current.constant = 50000;
      if (capMeshRef.current) capMeshRef.current.visible = false;
      if (stencilGroupRef.current) stencilGroupRef.current.visible = false;
    } else {
      const computedY = Math.max(0.1, (currentSlice / 100) * Math.max(modelHeight, 5));
      clipPlaneRef.current.constant = computedY;
      if (capMeshRef.current) {
        capMeshRef.current.position.y = computedY;
        capMeshRef.current.visible = true;
      }
      if (stencilGroupRef.current) {
        stencilGroupRef.current.visible = true;
      }
    }
    requestRender();
  }, [currentSlice, modelHeight, requestRender]);

  // ---------------------------------------------------------------------------------
  // 6. CALIPER MEASUREMENT MARKERS
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    measurePointsMeshesRef.current.forEach((m) => {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    measurePointsMeshesRef.current = [];

    if (measurementLineRef.current) {
      scene.remove(measurementLineRef.current);
      measurementLineRef.current.geometry.dispose();
      (measurementLineRef.current.material as THREE.Material).dispose();
      measurementLineRef.current = null;
    }

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

    requestRender();
  }, [caliperPoints, requestRender]);

  // Auto-Rotate Loop Handler
  useEffect(() => {
    isRotatingRef.current = isRotating;
    if (isRotating) {
      requestRender();
    }
  }, [isRotating, requestRender]);

  // Camera Mode Switcher
  useEffect(() => {
    cameraModeRef.current = cameraMode;
    activeCameraRef.current = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    requestRender();
  }, [cameraMode, requestRender]);

  // Reset Camera View
  const handleResetCamera = () => {
    if (onUpdateTransform) {
      onUpdateTransform({ rotationX: 0, rotationY: 0, rotationZ: 0, positionX: 0, positionZ: 0 });
    }
    const maxDim = Math.max(modelDims.x, modelDims.y, modelDims.z, 50);
    const bedMax = Math.max(bedDimensions.x, bedDimensions.y, bedDimensions.z);
    const dist = Math.max(maxDim * 2.2, bedMax * 1.8, 300);
    const target = orbitTargetRef.current;
    target.set(0, Math.max(modelHeight * 0.45, 12), 0);

    if (perspectiveCameraRef.current) {
      perspectiveCameraRef.current.up.set(0, 1, 0);
      perspectiveCameraRef.current.position.set(dist * 0.75, target.y + dist * 0.65, dist * 0.85);
      perspectiveCameraRef.current.lookAt(target);
      perspectiveCameraRef.current.updateProjectionMatrix();
    }
    if (orthoCameraRef.current) {
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.position.set(dist * 0.75, target.y + dist * 0.65, dist * 0.85);
      orthoCameraRef.current.lookAt(target);
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.updateProjectionMatrix();
    }
    setActiveAngle('iso');
  };

  // Auto-fit Model in Viewport
  const handleAutoFit = () => {
    const group = meshGroupRef.current;
    if (!group) return;
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, bedDimensions.x * 0.45, 35);
    const center = sphere.center;

    orbitTargetRef.current.set(center.x, Math.max(center.y, 10), center.z);
    const target = orbitTargetRef.current;
    const cameraDist = Math.max(radius * 2.5, 220);

    if (perspectiveCameraRef.current) {
      perspectiveCameraRef.current.up.set(0, 1, 0);
      perspectiveCameraRef.current.position.set(target.x + cameraDist * 0.75, target.y + cameraDist * 0.65, target.z + cameraDist * 0.85);
      perspectiveCameraRef.current.lookAt(target);
      perspectiveCameraRef.current.updateProjectionMatrix();
    }
    if (orthoCameraRef.current) {
      orthoCameraRef.current.up.set(0, 1, 0);
      orthoCameraRef.current.position.set(target.x + cameraDist * 0.75, target.y + cameraDist * 0.65, target.z + cameraDist * 0.85);
      orthoCameraRef.current.lookAt(target);
      orthoCameraRef.current.zoom = 1.0;
      orthoCameraRef.current.updateProjectionMatrix();
    }
  };

  // Switch Viewport Angles [ISO, TOP, FRONT, SIDE] with Gimbal-Lock Prevention
  const setCameraAngle = (angle: 'iso' | 'top' | 'front' | 'side') => {
    setActiveAngle(angle);
    setIsRotating(false);
    const maxDim = Math.max(modelDims.x, modelDims.y, modelDims.z, 50);
    const bedMax = Math.max(bedDimensions.x, bedDimensions.y);
    const d = Math.max(maxDim * 2.2, bedMax * 1.5, 260);
    const target = orbitTargetRef.current;

    const applyAngleToCam = (cam: THREE.Camera) => {
      if (angle === 'top') {
        // Looking down from +Y axis: up must be (0, 0, -1) to prevent division by zero / NaN gimbal lock
        cam.up.set(0, 0, -1);
        cam.position.set(target.x, target.y + d * 1.6, target.z);
        cam.lookAt(target);
      } else {
        cam.up.set(0, 1, 0);
        if (angle === 'front') {
          cam.position.set(target.x, target.y, target.z + d * 1.35);
          cam.lookAt(target);
        } else if (angle === 'side') {
          cam.position.set(target.x + d * 1.35, target.y, target.z);
          cam.lookAt(target);
        } else {
          // ISO
          cam.position.set(target.x + d * 0.75, target.y + d * 0.65, target.z + d * 0.85);
          cam.lookAt(target);
        }
      }
      if ((cam as any).updateProjectionMatrix) {
        (cam as any).updateProjectionMatrix();
      }
    };

    if (perspectiveCameraRef.current) applyAngleToCam(perspectiveCameraRef.current);
    if (orthoCameraRef.current) applyAngleToCam(orthoCameraRef.current);
  };

  // Update layer slice height
  const handleSliceChange = (val: number) => {
    setCurrentSlice(val);
  };

  // Toggle Camera Mode (Perspective / Orthographic) with Coordinate & Rotation Synchronization
  const handleToggleCameraMode = () => {
    const nextMode = cameraMode === 'perspective' ? 'orthographic' : 'perspective';
    const pCam = perspectiveCameraRef.current;
    const oCam = orthoCameraRef.current;

    if (nextMode === 'orthographic' && pCam && oCam) {
      oCam.position.copy(pCam.position);
      oCam.quaternion.copy(pCam.quaternion);
      oCam.up.copy(pCam.up);
      oCam.updateProjectionMatrix();
    } else if (nextMode === 'perspective' && oCam && pCam) {
      pCam.position.copy(oCam.position);
      pCam.quaternion.copy(oCam.quaternion);
      pCam.up.copy(oCam.up);
      pCam.updateProjectionMatrix();
    }

    if (onCameraModeChange) {
      onCameraModeChange(nextMode);
    }
  };

  // Toggle Bounding Box
  const handleToggleBoundingBox = () => {
    if (onToggleBoundingBox) {
      onToggleBoundingBox();
    } else {
      setLocalBoundingBox(prev => !prev);
    }
  };

  // Toggle Measurement Active
  const handleToggleMeasurement = () => {
    if (onToggleMeasurement) {
      onToggleMeasurement();
    } else {
      setLocalMeasurementActive(prev => !prev);
    }
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

  const displayName = fileName || (modelType === 'gear' ? 'Planetary_Gear_Set.3mf' : modelType === 'box' ? 'Arduino_Enclosure.stl' : 'Quadcopter_Frame.stl');
  const scaleMultiplier = (transform.scaleUniform / 100) * (transform.unit === 'inch' ? 25.4 : 1.0);

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
      ref={rootWrapperRef}
      className={`relative bg-[#091426] overflow-hidden border ${
        isBedOverflow ? 'border-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.35)] ring-2 ring-rose-500/40' : 'border-[#CBD5E1]'
      } flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[100] rounded-none w-screen h-screen p-0 m-0 shadow-2xl'
          : `rounded-2xl ${className}`
      }`}
    >
      {/* Drag and Drop Over Canvas Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#00687a]/90 backdrop-blur-md flex flex-col items-center justify-center text-white border-2 border-dashed border-[#57DFFE]">
          <span className="material-symbols-outlined text-5xl animate-bounce text-[#57DFFE]">upload_file</span>
          <p className="font-mono text-sm font-bold mt-2 uppercase tracking-wider">Thả tập tin 3D (3MF / STL / OBJ / STEP) vào đây</p>
          <span className="text-xs text-cyan-200 font-mono">Hệ thống sẽ bóc tách cấu trúc 3D tự động</span>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing min-h-[340px]" />

      {/* Top Header Bar: Status Badge + Live FPS on Left, Dimensions + Fullscreen on Right */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Top-Left: VCUBE ENGINE v2.6 // 60 FPS // Model Name */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#091426]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#334155]/70 text-xs text-white font-mono shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse shrink-0"></span>
          <span className="font-bold text-[#57DFFE] tracking-wider shrink-0">VCUBE ENGINE v2.6</span>
          <span className="text-slate-600">//</span>
          <span className="text-emerald-400 font-bold shrink-0">{fps} FPS</span>
          {isFullscreen && (
            <>
              <span className="text-slate-600">//</span>
              <span className="text-cyan-300 font-bold uppercase text-[10px] bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40 tracking-wider">
                FULLSCREEN
              </span>
            </>
          )}
          <span className="text-slate-600 hidden sm:inline">//</span>
          <span className="text-slate-200 font-medium truncate max-w-[110px] sm:max-w-[200px] hidden sm:inline" title={displayName}>
            {displayName}
          </span>
        </div>

        {/* Top-Right: Dimension Chip + Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#091426]/90 backdrop-blur-md rounded-xl border border-[#334155]/70 text-[#57DFFE] font-mono text-xs shadow-lg">
            <span className="material-symbols-outlined text-sm text-cyan-400">straighten</span>
            <span className="font-bold">{modelDims.x.toFixed(1)} × {modelDims.y.toFixed(1)} × {modelDims.z.toFixed(1)} mm</span>
          </div>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình (Phím ESC)' : 'Toàn màn hình CAD Studio'}
            className={`p-1.5 backdrop-blur-md rounded-xl border transition-all shadow-lg cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold ${
              isFullscreen
                ? 'bg-[#00687A] text-white border-[#57DFFE] shadow-cyan-900/50 hover:bg-[#005260]'
                : 'bg-[#091426]/90 border-[#334155]/70 text-slate-300 hover:text-white hover:border-[#57DFFE]/60'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            {isFullscreen && (
              <span className="text-[10px] text-cyan-200 hidden sm:inline uppercase tracking-wider pr-1">
                Thoát (ESC)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating Centered CAD Control Toolbar */}
      <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[95%] overflow-x-auto">
        <div className="flex items-center gap-1.5 bg-[#091426]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#334155]/70 shadow-2xl text-white">
          {/* Angle Presets: [ISO], [TOP], [FRONT], [SIDE] */}
          <div className="flex items-center gap-0.5 bg-[#0f172a] p-0.5 rounded-xl border border-[#334155]/50 font-mono text-[10px]">
            {(['iso', 'top', 'front', 'side'] as const).map((ang) => (
              <button
                key={ang}
                type="button"
                onClick={() => setCameraAngle(ang)}
                className={`px-2 py-1 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                  activeAngle === ang
                    ? 'bg-[#00687A] text-white shadow-xs border border-[#57DFFE]/50'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                }`}
                title={`Góc nhìn [${ang.toUpperCase()}]`}
              >
                {ang.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-[#334155]/80 shrink-0" />

          {/* 360 Auto-Rotate */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Dừng xoay tự động 360°' : 'Bật xoay tự động 360°'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isRotating ? 'text-[#57DFFE] bg-[#00687A]/35 border border-[#57DFFE]/50' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <span className="material-symbols-outlined text-base">360</span>
          </button>

          {/* Wireframe / Solid */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            title={wireframe ? 'Chuyển sang chế độ Đặc (Solid)' : 'Chuyển sang chế độ Khung dây (Wireframe)'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              wireframe ? 'text-[#57DFFE] bg-[#00687A]/35 border border-[#57DFFE]/50' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <span className="material-symbols-outlined text-base">grid_4x4</span>
          </button>

          {/* Camera Mode Toggle (Perspective / Ortho) */}
          <button
            type="button"
            onClick={handleToggleCameraMode}
            title={cameraMode === 'orthographic' ? 'Đang Trực Giao (Ortho) -> Bấm để chuyển Phối Cảnh (Persp)' : 'Đang Phối Cảnh (Persp) -> Bấm để chuyển Trực Giao (Ortho)'}
            className="px-2 py-1 rounded-xl hover:bg-[#1e293b] text-slate-300 hover:text-white transition-colors cursor-pointer font-mono text-[10px] font-bold flex items-center gap-1 border border-[#334155]/50"
          >
            <span className="material-symbols-outlined text-sm text-[#57DFFE]">view_in_ar</span>
            <span>{cameraMode === 'orthographic' ? 'ORTHO' : 'PERSP'}</span>
          </button>

          <div className="w-px h-4 bg-[#334155]/80 shrink-0" />

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={handleResetCamera}
            title="Đặt lại góc nhìn chuẩn (Reset View)"
            className="p-1.5 rounded-xl hover:bg-[#1e293b] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">center_focus_strong</span>
          </button>

          {/* Bounding Box Toggle */}
          <button
            type="button"
            onClick={handleToggleBoundingBox}
            title={isBoundingBoxActive ? 'Ẩn khung bao (Bounding Box)' : 'Hiện khung bao (Bounding Box)'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isBoundingBoxActive ? 'text-[#57DFFE] bg-[#00687A]/35 border border-[#57DFFE]/50' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <span className="material-symbols-outlined text-base">square_foot</span>
          </button>

          {/* Caliper 2-Point Measurement Toggle */}
          <button
            type="button"
            onClick={handleToggleMeasurement}
            title={isMeasurementActive ? 'Tắt thước đo Caliper' : 'Bật thước đo Caliper 2 điểm'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isMeasurementActive ? 'text-amber-400 bg-amber-950/40 border border-amber-500/50' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <span className="material-symbols-outlined text-base">straighten</span>
          </button>

          {/* Screenshot PNG */}
          <button
            type="button"
            onClick={handleCaptureThumbnail}
            title="Chụp ảnh mô hình 3D (PNG)"
            className="p-1.5 rounded-xl hover:bg-[#1e293b] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
          </button>
        </div>
      </div>

      {/* Dedicated Multi-Plate Dock (Positioned at Bottom-Left above Slicer) */}
      {plates && plates.length > 1 && (
        <div className="absolute bottom-16 left-3 z-20 pointer-events-auto flex items-center gap-1.5 bg-[#091426]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#334155]/70 font-mono text-[11px] shadow-xl">
          <span className="px-2 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-[#57DFFE]">layers</span>
            Bàn In:
          </span>
          <button
            type="button"
            onClick={() => {
              if (onSelectPlate) onSelectPlate(0);
              handleAutoFit();
            }}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              activePlateIndex === 0
                ? 'bg-[#00687A] text-white border border-[#57DFFE]/50 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
            }`}
            title="Hiển thị tất cả chi tiết đã lắp ráp"
          >
            Tất cả
          </button>
          {plates.map((plate) => {
            const isActive = activePlateIndex === plate.index;
            return (
              <button
                key={plate.index}
                type="button"
                onClick={() => {
                  if (onSelectPlate) onSelectPlate(plate.index);
                  handleAutoFit();
                }}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00687A] text-white border border-[#57DFFE]/50 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                }`}
                title={`Chuyển sang Bàn ${plate.index}`}
              >
                Bàn {plate.index}
              </button>
            );
          })}
        </div>
      )}

      {/* Bed overflow warning banner when dimensions exceed build plate */}
      {isBedOverflow && (
        <div className="absolute top-14 left-3 right-3 z-20 bg-rose-950/90 backdrop-blur-md border border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-rose-400 text-xl shrink-0">warning</span>
            <div>
              <strong className="font-bold text-rose-200 block sm:inline">
                CẢNH BÁO: KÍCH THƯỚC VƯỢT KHỔ BÀN IN ({bedDimensions.x} × {bedDimensions.y} × {bedDimensions.z} mm)
              </strong>
              <span className="text-[11px] text-rose-300/80 block sm:inline sm:ml-2">
                Mô hình ({(modelDims.x * scaleMultiplier).toFixed(1)} × {(modelDims.y * scaleMultiplier).toFixed(1)} × {(modelDims.z * scaleMultiplier).toFixed(1)} mm) vượt quá khổ máy.
              </span>
            </div>
          </div>
          {onUpdateTransform && (
            <button
              type="button"
              onClick={handleScaleToFitBed}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">fit_screen</span>
              Co Vừa Bàn (Auto-Fit)
            </button>
          )}
        </div>
      )}

      {/* Metrology Overlay: Caliper 2-point measurement indicator */}
      {isMeasurementActive && (
        <div className="absolute top-14 right-3 bg-[#091426]/95 backdrop-blur-md p-3 rounded-xl border border-amber-500/60 text-xs text-white max-w-xs shadow-2xl space-y-2 z-20 font-mono">
          <div className="flex items-center justify-between gap-2 font-bold text-amber-400">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">straighten</span>
              THƯỚC ĐO CALIPER 2 ĐIỂM
            </span>
            <button
              type="button"
              onClick={clearMeasurement}
              className="text-[10px] text-slate-400 hover:text-white uppercase underline cursor-pointer"
            >
              Xóa điểm
            </button>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            {caliperPoints.length === 0 && '1. Nhấp chuột chọn điểm thứ nhất trên phôi 3D...'}
            {caliperPoints.length === 1 && '2. Nhấp chuột chọn điểm thứ hai để tính khoảng cách...'}
            {caliperPoints.length === 2 && (
              <div className="bg-amber-950/50 p-2 rounded-lg border border-amber-500/40 mt-1">
                <span className="text-slate-400 text-[10px] block">KHOẢNG CÁCH THỰC TẾ:</span>
                <span className="text-[#57DFFE] text-sm font-bold block">
                  {caliperDistance} mm
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredPartName && (
        <div className="absolute bottom-16 left-3 bg-[#091426]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-700/50 text-xs font-mono text-[#57DFFE] pointer-events-none shadow-lg z-20">
          <span className="text-slate-400">Chi tiết:</span> {hoveredPartName}
        </div>
      )}

      {/* Bottom: Unified Layer Slicer progress slider with percentage and clipping plane */}
      <div className="absolute bottom-3 left-3 right-3 bg-[#091426]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#334155]/60 flex items-center justify-between gap-4 text-white font-mono z-20 shadow-xl">
        <div className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-[#57DFFE] text-sm">layers</span>
          <span className="text-xs text-slate-200 font-bold">LỚP IN: {currentSlice}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={currentSlice}
          onChange={(e) => handleSliceChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#57DFFE]"
          title={`Cắt lớp 3D: ${currentSlice}%`}
        />
        <div className="flex items-center gap-2 text-[11px] text-slate-300 shrink-0">
          <span className="text-[#57DFFE] font-bold">
            {((modelHeight * currentSlice) / 100).toFixed(1)} mm
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{modelHeight.toFixed(1)} mm</span>
          <span className="hidden sm:inline px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px]">
            0.16mm Layer
          </span>
        </div>
      </div>
    </div>
  );
};
