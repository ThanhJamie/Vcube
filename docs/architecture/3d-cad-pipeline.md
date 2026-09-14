# VCUBE 3D Graphics & CAD Processing Pipeline

> **Target Version**: VCUBE Platform Release 3.0  
> **Classification**: Core 3D Computer Graphics & Geometry Engine Specification  
> **Author**: Worker M1 — Architecture & CAD Engine Specialist  
> **Date**: September 2026  
> **Status**: APPROVED / ACTIVE

---

## 1. Pipeline Architecture & High-Level Flow

The VCUBE 3D CAD Pipeline is an end-to-end geometry processing, inspection, and rendering system capable of handling complex mechanical CAD assemblies, B-Rep boundary representations (`.step`, `.stp`, `.iges`), and polygonal meshes (`.stl`, `.3mf`, `.obj`).

```
+---------------------------------------------------------------------------------------------------+
|                                      FILE INGESTION & PIPELINE                                    |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
                                      +-----------------------+
                                      | User Uploads 3D File  |
                                      +-----------+-----------+
                                                  |
                +---------------------------------+---------------------------------+
                |                                                                   |
                v (STEP / STP / IGES / IGS / Large STL > 2MB)                       v (STL <= 2MB, 3MF, OBJ)
    +-----------------------+                                           +-----------------------+
    | Dedicated Web Worker  |                                           | Main Thread Parser    |
    | (cadParser.worker.ts) |                                           | (src/utils/           |
    +-----------+-----------+                                           |  meshParser.ts)       |
                |                                                       +-----------+-----------+
                |                                                                   |
                v                                                                   |
    +-----------------------------------------------+                               |
    | OpenCASCADE WASM Kernel (occt-import-js)      |                               |
    | - B-Rep Boundary Representation Decoding      |                               |
    | - Tessellation into Triangle Meshes           |                               |
    | - Gauss Divergence Analytic Volume (cm³)      |                               |
    | - Precise Triangle Surface Area (cm²)         |                               |
    +-----------------------+-----------------------+                               |
                            |                                                       |
                            v (Zero-Copy Transferable Arrays)                       |
    +-----------------------------------------------+                               |
    | Transfer to Main Thread:                      |                               |
    | [positions.buffer, normals.buffer]            |                               |
    +-----------------------+-----------------------+                               |
                            |                                                       |
                            +-------------------+-----------------------------------+
                                                |
                                                v
                                    +-----------------------+
                                    | ParsedMeshResult      |
                                    | - BufferGeometry      |
                                    | - Exact Dimensions    |
                                    | - Topological Defects |
                                    | - Slicer Presets / AMS|
                                    +-----------+-----------+
                                                |
                        +-----------------------+-----------------------+
                        |                                               |
                        v                                               v
            +-----------------------+                       +-----------------------+
            |  ThreeModelViewer.tsx |                       |   ModelViewer3D.tsx   |
            |  (Storefront / PDP /  |                       |  (Industrial Slicing  |
            |   Catalog Thumbnails) |                       |   & Quoting Cockpit)  |
            |                       |                       |                       |
            |  - useInViewport Lazy |                       |  - Context Loss FSM   |
            |    Load (±100px)      |                       |    (ACTIVE/LOST/REC)  |
            |  - Safe VRAM Teardown |                       |  - Stencil Capping    |
            |  - Low Power Profile  |                       |  - Ortho / Persp Cam  |
            +-----------------------+                       +-----------------------+
```

---

## 2. WebGL & Three.js 0.185 Viewer Infrastructure

VCUBE utilizes **Three.js 0.185** across several specialized viewer components:

### 1. `ThreeModelViewer.tsx` (`src/frontend/components/ThreeModelViewer.tsx`)
A high-performance, lightweight 3D canvas designed for catalog previews, product detail pages, and thumbnail inspection:
- **Use Cases**: `HomeView`, `ProductDetailView`, `CadQuickViewModal`, `AssetLibraryView`, `DesignerModelsManagerTab`, `DesignerUploadWizardTab`.
- **Key Features**:
  - Interactive orbital mouse/touch rotation and wheel zooming.
  - Interactive layer slicer simulation (`clippingPlanes` dynamic Y-axis cut).
  - Isometric, Top, Front, and Side camera view presets.
  - Built-in `useInViewport` wrapper to ensure zero GPU resource consumption when scrolled off-screen.

