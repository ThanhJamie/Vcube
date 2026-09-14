import * as THREE from 'three';

/**
 * Cleanly and recursively disposes every BufferGeometry, Material (and sub-materials), and Texture
 * within an Object3D hierarchy to completely eliminate VRAM and GPU memory leaks.
 *
 * Single shared implementation for every 3D viewer (merged from the two copies that previously
 * lived in `tool3d/ModelViewer3D.tsx` and `personalize/PersonalizeModelViewer3D.tsx`).
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
