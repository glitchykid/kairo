import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { PRIMITIVE_COLOR, WIREFRAME_COLOR, POLYGON_EDGE_COLOR } from './constants'

type DisplayMode = 'solid' | 'wireframe'

/**
 * Angle threshold (degrees) used with EdgesGeometry for **built-in primitives**.
 * Hides internal triangle diagonals on flat faces (coplanar triangles share
 * a 0° angle, so any threshold > 0 suppresses them).
 *
 * Imported models always use threshold 0 so every polygon edge is visible
 * regardless of triangle topology — matching Blender-style behaviour.
 */
const EDGE_THRESHOLD_ANGLE = 1

/** Screen-space line width for edge overlays (CSS pixels). */
const EDGE_LINE_WIDTH = 1.5

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Material helpers                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * Enables polygonOffset so filled faces sit behind coplanar lines.
 */
function ensurePolygonOffset(mat: THREE.Material): void {
  mat.polygonOffset = true
  mat.polygonOffsetFactor = 1
  mat.polygonOffsetUnits = 1
}

/**
 * Applies display mode to a single material.
 *
 * In wireframe mode the mesh is made nearly invisible — native
 * `material.wireframe` is never used because it exposes triangle
 * diagonals.  Edge overlays (built from EdgesGeometry with an angle
 * threshold) provide the clean quad-edge wireframe instead.
 */
function applyModeToMaterial(
  mat: THREE.Material,
  isWireframe: boolean,
  originalColor?: number,
): void {
  ensurePolygonOffset(mat)

  /* Never use native GL wireframe (shows triangles). */
  if ('wireframe' in mat) {
    ;(mat as THREE.MeshStandardMaterial).wireframe = false
  }

  if (isWireframe) {
    mat.transparent = true
    mat.opacity = 0.03
    if ('emissive' in mat && mat.emissive instanceof THREE.Color) {
      mat.emissive.setHex(0x000000)
    }
  } else {
    mat.transparent = false
    mat.opacity = 1.0
    if ('color' in mat && mat.color instanceof THREE.Color) {
      mat.color.setHex(originalColor ?? PRIMITIVE_COLOR)
    }
  }

  mat.needsUpdate = true
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Display mode                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * Applies wireframe / solid display mode to all meshes.
 */
export function applyDisplayMode(
  displayMode: DisplayMode,
  primitiveMeshes: Map<string, THREE.Mesh>,
  importedObjects: Map<string, THREE.Object3D>,
): void {
  const isWireframe = displayMode === 'wireframe'

  primitiveMeshes.forEach((mesh) => {
    if (mesh.material instanceof THREE.Material) {
      applyModeToMaterial(mesh.material, isWireframe, PRIMITIVE_COLOR)
    } else if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => applyModeToMaterial(mat, isWireframe, PRIMITIVE_COLOR))
    }
  })

  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material
        if (mat instanceof THREE.Material) {
          applyModeToMaterial(mat, isWireframe)
        } else if (Array.isArray(mat)) {
          mat.forEach((m) => applyModeToMaterial(m, isWireframe))
        }
      }
    })
  })
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Edge overlays (anti-aliased fat lines)                                */
/* ═══════════════════════════════════════════════════════════════════════ */

/** Dispose all geometries / materials in a helper group before clearing. */
function disposeHelperGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if ('geometry' in child) {
      ;(child as THREE.Mesh).geometry?.dispose()
    }
    if ('material' in child) {
      const mat = (child as THREE.Mesh).material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat instanceof THREE.Material) mat.dispose()
    }
  })
  group.clear()
}

function addEdgeLinesForMesh(
  mesh: THREE.Mesh,
  edgeHelpers: THREE.Group,
  material: LineMaterial,
  useWorldTransform: boolean,
  thresholdAngle: number = 0,
): void {
  if (!(mesh.geometry instanceof THREE.BufferGeometry)) return

  try {
    const edgesGeom = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle)
    const posAttr = edgesGeom.getAttribute('position') as THREE.BufferAttribute | null
    if (!posAttr) {
      edgesGeom.dispose()
      return
    }

    const lineGeom = new LineSegmentsGeometry()
    lineGeom.setPositions(posAttr.array as Float32Array)
    edgesGeom.dispose()

    const line = new LineSegments2(lineGeom, material.clone())
    if (useWorldTransform) {
      const wp = new THREE.Vector3()
      const wq = new THREE.Quaternion()
      const ws = new THREE.Vector3()
      mesh.getWorldPosition(wp)
      mesh.getWorldQuaternion(wq)
      mesh.getWorldScale(ws)
      line.position.copy(wp)
      line.quaternion.copy(wq)
      line.scale.copy(ws)
    } else {
      line.position.copy(mesh.position)
      line.rotation.copy(mesh.rotation)
      line.scale.copy(mesh.scale)
    }
    line.renderOrder = 1
    edgeHelpers.add(line)
  } catch (err) {
    console.error('Edge overlay error for mesh', mesh.name, err)
  }
}

