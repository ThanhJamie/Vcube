import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { UnifiedCadToolbar } from '../tool3d/UnifiedCadToolbar';

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
  onLidExplodeChange?: (distance: number) => void;
}

/**
 * Cleanly and recursively disposes every BufferGeometry, Material (and sub-materials), and Texture
 * within an Object3D hierarchy to completely eliminate VRAM and GPU memory leaks.
 */
export function disposeHierarchy(rootNode: THREE.Object3D, preserveMaterials = false) {
  rootNode.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
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
  dimensions = { x: 120.0, y: 85.5, z: 45.2 },
  onLidExplodeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootWrapperRef = useRef<HTMLDivElement>(null);

  // 3D Engine Viewport Controls State
  const [cameraMode, setCameraMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'xray'>('solid');
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');

  // Local Lid lift slider state (0 to 40 mm)
  const [localLidLift, setLocalLidLift] = useState<number>(lidExplodeDistance);

  // Sync external lidExplodeDistance prop
  useEffect(() => {
    setLocalLidLift(lidExplodeDistance);
  }, [lidExplodeDistance]);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const lidGroupRef = useRef<THREE.Group | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const textTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Materials References
  const baseMaterialRef = useRef<THREE.MeshStandardMaterial>(new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.15
  }));

  const lidTopMaterialRef = useRef<THREE.MeshStandardMaterial>(new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.15
  }));

  const accentMaterialRef = useRef<THREE.MeshStandardMaterial>(new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.2
  }));

  // On-demand rendering control refs
  const renderRequestedRef = useRef<boolean>(false);
  const isIntersectingRef = useRef<boolean>(true);
  const animationFrameIdRef = useRef<number | null>(null);
  const isRotatingRef = useRef<boolean>(isRotating);
  isRotatingRef.current = isRotating;
  const cameraModeRef = useRef<'perspective' | 'orthographic'>(cameraMode);
  cameraModeRef.current = cameraMode;

  // On-Demand Render Request Dispatcher
  const requestRender = useCallback(() => {
    if (!isIntersectingRef.current || renderRequestedRef.current) return;
    renderRequestedRef.current = true;
    animationFrameIdRef.current = requestAnimationFrame(() => {
      renderRequestedRef.current = false;
      if (!isIntersectingRef.current) return;

      if (isRotatingRef.current && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.008;
        requestRender();
      }

      const activeCam = cameraModeRef.current === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
      if (activeCam && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, activeCam);
      }
    });
  }, []);

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
      console.warn('Native requestFullscreen failed, fallback to CSS fullscreen:', err);
      setIsFullscreen(prev => !prev);
    }
  }, [isFullscreen]);

  // Synchronize fullscreen state with browser events and ESC key
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

  // Lock body scroll when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  // Force resize on fullscreen transition
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
          const frustumSize = 280;
          orthoCameraRef.current.left = (-frustumSize * asp) / 2;
          orthoCameraRef.current.right = (frustumSize * asp) / 2;
          orthoCameraRef.current.top = frustumSize / 2;
          orthoCameraRef.current.bottom = -frustumSize / 2;
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
  }, [isFullscreen, requestRender]);

  // Update camera angle preset
  const setViewPreset = useCallback((angle: 'iso' | 'top' | 'front' | 'side') => {
    setActivePreset(angle);
    const pers = perspectiveCameraRef.current;
    const ortho = orthoCameraRef.current;
    const dist = 280;
    const centerY = dimensions.z * 0.3;

    let targetPos = new THREE.Vector3(dist * 0.75, dist * 0.7, dist * 0.85);
    if (angle === 'top') targetPos.set(0.01, dist * 1.3, 0);
    else if (angle === 'front') targetPos.set(0, centerY, dist * 1.2);
    else if (angle === 'side') targetPos.set(dist * 1.2, centerY, 0);

    if (pers) {
      pers.position.copy(targetPos);
      pers.lookAt(0, centerY, 0);
    }
    if (ortho) {
      ortho.position.copy(targetPos);
      ortho.lookAt(0, centerY, 0);
    }
    requestRender();
  }, [dimensions.z, requestRender]);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    setViewPreset('iso');
  }, [setViewPreset]);

  // Generate dynamic 2D canvas texture for lid text & engraving
  const generateTextCanvasTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle brushed plastic grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 1024; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
    }

    // Outer border chamfer line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 964, 964);

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
      const pixelSize = Math.max(36, Math.min(140, Math.round(fontSizeMm * 6.5)));
      ctx.font = `bold ${pixelSize}px "${fontFamily}", "JetBrains Mono", sans-serif`;

      if (engravingDepth === 'laser') {
        ctx.fillStyle = '#09101d';
        ctx.fillText(engravingText, posX, posY);
      } else if (engravingDepth === 'recessed') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillText(engravingText, posX + 3, posY + 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillText(engravingText, posX - 2, posY - 2);
        ctx.fillStyle = '#060a12';
        ctx.fillText(engravingText, posX, posY);
      } else {
        // Embossed
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillText(engravingText, posX - 3, posY - 3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillText(engravingText, posX + 3, posY + 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(engravingText, posX, posY);
      }
    }

    if (logoName) {
      ctx.fillStyle = '#57DFFE';
      ctx.font = 'bold 36px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ LOGO: ${logoName.toUpperCase()}`, 512, 820);
      ctx.strokeStyle = '#57DFFE';
      ctx.lineWidth = 3;
      ctx.strokeRect(260, 770, 504, 70);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [colorHex, engravingText, fontFamily, fontSizeMm, engravingDepth, engravingPosition, logoName]);

  // Model Geometry Builder
  const buildModelGeometry = useCallback((rootGroup: THREE.Group) => {
    disposeHierarchy(rootGroup);

    const baseMaterial = baseMaterialRef.current;
    const lidTopMaterial = lidTopMaterialRef.current;
    const accentMaterial = accentMaterialRef.current;

    const caseLength = 110;
    const caseWidth = 75;
    const baseHeight = 26;
    const wallThick = 3.2;

    const baseGroup = new THREE.Group();
    baseGroup.name = 'BaseHousingGroup';

    // 1. Outer Base Housing
    const outerBaseGeo = new THREE.BoxGeometry(caseLength, baseHeight, caseWidth);
    const baseMesh = new THREE.Mesh(outerBaseGeo, baseMaterial);
    baseMesh.position.y = baseHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.renderOrder = 2;
    baseMesh.userData = { partName: 'Enclosure Base Housing' };
    baseGroup.add(baseMesh);

    // 2. Inner Cavity
    const innerCavityGeo = new THREE.BoxGeometry(
      caseLength - wallThick * 2,
      baseHeight - wallThick,
      caseWidth - wallThick * 2
    );
    const innerCavityMesh = new THREE.Mesh(innerCavityGeo, accentMaterial);
    innerCavityMesh.position.y = baseHeight / 2 + wallThick / 2;
    innerCavityMesh.renderOrder = 2;
    baseGroup.add(innerCavityMesh);

    // 3. PCB Standoff Mounting Bosses inside
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
      standoffMesh.renderOrder = 2;
      standoffMesh.userData = { partName: `M3 Mounting Boss #${idx + 1}` };
      baseGroup.add(standoffMesh);

      const holeGeo = new THREE.CylinderGeometry(1.5, 1.5, 8.2, 12);
      const holeMesh = new THREE.Mesh(holeGeo, accentMaterial);
      holeMesh.position.set(pos.x, 8.1, pos.z);
      holeMesh.renderOrder = 2;
      baseGroup.add(holeMesh);
    });

    // 4. Cutouts (USB & DC Jack)
    const usbCutoutGeo = new THREE.BoxGeometry(16, 12, 5);
    const usbCutout = new THREE.Mesh(usbCutoutGeo, accentMaterial);
    usbCutout.position.set(-caseLength / 2 + 22, 12, -caseWidth / 2 + 1);
    usbCutout.renderOrder = 2;
    baseGroup.add(usbCutout);

    const dcJackGeo = new THREE.CylinderGeometry(5.5, 5.5, 6, 16);
    const dcJack = new THREE.Mesh(dcJackGeo, accentMaterial);
    dcJack.rotation.x = Math.PI / 2;
    dcJack.position.set(caseLength / 2 - 25, 12, -caseWidth / 2 + 1);
    dcJack.renderOrder = 2;
    baseGroup.add(dcJack);

    rootGroup.add(baseGroup);

    // 5. Detachable Snap-fit Lid Group
    const lidGroup = new THREE.Group();
    lidGroup.name = 'LidGroup';
    lidGroupRef.current = lidGroup;

    const lidThick = 6;
    const lidWidth = caseLength + 2.5;
    const lidDepth = caseWidth + 2.5;

    const lidMaterials = [
      baseMaterial,
      baseMaterial,
      lidTopMaterial,
      accentMaterial,
      baseMaterial,
      baseMaterial
    ];

    const lidGeo = new THREE.BoxGeometry(lidWidth, lidThick, lidDepth);
    const lidMesh = new THREE.Mesh(lidGeo, lidMaterials);
    lidMesh.position.y = lidThick / 2;
    lidMesh.castShadow = true;
    lidMesh.receiveShadow = true;
    lidMesh.renderOrder = 2;
    lidMesh.userData = { partName: 'Customized Engraved Snap-Fit Lid' };
    lidGroup.add(lidMesh);

    const lipGeo = new THREE.BoxGeometry(
      caseLength - wallThick * 2 - 0.6,
      4,
      caseWidth - wallThick * 2 - 0.6
    );
    const lipMesh = new THREE.Mesh(lipGeo, baseMaterial);
    lipMesh.position.y = -2;
    lipMesh.renderOrder = 2;
    lidGroup.add(lipMesh);

    lidGroup.position.y = baseHeight + localLidLift;
    rootGroup.add(lidGroup);
  }, [localLidLift]);

  // ---------------------------------------------------------------------------------
  // 1. SCENE INITIALIZATION (Runs ONCE on mount; NEVER destroyed on prop updates)
  // ---------------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 440;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091426);
    sceneRef.current = scene;

    // 2. Cameras
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
    rendererRef.current = renderer;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight1.position.set(80, 120, 80);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x57dffe, 0.7);
    dirLight2.position.set(-80, 70, -80);
    scene.add(dirLight2);

    // 5. Millimeter Build Plate Grid & Axis Lines
    const gridHelper = new THREE.GridHelper(220, 22, 0x00687a, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(35);
    axesHelper.position.set(-110, 0.2, 110);
    scene.add(axesHelper);

    // 6. Mesh Root Group
    const rootGroup = new THREE.Group();
    rootGroup.name = 'PersonalizeRootGroup';
    scene.add(rootGroup);
    meshGroupRef.current = rootGroup;

    // Build geometry immediately so the model is visible on first paint!
    buildModelGeometry(rootGroup);

    // 7. Interactive Orbit Controls (Pointer Drag)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && rootGroup) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        rootGroup.rotation.y += deltaX * 0.008;
        rootGroup.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, rootGroup.rotation.x + deltaY * 0.006));
        previousMousePosition = { x: e.clientX, y: e.clientY };
        requestRender();
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pCam = perspectiveCameraRef.current;
      if (pCam) {
        const centerY = dimensions.z * 0.3;
        const target = new THREE.Vector3(0, centerY, 0);
        const offset = pCam.position.clone().sub(target);
        const dist = offset.length();
        const zoomDelta = e.deltaY * 0.2;
        const newDist = Math.max(60, Math.min(600, dist + zoomDelta));
        offset.normalize().multiplyScalar(newDist);
        pCam.position.copy(target.clone().add(offset));
        requestRender();
      }
    };

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          const asp = w / h;
          if (perspectiveCameraRef.current) {
            perspectiveCameraRef.current.aspect = asp;
            perspectiveCameraRef.current.updateProjectionMatrix();
          }
          if (rendererRef.current) {
            rendererRef.current.setSize(w, h, true);
            rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      if (container.contains(domEl)) container.removeChild(domEl);

      const gl = renderer.getContext();
      disposeHierarchy(scene);
      renderer.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []); // Run ONCE on mount

  // Camera Mode Switcher (changes active camera without destroying WebGL context)
  useEffect(() => {
    activeCameraRef.current = cameraMode === 'orthographic' ? orthoCameraRef.current : perspectiveCameraRef.current;
    requestRender();
  }, [cameraMode, requestRender]);

  // Model Geometry updates when modelType or dimensions change
  useEffect(() => {
    if (meshGroupRef.current) {
      buildModelGeometry(meshGroupRef.current);
      requestRender();
    }
  }, [dimensions.x, dimensions.y, dimensions.z, modelType, buildModelGeometry, requestRender]);

  // Live Materials & CanvasTexture updates
  useEffect(() => {
    const isWireframe = renderMode === 'wireframe';
    const isXray = renderMode === 'xray';

    let roughness = 0.3;
    let metalness = 0.15;

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

    baseMaterialRef.current.color.set(colorHex);
    baseMaterialRef.current.roughness = roughness;
    baseMaterialRef.current.metalness = metalness;
    baseMaterialRef.current.wireframe = isWireframe;
    baseMaterialRef.current.transparent = isXray;
    baseMaterialRef.current.opacity = isXray ? 0.45 : 1.0;
    baseMaterialRef.current.needsUpdate = true;

    // Generate and attach updated CanvasTexture
    const oldTexture = textTextureRef.current;
    const newTexture = generateTextCanvasTexture();
    textTextureRef.current = newTexture;

    if (oldTexture) {
      oldTexture.dispose();
    }

    lidTopMaterialRef.current.map = newTexture;
    lidTopMaterialRef.current.roughness = roughness;
    lidTopMaterialRef.current.metalness = metalness;
    lidTopMaterialRef.current.wireframe = isWireframe;
    lidTopMaterialRef.current.transparent = isXray;
    lidTopMaterialRef.current.opacity = isXray ? 0.45 : 1.0;
    lidTopMaterialRef.current.needsUpdate = true;

    accentMaterialRef.current.wireframe = isWireframe;
    accentMaterialRef.current.transparent = isXray;
    accentMaterialRef.current.opacity = isXray ? 0.45 : 1.0;
    accentMaterialRef.current.needsUpdate = true;

    requestRender();
  }, [colorHex, generateTextCanvasTexture, materialName, renderMode, requestRender]);

  // Explode Lid distance update
  useEffect(() => {
    if (lidGroupRef.current) {
      lidGroupRef.current.position.y = 26 + localLidLift;
      requestRender();
    }
  }, [localLidLift, requestRender]);

  return (
    <div
      ref={rootWrapperRef}
      className={`relative bg-[#091426] select-none overflow-hidden border border-[#1e293b] flex flex-col font-sans transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[100] rounded-none w-screen h-screen p-0 m-0 shadow-2xl'
          : `rounded-2xl ${className}`
      }`}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* TOP-LEFT MINIMAL PRODUCT BADGE */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto flex items-center gap-2 bg-[#091426]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#334155]/60 text-xs text-white shadow-md">
        <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
        <span className="font-mono text-xs font-bold text-slate-200 uppercase">
          {modelType || 'ARDUINO-CASE'}
        </span>
        <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">
          ({dimensions.x.toFixed(0)}×{dimensions.y.toFixed(0)}×{dimensions.z.toFixed(0)} mm)
        </span>
      </div>

      {/* TOP-RIGHT UNIFIED CAD TOOLBAR */}
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <UnifiedCadToolbar
          isRotating={isRotating}
          onToggleRotate={() => setIsRotating(!isRotating)}
          wireframe={renderMode === 'wireframe'}
          onToggleWireframe={() => setRenderMode(renderMode === 'wireframe' ? 'solid' : 'wireframe')}
          onResetView={handleResetCamera}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          showAnglePresets={true}
          activeAngle={activePreset}
          onSelectAngle={(ang) => setViewPreset(ang)}
          cameraMode={cameraMode}
          onToggleCameraMode={() => setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')}
        />
      </div>

      {/* BOTTOM CENTER: COMPACT EXPLODE LID CONTROLLER */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3 bg-[#091426]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#334155]/60 shadow-xl text-xs text-white">
        <span className="material-symbols-outlined text-sm text-[#57DFFE]">vertical_align_top</span>
        <span className="font-mono text-[10px] uppercase text-slate-300 font-bold hidden sm:inline">
          TÁCH NẮP HỘP:
        </span>
        <input
          type="range"
          min={0}
          max={40}
          value={localLidLift}
          onChange={(e) => {
            const val = Number(e.target.value);
            setLocalLidLift(val);
            onLidExplodeChange?.(val);
          }}
          className="w-28 sm:w-36 accent-[#00687A] cursor-pointer"
          title="Kéo trượt để mở nắp hộp kiểm tra chân cắm bên trong"
        />
        <span className="font-mono text-xs text-[#57DFFE] font-bold w-12 text-right">
          +{localLidLift}mm
        </span>
      </div>
    </div>
  );
};