### 2. `ModelViewer3D.tsx` (`src/frontend/components/tool3d/ModelViewer3D.tsx`)
The industrial-grade 3D inspection and instant quotation cockpit used on the `/quote` route:
- **Key Features**:
  - **Context Loss FSM**: Resilient WebGL crash recovery.
  - **Dual Camera System**: Toggles between `PerspectiveCamera` (immersive 3D navigation) and `OrthographicCamera` (engineering dimensional verification without perspective distortion).
  - **Stencil Cross-Section Capping**: Employs two-pass stencil buffer rendering (`MeshBasicMaterial` with `THREE.BackSide` / `THREE.FrontSide` and `THREE.IncrementWrapStencilOp` / `THREE.DecrementWrapStencilOp`) to render solid cross-sectional fills at clipping planes.
  - **Dynamic Build Plate Matrix**: Renders build volumes representing printer fleet specifications (e.g., Bambu Lab $256 \times 256 \times 256\text{ mm}$, industrial Voron $350 \times 350 \times 350\text{ mm}$).
  - **Realtime Telemetry**: Measures actual browser FPS every 500ms via `performance.now()`.
  - **Multi-Part & Multi-Material AMS Support**: Groups individual meshes by extruder index, assigning distinct PBR materials and colors.

### 3. `CadQuickViewModal.tsx` (`src/frontend/components/CadQuickViewModal.tsx`)
A modal viewer enabling users on the `ExploreView` catalog to inspect 3D geometry, configure materials, toggle wireframe/slicing, and execute a Dual CTA ("Đặt In 3D" or "Tải Tệp CAD") without navigating away from the catalog.

---

## 3. Memory Management & GPU Cleanup Lifecycle

WebGL applications running in single-page applications are highly prone to VRAM exhaustion and GPU context crashes if resources are not manually deallocated upon unmounting. VCUBE establishes a strict resource disposal protocol.

### The `disposeHierarchy` Protocol (`src/frontend/three/dispose.ts`)

Three.js does not garbage-collect GPU-allocated buffers (vertex arrays, index buffers, shader programs, and textures) automatically when a JavaScript object reference is dropped. The `disposeHierarchy` utility systematically deallocates these resources:

```typescript
import * as THREE from 'three';

export function disposeHierarchy(rootNode: THREE.Object3D, preserveMaterials = false) {
  rootNode.traverse((child) => {
    const mesh = child as THREE.Mesh;
    
    // 1. Deallocate Geometry Buffers
    if (mesh.geometry && !mesh.userData?.isSharedGeometry) {
      mesh.geometry.dispose();
    }
    
    // 2. Deallocate Materials and Bound Textures
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

  // 3. Detach child nodes from scene graph
  while (rootNode.children.length > 0) {
    const child = rootNode.children[0];
    rootNode.remove(child);
  }
}
```

### Complete Component Cleanup Lifecycle

When `ThreeModelViewer` or `ModelViewer3D` unmounts or leaves the viewport, the cleanup hook executes in precise order:

```typescript
return () => {
  // 1. Halt the continuous animation loop
  isLoopRunning = false;
  if (animationFrameIdRef.current !== null) {
    cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = null;
  }

  // 2. Disconnect DOM observers & window event listeners
  resizeObserver.disconnect();
  domEl.removeEventListener('webglcontextlost', handleContextLost);
  domEl.removeEventListener('webglcontextrestored', handleContextRestored);
  domEl.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  domEl.removeEventListener('wheel', onWheel);

  // 3. Remove canvas element from DOM
  if (container.contains(domEl)) {
    container.removeChild(domEl);
  }

  // 4. Recursively purge GPU VRAM
  disposeHierarchy(scene);
  renderer.dispose();

  // 5. Force WebGL driver context destruction (in transient viewers)
  renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();

  // 6. Clear internal object references
  sceneRef.current = null;
  rendererRef.current = null;
  meshGroupRef.current = null;
  cameraRef.current = null;
  materialRef.current = null;
};
```

---

## 4. Viewport Optimization: Lazy Loading via IntersectionObserver

To prevent GPU overloading when displaying dozens of 3D models across the catalog (`ExploreView`, `ProductDetailView`, `AssetLibraryView`), VCUBE wraps all Three.js renderers with an `IntersectionObserver` via the custom hook `useInViewport`.

### Hook Implementation (`src/frontend/hooks/useInViewport.ts`)

```typescript
export function useInViewport<T extends HTMLElement>(
  targetRef: RefObject<T | null>,
  options: InViewportOptions = { rootMargin: '100px', threshold: 0 }
): boolean {
  const { rootMargin = '100px', threshold = 0 } = options;

  const [isInViewport, setIsInViewport] = useState<boolean>(() => {
    return typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsInViewport(true);
      return;
    }

    const element = targetRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [targetRef, rootMargin]);

  return isInViewport;
}
```

### Operational Behavior
- **Buffer Zone ($\pm 100\text{px}$)**: The observer initiates canvas mounting and WebGL context creation $100\text{px}$ before the component enters the visible screen area, ensuring smooth scrolling without visual popping.
- **Standby State**: When outside the viewport, `ThreeModelViewer` renders an ultra-lightweight SVG wireframe placeholder without allocating a WebGL context or running an animation loop.
- **Unmounting On Exit**: When a card is scrolled out of the viewport buffer, the component cleanly disposes of its renderer, scene, and geometries, releasing GPU VRAM immediately.

