import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ModelPart, TransformState, MeasurementResult, PlateInfo } from '@/types';

import { useModelViewerScene } from './useModelViewerScene';
import { useModelViewerMesh } from './useModelViewerMesh';
import { useModelViewerFullscreen } from './useModelViewerFullscreen';
import { ModelViewerChrome } from './ModelViewerChrome';
import { MIN_VIEW_FRAME } from './modelViewerHelpers';
import type { WebGLRecoveryState } from './modelViewerHelpers';

/** Public type giữ nguyên đường dẫn import cũ (`ModelViewer3D` re-export như trước). */
export type { WebGLRecoveryState } from './modelViewerHelpers';

export interface ModelViewer3DProps {
  fileName?: string;
  modelType?: string;
  parts?: ModelPart[];
  transform: TransformState;
  /** SỐ ĐO bàn in (mm). `null`/bỏ trống = **CHƯA KHAI** ⇒ viewer không vẽ bàn (KHÔNG mặc định). */
  bedDimensions?: { x: number; y: number; z: number } | null;
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

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  fileName,
  modelType = 'gear',
  parts = [],
  transform,
  bedDimensions = null,
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
  /**
   * Đợt S (#3): bàn in chỉ tồn tại khi CÓ SỐ ĐO THẬT cả 3 cạnh. `bed === null` ⇒ không vẽ lưới
   * bàn, không kết luận "vượt khổ", không hiển thị con số bàn in nào.
   */
  const bed =
    bedDimensions &&
    typeof bedDimensions.x === 'number' && Number.isFinite(bedDimensions.x) &&
    typeof bedDimensions.y === 'number' && Number.isFinite(bedDimensions.y) &&
    typeof bedDimensions.z === 'number' && Number.isFinite(bedDimensions.z)
      ? bedDimensions
      : null;