/**
 * Rebuilds the edge overlay group.
 *
 * - In **wireframe** mode edges are always shown (all objects, wireframe colour).
 * - In **solid** mode edges are shown only when `showPolygonEdges` is true
 *   (respecting selection filter).
 */
export function updatePolygonEdgesDisplay(
  displayMode: DisplayMode,
  showPolygonEdges: boolean,
  selectedObjectId: string | null | undefined,
  selectedIsPrimitive: boolean | undefined,
  selectedIsLight: boolean | undefined,
  primitiveMeshes: Map<string, THREE.Mesh>,
  importedObjects: Map<string, THREE.Object3D>,
  edgeHelpers: THREE.Group,
  resolution: THREE.Vector2,
): void {
  disposeHelperGroup(edgeHelpers)

  const showEdges = displayMode === 'wireframe' || showPolygonEdges
  if (!showEdges) return

  const color = displayMode === 'wireframe' ? WIREFRAME_COLOR : POLYGON_EDGE_COLOR
  const edgeMaterial = new LineMaterial({
    color,
    linewidth: EDGE_LINE_WIDTH,
    depthTest: true,
    depthWrite: false,
  })
  edgeMaterial.resolution.copy(resolution)

  const hasSelection = selectedObjectId && !selectedIsLight
  const showAll = displayMode === 'wireframe' || !hasSelection

  if (showAll) {
    primitiveMeshes.forEach((mesh) =>
      addEdgeLinesForMesh(mesh, edgeHelpers, edgeMaterial, false, EDGE_THRESHOLD_ANGLE),
    )
    importedObjects.forEach((object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh)
          addEdgeLinesForMesh(child, edgeHelpers, edgeMaterial, true, 0)
      })
    })
  } else {
    if (selectedIsPrimitive) {
      const mesh = primitiveMeshes.get(selectedObjectId!)
      if (mesh) addEdgeLinesForMesh(mesh, edgeHelpers, edgeMaterial, false, EDGE_THRESHOLD_ANGLE)
    } else {
      const obj = importedObjects.get(selectedObjectId!)
      if (obj) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh)
            addEdgeLinesForMesh(child, edgeHelpers, edgeMaterial, true, 0)
        })
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Vertex overlays                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */

function addVertexPointsForMesh(
  mesh: THREE.Mesh,
  vertexHelpers: THREE.Group,
  pointMaterial: THREE.PointsMaterial,
  useWorldTransform: boolean,
): void {
  const positions = mesh.geometry?.attributes?.position
  if (!positions) return

  const points = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', positions.clone()),
    pointMaterial.clone(),
  )
  if (useWorldTransform) {
    const wp = new THREE.Vector3()
    const wq = new THREE.Quaternion()
    const ws = new THREE.Vector3()
    mesh.getWorldPosition(wp)
    mesh.getWorldQuaternion(wq)
    mesh.getWorldScale(ws)
    points.position.copy(wp)
    points.rotation.setFromQuaternion(wq)
    points.scale.copy(ws)
  } else {
    points.position.copy(mesh.position)
    points.rotation.copy(mesh.rotation)
    points.scale.copy(mesh.scale)
  }
  vertexHelpers.add(points)
}

/**
 * Updates vertices display on the given vertexHelpers group.
 */
export function updateVerticesDisplay(
  showVertices: boolean,
  selectedObjectId: string | null | undefined,
  selectedIsPrimitive: boolean | undefined,
  selectedIsLight: boolean | undefined,
  primitiveMeshes: Map<string, THREE.Mesh>,
  importedObjects: Map<string, THREE.Object3D>,
  vertexHelpers: THREE.Group,
): void {
  disposeHelperGroup(vertexHelpers)
  if (!showVertices) return

  const hasSelection = selectedObjectId && !selectedIsLight
  const pointMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 4,
    sizeAttenuation: false,
  })

  if (hasSelection) {
    if (selectedIsPrimitive) {
      const mesh = primitiveMeshes.get(selectedObjectId!)
      if (mesh) addVertexPointsForMesh(mesh, vertexHelpers, pointMaterial, false)
    } else {
      const obj = importedObjects.get(selectedObjectId!)
      if (obj) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh)
            addVertexPointsForMesh(child, vertexHelpers, pointMaterial, true)
        })
      }
    }
  } else {
    primitiveMeshes.forEach((mesh) =>
      addVertexPointsForMesh(mesh, vertexHelpers, pointMaterial, false),
    )
    importedObjects.forEach((object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh)
          addVertexPointsForMesh(child, vertexHelpers, pointMaterial, true)
      })
    })
  }
}