---

## 5. WebGL Context Loss Finite State Machine (FSM)

Mobile browsers, low-end GPUs, and laptops waking from sleep frequently terminate WebGL contexts (`webglcontextlost`) to recover system resources. Typical web applications crash with a blank canvas requiring a hard page refresh. VCUBE implements a 3-State FSM that recovers automatically.

### FSM State Transition Diagram

```
                 +-------------------+
                 |                   |
                 |      ACTIVE       |<-------------------------+
                 |  (Rendering 60fps)|                          |
                 |                   |                          |
                 +---------+---------+                          |
                           |                                    |
                           | WebGL context lost event           | WebGL context restored event
                           | (webglcontextlost)                 | (webglcontextrestored)
                           v                                    | or Manual Retry
                 +-------------------+                          |
                 |                   |                          |
                 |   CONTEXT_LOST    |                          |
                 |  (Loop cancelled, |                          |
                 |   Overlay shown)  |                          |
                 |                   |                          |
                 +---------+---------+                          |
                           |                                    |
                           | Browser triggers restore           |
                           v                                    |
                 +-------------------+                          |
                 |                   |                          |
                 |    RECOVERING     |--------------------------+
                 |  (Increment epoch,|
                 |   rebuild scene)  |
                 |                   |
                 +-------------------+
```

### State Definitions & Lifecycle Actions

1. **`ACTIVE`**:
   - WebGL renderer is functioning normally.
   - Render loop is active (`requestAnimationFrame` cycling at 60 FPS).
   - Telemetry computes live frame rates.
2. **`CONTEXT_LOST`**:
   - Triggered by `webglcontextlost` on `renderer.domElement`.
   - **Crucial Action**: Must call `event.preventDefault()`; otherwise, the browser permanently destroys the context and refuses restoration.
   - Render loop is stopped (`isLoopRunning = false`, `cancelAnimationFrame`).
   - UI presents a recovery overlay with a pulsating status badge: *"Trạng thái: Mất ngữ cảnh GPU (Đang chờ khôi phục)"*.
3. **`RECOVERING`**:
   - Triggered by `webglcontextrestored` or user clicking *"Khôi phục thủ công ngay"*.
   - Increments `contextEpoch` (`setContextEpoch(prev => prev + 1)`).
   - The React `useEffect` hooks governing WebGL scene initialization and geometry creation take `contextEpoch` in their dependency arrays:
     ```typescript
     useEffect(() => {
       // Rebuild Scene, Lights, Camera, Controls, and WebGLRenderer
       ...
       setWebglState('ACTIVE');
     }, [bed?.x, bed?.y, bed?.z, contextEpoch]);

     useEffect(() => {
       // Rebuild Model Geometry, Stencils, and Bounding Box
       ...
     }, [customGeometry, customObjectGroup, modelType, parts.length, contextEpoch]);
     ```
   - All geometries and scene graphs re-instantiate seamlessly without losing the user's custom transformations or material selections.

---

## 6. Web Worker CAD Parser with OpenCASCADE WASM Kernel

Mechanical engineering workflows rely heavily on B-Rep CAD formats (`.step`, `.stp`, `.iges`, `.igs`). Parsing B-Rep curves and topological surfaces directly on the main browser thread causes interface freezes lasting 5 to 30 seconds, often triggering "Page Unresponsive" browser dialogs.

VCUBE offloads this heavy computation to a dedicated Web Worker (`src/workers/cadParser.worker.ts`) incorporating an OpenCASCADE WebAssembly build (`occt-import-js`).

### Worker Execution Architecture

```
Main UI Thread                                              Dedicated Web Worker
+------------------------+                               +------------------------+
| User drops .step file  |                               | cadParser.worker.ts    |
+-----------+------------+                               +-----------+------------+
            |                                                        |
            | ArrayBuffer via postMessage (Transferable)             |
            +------------------------------------------------------->|
                                                                     |
                                                                     v
                                                         +------------------------+
                                                         | occt-import-js WASM    |
                                                         | ReadStepFile() /       |
                                                         | ReadIgesFile()         |
                                                         +-----------+------------+
                                                                     |
                                                                     v
                                                         +------------------------+
                                                         | Extract Mesh Indices & |
                                                         | Vertex Arrays          |
                                                         +-----------+------------+
                                                                     |
                                                                     v
                                                         +------------------------+
                                                         | Gauss Divergence Thm   |
                                                         | Volume = ∑ (v1.(v2xv3))|
                                                         +-----------+------------+
                                                                     |
            | postMessage({ positions, normals, volume })            |
            |<-------------------------------------------------------+
            | (Zero-Copy Transferable Typed Arrays)
            v
+------------------------+
| Reconstruct into       |
| THREE.BufferGeometry   |
+------------------------+
```