  const rootWrapperRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Đợt S (#3): KHÔNG khởi tạo bằng số bịa (`40`, `92×92×38`). Giá trị 0 = CHƯA ĐO;
  // giao diện hiện `—` và khung dựng cảnh dùng sàn `MIN_VIEW_FRAME` cho tới khi có số đo thật.
  const [modelHeight, setModelHeight] = useState(0);
  const [modelDims, setModelDims] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);
  const [interactionMode] = useState<'orbit' | 'pan'>('orbit');
  const [caliperPoints, setCaliperPoints] = useState<THREE.Vector3[]>([]);
  const [caliperDistance, setCaliperDistance] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isBedOverflow, setIsBedOverflow] = useState(false);
  const [currentSlice, setCurrentSlice] = useState<number>(100);
  const [activeAngle, setActiveAngle] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  // FPS ghi thẳng vào DOM qua ref — KHÔNG dùng state: trước đây `setFps` mỗi 500ms làm cả
  // component ~2000 dòng re-render liên tục kể cả khi khung 3D đã ra khỏi viewport.
  const fpsDisplayRef = useRef<HTMLSpanElement | null>(null);
  const [localBoundingBox, setLocalBoundingBox] = useState<boolean>(showBoundingBox);
  const [localMeasurementActive, setLocalMeasurementActive] = useState<boolean>(measurementActive);

  // WebGL Context Loss Recovery FSM (R5)
  const [webglState, setWebglState] = useState<WebGLRecoveryState>('ACTIVE');
  const [contextEpoch, setContextEpoch] = useState<number>(0);

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

    // Chưa khai bàn in ⇒ KHÔNG kết luận "vượt khổ" (không có gì để so).
    const overflow = !!bed && (scaledX > bed.x || scaledY > bed.y || scaledZ > bed.z);
    setIsBedOverflow(overflow);
  }, [modelDims, transform, bed]);

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

  const handleToggleFullscreen = useModelViewerFullscreen({
    isFullscreen,
    setIsFullscreen,
    rootWrapperRef
  });

  // Force resize on fullscreen transition start and end
  /**
   * Khung tham chiếu để DỰNG CẢNH: bàn in thật nếu có, ngược lại dùng CHÍNH kích thước mô hình
   * (số đo thật, cập nhật từ geometry) và cuối cùng là sàn `MIN_VIEW_FRAME`. Không dùng giá trị
   * này để HIỂN THỊ số đo bàn in.
   */
  const viewFrame = {
    x: bed?.x ?? (modelDims.x > 0 ? modelDims.x : MIN_VIEW_FRAME),
    y: bed?.y ?? (modelDims.y > 0 ? modelDims.y : MIN_VIEW_FRAME),
    z: bed?.z ?? (modelDims.z > 0 ? modelDims.z : MIN_VIEW_FRAME),
  };

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
          const fSize = Math.max(viewFrame.x, viewFrame.y, MIN_VIEW_FRAME);
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
  }, [isFullscreen, bed, modelDims, requestRender]);

  // ---------------------------------------------------------------------------------
  // 1. SCENE GRAPH INITIALIZATION (Runs ONCE on mount; NOT destroyed on state change)
  // ---------------------------------------------------------------------------------
  useModelViewerScene({
    containerRef,
    bed,
    viewFrame,
    contextEpoch,
    interactionMode,
    cameraMode,
    sceneRef,
    rendererRef,
    meshGroupRef,
    stencilGroupRef,
    capMeshRef,
    perspectiveCameraRef,
    orthoCameraRef,
    activeCameraRef,
    orbitTargetRef,
    clipPlaneRef,
    stencilMatBackRef,
    stencilMatFrontRef,
    capMaterialRef,
    animationFrameIdRef,
    isRotatingRef,
    cameraModeRef,
    fpsDisplayRef,
    localMeasurementActiveRef,
    handleMeasureClickRef,
    onSelectPartRef,
    setWebglState,
    setContextEpoch,
    setHoveredPartName
  });

  // Separate Camera Mode Switcher (changes active camera without destroying WebGL context)
  useEffect(() => {
    activeCameraRef.current = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    requestRender();
  }, [cameraMode, requestRender]);

  // ---------------------------------------------------------------------------------
  // 2. MODEL GEOMETRY BUILDING (Runs ONLY when customGeometry / customObjectGroup / modelType changes)
  // ---------------------------------------------------------------------------------
  useModelViewerMesh({
    meshGroupRef,
    stencilGroupRef,
    partMeshMapRef,
    clipPlaneRef,
    stencilMatBackRef,
    stencilMatFrontRef,
    orbitTargetRef,
    perspectiveCameraRef,
    orthoCameraRef,
    customGeometry,
    customObjectGroup,
    modelType,
    parts,
    selectedPartId,
    showDefects,
    compareMode,
    activePlateIndex,
    currentPlate,
    wireframe,
    setModelDims,
    setModelHeight,
    contextEpoch
  });

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
  }, [transform, isBoundingBoxActive, isBedOverflow, requestRender, contextEpoch]);

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
        // F2 (P2): đồng bộ với lúc dựng mesh — `null` = tệp chưa khai bàn, không gán Bàn 1.
        const partPlateIndex = m.userData?.plateIndex ?? null;
        const currentPart = parts.find(p => p.id === partId);
        const isSelected = partId === selectedPartId;

        // Visibility
        const isPlateVisible =
          activePlateIndex === 0 || partPlateIndex === null || partPlateIndex === activePlateIndex;
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
  }, [wireframe, showDefects, compareMode, selectedPartId, parts, activePlateIndex, requestRender, contextEpoch]);

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
    const bedMax = bed ? Math.max(bed.x, bed.y, bed.z) : 0;
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
    const radius = Math.max(sphere.radius, (bed?.x ?? 0) * 0.45, 35);
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
    const bedMax = bed ? Math.max(bed.x, bed.y) : 0;
    const d = Math.max(maxDim * 2.2, bedMax * 1.5, MIN_VIEW_FRAME);
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
    // Chưa khai khổ bàn ⇒ KHÔNG suy được tỉ lệ "vừa bàn" (không lấy một khối bàn in bịa làm chuẩn).
    if (!bed) return;
    const fitFactor = Math.min(
      (bed.x * 0.85) / Math.max(1, modelDims.x),
      (bed.y * 0.85) / Math.max(1, modelDims.y),
      (bed.z * 0.85) / Math.max(1, modelDims.z)
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
  // Dev hook for simulating WebGL context loss & recovery (R5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__simulateContextLoss = () => {
        const renderer = rendererRef.current;
        if (!renderer) {
          console.warn('[ModelViewer3D] Không tìm thấy WebGLRenderer để mô phỏng mất ngữ cảnh.');
          return false;
        }
        const gl = renderer.getContext();
        const ext = gl.getExtension('WEBGL_lose_context');
        if (!ext) {
          console.warn('[ModelViewer3D] Trình duyệt không hỗ trợ extension WEBGL_lose_context.');
          return false;
        }
        console.warn('[ModelViewer3D] Đang kích hoạt mất ngữ cảnh WebGL (simulateContextLoss)...');
        ext.loseContext();
        setTimeout(() => {
          console.info('[ModelViewer3D] Đang khôi phục ngữ cảnh WebGL (restoreContext)...');
          ext.restoreContext();
        }, 1200);
        return true;
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__simulateContextLoss;
      }
    };
  }, []);

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
      className={`relative bg-surface-muted overflow-hidden border ${
        isBedOverflow ? 'border-danger ring-2 ring-danger/40' : 'border-line'
      } flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-modal rounded-none w-screen h-dvh p-0 m-0'
          : `rounded-lg ${className}`
      }`}
    >
      <ModelViewerChrome
        containerRef={containerRef}
        isDragOver={isDragOver}
        webglState={webglState}
        setWebglState={setWebglState}
        setContextEpoch={setContextEpoch}
        displayName={displayName}
        fpsDisplayRef={fpsDisplayRef}
        isFullscreen={isFullscreen}
        handleToggleFullscreen={handleToggleFullscreen}
        cameraMode={cameraMode}
        handleToggleCameraMode={handleToggleCameraMode}
        isRotating={isRotating}
        setIsRotating={setIsRotating}
        wireframe={wireframe}
        setWireframe={setWireframe}
        isBoundingBoxActive={isBoundingBoxActive}
        handleToggleBoundingBox={handleToggleBoundingBox}
        isMeasurementActive={isMeasurementActive}
        handleToggleMeasurement={handleToggleMeasurement}
        activeAngle={activeAngle}
        setCameraAngle={setCameraAngle}
        plates={plates}
        activePlateIndex={activePlateIndex}
        onSelectPlate={onSelectPlate}
        handleAutoFit={handleAutoFit}
        isBedOverflow={isBedOverflow}
        bed={bed}
        modelDims={modelDims}
        scaleMultiplier={scaleMultiplier}
        onUpdateTransform={onUpdateTransform}
        handleScaleToFitBed={handleScaleToFitBed}
        caliperPoints={caliperPoints}
        caliperDistance={caliperDistance}
        clearMeasurement={clearMeasurement}
        hoveredPartName={hoveredPartName}
        handleResetCamera={handleResetCamera}
        handleCaptureThumbnail={handleCaptureThumbnail}
        currentSlice={currentSlice}
        handleSliceChange={handleSliceChange}
        transform={transform}
        modelHeight={modelHeight}
      />
    </div>
  );
};
