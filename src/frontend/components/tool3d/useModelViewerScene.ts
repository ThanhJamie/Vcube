import { useEffect } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { disposeHierarchy } from '../../three/dispose';
import { MIN_VIEW_FRAME } from './modelViewerHelpers';
import type { WebGLRecoveryState } from './modelViewerHelpers';

/** Tham số cho hook dựng scene/render loop/input của ModelViewer3D (refs do component sở hữu). */
export interface UseModelViewerSceneParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  bed: { x: number; y: number; z: number } | null;
  viewFrame: { x: number; y: number; z: number };
  contextEpoch: number;
  interactionMode: 'orbit' | 'pan';
  cameraMode: 'perspective' | 'orthographic';
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  meshGroupRef: React.MutableRefObject<THREE.Group | null>;
  stencilGroupRef: React.MutableRefObject<THREE.Group | null>;
  capMeshRef: React.MutableRefObject<THREE.Mesh | null>;
  perspectiveCameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  orthoCameraRef: React.MutableRefObject<THREE.OrthographicCamera | null>;
  activeCameraRef: React.MutableRefObject<THREE.Camera | null>;
  orbitTargetRef: React.MutableRefObject<THREE.Vector3>;
  clipPlaneRef: React.MutableRefObject<THREE.Plane>;
  stencilMatBackRef: React.MutableRefObject<THREE.MeshBasicMaterial>;
  stencilMatFrontRef: React.MutableRefObject<THREE.MeshBasicMaterial>;
  capMaterialRef: React.MutableRefObject<THREE.MeshStandardMaterial>;
  animationFrameIdRef: React.MutableRefObject<number | null>;
  isRotatingRef: React.MutableRefObject<boolean>;
  cameraModeRef: React.MutableRefObject<'perspective' | 'orthographic'>;
  fpsDisplayRef: React.RefObject<HTMLSpanElement | null>;
  localMeasurementActiveRef: React.MutableRefObject<boolean>;
  handleMeasureClickRef: React.MutableRefObject<(worldPoint: THREE.Vector3) => void>;
  onSelectPartRef: React.MutableRefObject<((partId: string | null) => void) | undefined>;
  setWebglState: React.Dispatch<React.SetStateAction<WebGLRecoveryState>>;
  setContextEpoch: React.Dispatch<React.SetStateAction<number>>;
  setHoveredPartName: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Scene graph + renderer + input handlers + WebGL context-loss FSM + render loop + resize của
 * ModelViewer3D — block-move từ `components/tool3d/ModelViewer3D.tsx` dòng 401–901 (Phase 4a).
 * Hook được gọi đúng tại vị trí effect cũ nên thứ tự effect không đổi; body giữ nguyên văn.
 */
export const useModelViewerScene = (params: UseModelViewerSceneParams): void => {
  const {
    containerRef, bed, viewFrame, contextEpoch, interactionMode, cameraMode,
    sceneRef, rendererRef, meshGroupRef, stencilGroupRef, capMeshRef,
    perspectiveCameraRef, orthoCameraRef, activeCameraRef, orbitTargetRef,
    clipPlaneRef, stencilMatBackRef, stencilMatFrontRef, capMaterialRef,
    animationFrameIdRef, isRotatingRef, cameraModeRef, fpsDisplayRef,
    localMeasurementActiveRef, handleMeasureClickRef, onSelectPartRef,
    setWebglState, setContextEpoch, setHoveredPartName
  } = params;

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
    const initialBedMax = Math.max(viewFrame.x, viewFrame.y, viewFrame.z, MIN_VIEW_FRAME);
    const initCamDist = initialBedMax * 2.2;
    persCamera.position.set(initCamDist * 0.75, initCamDist * 0.7, initCamDist * 0.85);
    persCamera.lookAt(0, viewFrame.z * 0.2, 0);
    perspectiveCameraRef.current = persCamera;

    const frustumSize = Math.max(viewFrame.x, viewFrame.y, MIN_VIEW_FRAME) * 1.8;
    const orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.5,
      50000
    );
    orthoCamera.position.set(initCamDist * 0.75, initCamDist * 0.7, initCamDist * 0.85);
    orthoCamera.lookAt(0, viewFrame.z * 0.2, 0);
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

    // 5. Lưới bàn in CAD (mm) — CHỈ vẽ khi có SỐ ĐO bàn in THẬT (Đợt S #3).
    //    Chưa khai khổ bàn ⇒ không vẽ lưới/buồng khổ và KHÔNG gắn một con số bàn in bịa nào.
    if (bed) {
      const bedWidth = bed.x;
      const bedDepth = bed.y;
      const bedHeight = bed.z;

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
    }

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

    // WebGL Context Loss & Restoration Listeners (R5)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost detected in ModelViewer3D. Preventing engine crash...');
      isLoopRunning = false;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      setWebglState('CONTEXT_LOST');
    };

    const handleContextRestored = () => {
      console.info('WebGL context restored in ModelViewer3D. Rebuilding render queue and scene graph...');
      setWebglState('RECOVERING');
      setContextEpoch((prev) => prev + 1);
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
              const fSize = Math.max(viewFrame.x, viewFrame.y, MIN_VIEW_FRAME);
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

    // 10. On-demand render loop — dừng HẲN khi khung 3D ra khỏi viewport hoặc tab bị ẩn.
    //     Trước đây vòng rAF chạy 60fps vô điều kiện + `setFps` mỗi 500ms ⇒ component gần
    //     2000 dòng re-render 2 lần/giây kể cả khi người dùng đã cuộn xuống bảng báo giá.
    let isLoopRunning = false;
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let isElementVisible = true;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateFpsDisplay = (value: number) => {
      const el = fpsDisplayRef.current;
      if (el) el.textContent = `${value} FPS`;
    };

    const renderLoop = (now: number) => {
      if (!isLoopRunning) return;
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);

      // Skip render calculations when tab is backgrounded to save GPU & battery
      if (document.hidden) return;

      // Realtime measured FPS calculation every 1000ms (ghi thẳng vào DOM, không setState).
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        updateFpsDisplay(Math.max(1, Math.min(120, measuredFps)));
        frameCount = 0;
        lastFpsTime = now;
      }

      // Smooth 360 Auto-Rotation (không chạy khi người dùng bật giảm chuyển động)
      if (isRotatingRef.current && meshGroupRef.current && !prefersReducedMotion) {
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

    const startLoop = () => {
      if (isLoopRunning) return;
      isLoopRunning = true;
      frameCount = 0;
      lastFpsTime = performance.now();
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    const stopLoop = () => {
      isLoopRunning = false;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };

    // Chỉ chạy khi khung 3D thực sự trong viewport (rootMargin 200px để khởi động sớm).
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        isElementVisible = entries.some((entry) => entry.isIntersecting);
        if (isElementVisible && !document.hidden) startLoop();
        else stopLoop();
      },
      { rootMargin: '200px' },
    );
    visibilityObserver.observe(container);

    const handleVisibilityChange = () => {
      if (document.hidden || !isElementVisible) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startLoop();
    setWebglState('ACTIVE');

    return () => {
      isLoopRunning = false;
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  }, [bed?.x, bed?.y, bed?.z, contextEpoch]);
};