### Mathematical Formulations

#### 1. Analytic Volume via Gauss Divergence Theorem
The exact volume enclosed by the extracted triangular mesh is computed by decomposing the mesh into signed tetrahedra projected from the coordinate origin $(0, 0, 0)$:

$$V = \frac{1}{6} \left| \sum_{i=1}^{N} \mathbf{v}_{1,i} \cdot \left( \mathbf{v}_{2,i} \times \mathbf{v}_{3,i} \right) \right|$$

In scalar worker code:
```typescript
const crossX = v2y * v3z - v2z * v3y;
const crossY = v2z * v3x - v2x * v3z;
const crossZ = v2x * v3y - v2y * v3x;
signedVolumeSum += (v1x * crossX + v1y * crossY + v1z * crossZ);
...
const volumeMm3 = Math.abs(signedVolumeSum / 6);
const volumeCm3 = Number((volumeMm3 / 1000).toFixed(2));
```

#### 2. Surface Area Summation
Total exterior surface area is determined by summing the cross-product magnitudes of the triangle edge vectors:

$$A = \frac{1}{2} \sum_{i=1}^{N} \left| (\mathbf{v}_{2,i} - \mathbf{v}_{1,i}) \times (\mathbf{v}_{3,i} - \mathbf{v}_{1,i}) \right|$$

In scalar worker code:
```typescript
const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
const cx = ay * bz - az * by;
const cy = az * bx - ax * bz;
const cz = ax * by - ay * bx;
surfaceAreaSum += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
...
const surfaceAreaCm2 = Number((surfaceAreaSum / 100).toFixed(2));
```

#### 3. Zero-Copy Inter-Process Communication
To prevent memory duplication during IPC transmission, typed arrays are transferred as transferable buffers:
```typescript
(self as any).postMessage(result, [result.positions.buffer, result.normals.buffer]);
```

---

## 7. Mesh Parser & Geometric Defect Analysis (`src/utils/meshParser.ts`)

The main thread parser `meshParser.ts` orchestrates file format ingestion, defect detection, and slicer preset extraction.

### Supported Formats & Extraction Methods

| Format | Parsing Engine | Capabilities Extracted |
|---|---|---|
| `.3mf` | Native JSZip + XML DOM (Fallback: `ThreeMFLoader`) | Multi-part assemblies, AMS filament palettes, slice layer heights, bed temps, and print time predictions |
| `.stl` | Web Worker (`>2MB`) / `STLLoader` (`<=2MB`) | Binary / ASCII facet decoding, topological vertex welding |
| `.obj` | `OBJLoader` | Wavefront multi-group meshes, world transformation matrices |
| `.step`, `.stp` | OpenCASCADE WASM via Web Worker | Analytic B-Rep NURBS surface conversion to BufferGeometry |
| `.iges`, `.igs` | OpenCASCADE WASM via Web Worker | IGES surface entity conversion to BufferGeometry |

### Defect Analysis & Printability Checks

Every imported geometry undergoes automated verification before quotation:

1. **Watertightness & Non-Manifold Edges**:
   - Every edge in a 2-manifold closed surface must be shared by exactly **two** triangular faces with opposing traversal directions.
   - Edges shared by 1 face denote holes (boundary edges). Edges shared by $>2$ faces denote internal self-intersections (non-manifold).
2. **Inverted Normals**:
   - Detected by evaluating face winding order against the signed divergence volume. Faces with normals oriented inward produce negative tetrahedral contributions.
3. **Minimum Wall Thickness Measurement**:
   - Evaluated using raycasting against interior surfaces under a strict computation ray budget (`THICKNESS_RAY_BUDGET = 24`). If rays detect opposing walls $<0.8\text{ mm}$, a `THIN_WALL` warning is raised.
4. **Overhang Angle Analysis**:
   - Evaluates face normal angle $\theta$ relative to the negative Z-axis $[0, -1, 0]$. Faces where $\theta > 45^\circ$ require support structures.

### Data Honesty Rules on Parse Errors (`MeshParseError`)
Under `docs/design/data-honesty.md`, legacy behavior that replaced corrupted STL files with a generic $85 \times 32 \times 60\text{ mm}$ box geometry is strictly abolished:
```typescript
if (!rawGeometry) {
  throw new MeshParseError(
    'corrupt_file',
    file.name,
    'Không đọc được cấu trúc STL. Hệ thống KHÔNG tạo dữ liệu thay thế cho tệp này.'
  );
}
```
If a file cannot be read, the pipeline halts with a typed `MeshParseError`, guaranteeing that no fraudulent quotation or fabricated geometry is ever presented to the customer.
