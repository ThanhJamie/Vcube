import { useEffect } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { disposeHierarchy } from '../../three/dispose';
import type { ModelPart, PlateInfo } from '@/types';

/** Tham số cho hook dựng mesh + stencil cross-section của ModelViewer3D. */
export interface UseModelViewerMeshParams {
  meshGroupRef: React.MutableRefObject<THREE.Group | null>;
  stencilGroupRef: React.MutableRefObject<THREE.Group | null>;
  partMeshMapRef: React.MutableRefObject<Map<string, THREE.Mesh>>;
  clipPlaneRef: React.MutableRefObject<THREE.Plane>;
  stencilMatBackRef: React.MutableRefObject<THREE.MeshBasicMaterial>;
  stencilMatFrontRef: React.MutableRefObject<THREE.MeshBasicMaterial>;
  orbitTargetRef: React.MutableRefObject<THREE.Vector3>;
  perspectiveCameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  orthoCameraRef: React.MutableRefObject<THREE.OrthographicCamera | null>;
  customGeometry?: THREE.BufferGeometry | null;
  customObjectGroup?: THREE.Group | null;
  modelType: string;
  parts: ModelPart[];
  selectedPartId?: string | null;
  showDefects: boolean;
  compareMode: 'normal' | 'before' | 'after';
  activePlateIndex: number;
  currentPlate: PlateInfo | null;
  wireframe: boolean;
  setModelDims: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  setModelHeight: React.Dispatch<React.SetStateAction<number>>;
  contextEpoch: number;
}

/**
 * Effect dựng geometry/mesh + stencil capping + auto-fit camera của ModelViewer3D — block-move
 * từ `components/tool3d/ModelViewer3D.tsx` dòng 912–1265 (Phase 4a). Hook gọi đúng vị trí effect
 * cũ; body giữ nguyên văn; deps giữ nguyên như bản gốc.
 */
export const useModelViewerMesh = (params: UseModelViewerMeshParams): void => {
  const {
    meshGroupRef, stencilGroupRef, partMeshMapRef, clipPlaneRef,
    stencilMatBackRef, stencilMatFrontRef, orbitTargetRef,
    perspectiveCameraRef, orthoCameraRef,
    customGeometry, customObjectGroup, modelType, parts, selectedPartId,
    showDefects, compareMode, wireframe, setModelDims, setModelHeight, contextEpoch,
    activePlateIndex, currentPlate
  } = params;

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
      mesh.userData = { partId: part0?.id || 'custom-part', partName: part0?.name || 'Lưới STL tuỳ chỉnh', isSharedGeometry: true };
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
        // F2 (P2): tệp KHÔNG khai bàn cho chi tiết ⇒ giữ `null`, KHÔNG ngầm gán Bàn 1.
        // Chi tiết chưa khai bàn luôn hiển thị (không thể ẩn nó vào một bàn không xác định).
        const partPlateIndex = currentPart?.plateIndex ?? null;

        const isPlateVisible =
          activePlateIndex === 0 || partPlateIndex === null || partPlateIndex === activePlateIndex;
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
  }, [customGeometry, customObjectGroup, modelType, parts.length, contextEpoch]);
};
