<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { PrimitiveType, SceneEntity } from '@/core/scene/types'
import { loadImportedModelObject } from '@/features/editor/services/model-import'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'
import {
  alignObjectToGround,
  applyDisplayMode,
  applyMaterialsForLighting,
  disposeObject3D,
  getPrimitiveYOffset,
  makeGeometryForPrimitive,
  makeLightBillboard,
  PRIMITIVE_COLOR,
  SELECTION_BOX_COLOR,
  updatePolygonEdgesDisplay as doUpdatePolygonEdgesDisplay,
  updateVerticesDisplay as doUpdateVerticesDisplay,
} from '@/features/viewport'
import { useI18n } from '@/localization/i18n'
import ViewportContextMenu from './ViewportContextMenu.vue'
import ViewportToolbar from './ViewportToolbar.vue'

/* ── Constants ──────────────────────────────────────────────────────────── */
const DEFAULT_CAMERA_SPEED = 6.5
const CAMERA_SPEED_MIN = 1
const CAMERA_SPEED_MAX = 20
const CAMERA_SPEED_STEP = 0.5
const TRANSFORM_SAVE_DEBOUNCE_MS = 100
const MOUSE_DRAG_THRESHOLD_SQ = 16
const GRID_SIZE = 200
const GRID_DIVISIONS = 200
const GRID_COLOR_PRIMARY = 0x6f7782
const GRID_COLOR_SECONDARY = 0x3d434c
const AXES_HELPER_SIZE = 1.25
const GIZMO_RESOLUTION = 92
const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

/* ── Props & Emits ─────────────────────────────────────────────────────── */
const props = defineProps<{
  sceneData: SceneEntity
  importedAssets: ImportedModelAsset[]
  selectedObjectId?: string | null
  selectedIsPrimitive?: boolean
  selectedIsLight?: boolean
}>()

const emit = defineEmits<{
  (event: 'request-add-primitive', primitiveType: PrimitiveType): void
  (event: 'request-add-light'): void
  (event: 'request-import-model'): void
  (event: 'select-object', objectId: string | null, isPrimitive: boolean, isLight?: boolean): void
  (
    event: 'update-node-position',
    nodeId: string,
    position: { x: number; y: number; z: number },
  ): void
  (event: 'update-node-scale', nodeId: string, scale: { x: number; y: number; z: number }): void
  (
    event: 'update-node-rotation',
    nodeId: string,
    rotation: { x: number; y: number; z: number },
  ): void
  (
    event: 'update-light-position',
    lightId: string,
    position: { x: number; y: number; z: number },
  ): void
  (
    event: 'update-imported-position',
    assetId: string,
    position: { x: number; y: number; z: number },
  ): void
  (
    event: 'update-imported-scale',
    assetId: string,
    scale: { x: number; y: number; z: number },
  ): void
  (
    event: 'update-imported-rotation',
    assetId: string,
    rotation: { x: number; y: number; z: number },
  ): void
}>()

const { t } = useI18n()

/* ── Template refs ─────────────────────────────────────────────────────── */
const viewportRoot = ref<HTMLElement | null>(null)
const canvasHost = ref<HTMLElement | null>(null)
const gizmoHost = ref<HTMLElement | null>(null)

/* ── Three.js core objects ─────────────────────────────────────────────── */
const scene = new THREE.Scene()
const perspCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 2500)
const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.01, 2500)
let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspCamera
const primitiveGroup = new THREE.Group()
const importedGroup = new THREE.Group()
const lightGroup = new THREE.Group()
const sceneLightsGroup = new THREE.Group()
const axesScene = new THREE.Scene()
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
const defaultCameraPosition = new THREE.Vector3(8, 9, 8)
const upAxis = new THREE.Vector3(0, 1, 0)
const clock = new THREE.Clock()
const gridHelper = new THREE.GridHelper(
  GRID_SIZE,
  GRID_DIVISIONS,
  GRID_COLOR_PRIMARY,
  GRID_COLOR_SECONDARY,
)
const vertexHelpers = new THREE.Group()
const edgeHelpers = new THREE.Group()

scene.background = new THREE.Color('#101317')
scene.add(primitiveGroup)
scene.add(importedGroup)
scene.add(sceneLightsGroup)
scene.add(lightGroup)
scene.add(gridHelper)

/* Axes helper: always render on top so it is never occluded by meshes */
const axesHelper = new THREE.AxesHelper(AXES_HELPER_SIZE)
axesHelper.renderOrder = 999
axesHelper.material.depthTest = false
scene.add(axesHelper)

scene.add(vertexHelpers)
scene.add(edgeHelpers)

perspCamera.position.copy(defaultCameraPosition)
perspCamera.lookAt(0, 0, 0)
orthoCamera.position.copy(defaultCameraPosition)
orthoCamera.lookAt(0, 0, 0)
orthoCamera.zoom = 5
axesScene.add(new THREE.AxesHelper(AXES_HELPER_SIZE))

/* ── Object registries ─────────────────────────────────────────────────── */
const keyState = new Set<string>()
const primitiveMeshes = new Map<string, THREE.Mesh>()
const importedObjects = new Map<string, THREE.Object3D>()
const lightObjects = new Map<string, THREE.Object3D>()
const sceneLights = new Map<string, THREE.DirectionalLight>()
const loadingImports = new Set<string>()

/* ── Reactive UI state ─────────────────────────────────────────────────── */
const cameraMovementSpeed = ref(DEFAULT_CAMERA_SPEED)
const cameraType = ref<'perspective' | 'orthographic'>('perspective')
const displayMode = ref<'solid' | 'wireframe'>('solid')
const showPolygonEdges = ref(false)
const polygonCount = ref(0)
const showGrid = ref(true)
const showVertices = ref(false)
const showPolygonCount = ref(true)
const showCameraSpeed = ref(true)
const showAxes = ref(true)
const selectedObject = ref<THREE.Object3D | null>(null)
const currentSelectedId = ref<string | null>(null)
const isPrimitive = ref(false)
const isLight = ref(false)

let polygonCountDirty = true
let isSyncingImports = false

/* ── Selection helper (BoxHelper outline) ──────────────────────────────── */
let selectionHelper: THREE.BoxHelper | null = null

/* ── Context menu state ────────────────────────────────────────────────── */
const contextMenu = reactive({ visible: false, x: 0, y: 0 })

const leftMouseState = reactive({
  isDown: false,
  moved: false,
  startX: 0,
  startY: 0,
})

const rightMouseState = reactive({
  isDown: false,
  moved: false,
  startX: 0,
  startY: 0,
  suppressContextMenu: false,
})

let pendingPickEvent: PointerEvent | null = null

/* ── Reusable objects (avoid per-frame / per-call allocations) ────────── */
const _raycaster = new THREE.Raycaster()
const _mouse = new THREE.Vector2()
const _moveDirection = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _edgeResolution = new THREE.Vector2(1, 1)

/* ── Renderer & controls refs (assigned on mount) ──────────────────────── */
let renderer: THREE.WebGLRenderer | null = null
let axesRenderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let transformControls: TransformControls | null = null
let transformUpdateTimeout: number | null = null
let frameId = 0

/* ── Event handler refs (for cleanup) ──────────────────────────────────── */
let pointerDownHandler: ((e: PointerEvent) => void) | null = null
let pointerMoveHandler: ((e: PointerEvent) => void) | null = null
let pointerUpHandler: ((e: PointerEvent) => void) | null = null
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null
let keyUpHandler: ((e: KeyboardEvent) => void) | null = null
let blurHandler: (() => void) | null = null
let clickOutsideHandler: ((e: PointerEvent) => void) | null = null
let wheelHandler: ((e: WheelEvent) => void) | null = null

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Helper: shared display-refresh (DRY)                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

function hasLights(): boolean {
  return (props.sceneData.lights?.length ?? 0) > 0
}

/** Re-applies materials, display mode, vertices, and polygon edges. */
function refreshSceneDisplay(): void {
  applyMaterialsForLighting(hasLights(), primitiveMeshes, importedObjects, sceneLightsGroup)
  applyDisplayMode(displayMode.value, primitiveMeshes, importedObjects)
  updateVerticesDisplay()
  updatePolygonEdgesDisplay()
}

function markPolygonCountDirty(): void {
  polygonCountDirty = true
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Selection                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

function updateSelectionHelper(object: THREE.Object3D | null): void {
  if (selectionHelper) {
    scene.remove(selectionHelper)
    selectionHelper.dispose()
    selectionHelper = null
  }
  if (object) {
    selectionHelper = new THREE.BoxHelper(object, SELECTION_BOX_COLOR)
    scene.add(selectionHelper)
  }
}

function selectObject(
  object: THREE.Object3D | null,
  objectId: string | null,
  primitive: boolean,
  light = false,
): void {
  selectedObject.value = object
  currentSelectedId.value = objectId
  isPrimitive.value = primitive
  isLight.value = light

  updateSelectionHelper(object)

  if (transformControls) {
    object ? transformControls.attach(object) : transformControls.detach()
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Overlay helpers                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */

function updatePolygonEdgesDisplay(): void {
  doUpdatePolygonEdgesDisplay(
    displayMode.value,
    showPolygonEdges.value,
    props.selectedObjectId,
    props.selectedIsPrimitive,
    props.selectedIsLight,
    primitiveMeshes,
    importedObjects,
    edgeHelpers,
    _edgeResolution,
  )
}

function updateVerticesDisplay(): void {
  doUpdateVerticesDisplay(
    showVertices.value,
    props.selectedObjectId,
    props.selectedIsPrimitive,
    props.selectedIsLight,
    primitiveMeshes,
    importedObjects,
    vertexHelpers,
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Polygon count                                                         */
/* ═══════════════════════════════════════════════════════════════════════ */

function calculatePolygonCount(): number {
  let count = 0
  const countGeometry = (geom: THREE.BufferGeometry) => {
    const idx = geom.index
    if (idx) {
      count += idx.count / 3
    } else {
      const pos = geom.attributes.position
      if (pos) count += pos.count / 3
    }
  }

  primitiveMeshes.forEach((mesh) => {
    if (mesh.geometry instanceof THREE.BufferGeometry) countGeometry(mesh.geometry)
  })
  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        countGeometry(child.geometry)
      }
    })
  })
  return Math.floor(count)
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Primitives sync                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */

function makePrimitiveMesh(nodeId: string, primitiveType: PrimitiveType): THREE.Mesh {
  const geometry = makeGeometryForPrimitive(primitiveType)
  const material = new THREE.MeshBasicMaterial({
    color: PRIMITIVE_COLOR,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = nodeId
  return mesh
}

function syncPrimitiveNodes(): void {
  const nodeIds = new Set(props.sceneData.nodes.map((n) => n.id))

  primitiveMeshes.forEach((mesh, nodeId) => {
    if (nodeIds.has(nodeId)) return
    /* Clear selection BEFORE dispose to prevent NaN from stale BoxHelper / TransformControls */
    if (currentSelectedId.value === nodeId) {
      selectObject(null, null, false, false)
      emit('select-object', null, false, false)
    }
    primitiveGroup.remove(mesh)
    disposeObject3D(mesh)
    primitiveMeshes.delete(nodeId)
  })

  props.sceneData.nodes.forEach((node) => {
    let mesh = primitiveMeshes.get(node.id)
    if (!mesh) {
      mesh = makePrimitiveMesh(node.id, node.primitive)
      primitiveMeshes.set(node.id, mesh)
      primitiveGroup.add(mesh)
    }

    const yOffset = getPrimitiveYOffset(node.primitive)
    mesh.position.set(node.position.x, node.position.y + yOffset, node.position.z)

    // Apply scale
    const s = node.scale ?? { x: 1, y: 1, z: 1 }
    mesh.scale.set(s.x, s.y, s.z)

    // Apply rotation (stored in degrees)
    const r = node.rotation ?? { x: 0, y: 0, z: 0 }
    mesh.rotation.set(r.x * DEG2RAD, r.y * DEG2RAD, r.z * DEG2RAD)
  })

  markPolygonCountDirty()
  refreshSceneDisplay()

  if (selectedObject.value && currentSelectedId.value && isPrimitive.value) {
    const mesh = primitiveMeshes.get(currentSelectedId.value)
    if (mesh) selectObject(mesh, currentSelectedId.value, true, false)
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Lights sync                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

function syncLights(): void {
  const lights = props.sceneData.lights ?? []
  const lightIds = new Set(lights.map((l) => l.id))

  lightObjects.forEach((obj, id) => {
    if (lightIds.has(id)) return
    /* Clear selection BEFORE dispose to prevent NaN from stale BoxHelper */
    if (currentSelectedId.value === id) {
      selectObject(null, null, false, false)
      emit('select-object', null, false, false)
    }
    lightGroup.remove(obj)
    disposeObject3D(obj)
    lightObjects.delete(id)
  })

  sceneLights.forEach((light, id) => {
    if (lightIds.has(id)) return
    sceneLightsGroup.remove(light)
    light.dispose()
    sceneLights.delete(id)
  })

  lights.forEach((light) => {
    let obj = lightObjects.get(light.id)
    if (!obj) {
      obj = makeLightBillboard(light.id)
      lightObjects.set(light.id, obj)
      lightGroup.add(obj)
    }
    obj.position.set(light.position.x, light.position.y, light.position.z)

    let threeLight = sceneLights.get(light.id)
    if (!threeLight) {
      threeLight = new THREE.DirectionalLight(0xffffff, 1)
      threeLight.castShadow = false
      sceneLights.set(light.id, threeLight)
      sceneLightsGroup.add(threeLight)
    }
    threeLight.position.set(light.position.x, light.position.y, light.position.z)
    threeLight.target.position.set(0, 0, 0)
    threeLight.target.updateMatrixWorld()
  })

  applyMaterialsForLighting(lights.length > 0, primitiveMeshes, importedObjects, sceneLightsGroup)
  applyDisplayMode(displayMode.value, primitiveMeshes, importedObjects)

  if (selectedObject.value && currentSelectedId.value && isLight.value) {
    const obj = lightObjects.get(currentSelectedId.value)
    if (obj) selectObject(obj, currentSelectedId.value, false, true)
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Imported assets sync                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

async function syncImportedAssets(): Promise<void> {
  if (isSyncingImports) return
  isSyncingImports = true
  try {
    const activeAssetIds = new Set(props.importedAssets.map((a) => a.id))
    let removedAny = false

    importedObjects.forEach((object, assetId) => {
      if (activeAssetIds.has(assetId)) return
      /* Clear selection BEFORE dispose to prevent NaN from stale BoxHelper */
      if (currentSelectedId.value === assetId) {
        selectObject(null, null, false, false)
        emit('select-object', null, false, false)
      }
      importedGroup.remove(object)
      disposeObject3D(object)
      importedObjects.delete(assetId)
      removedAny = true
    })

    if (removedAny) {
      markPolygonCountDirty()
      refreshSceneDisplay()
    }

    for (const asset of props.importedAssets) {
      if (importedObjects.has(asset.id) || loadingImports.has(asset.id)) continue

      loadingImports.add(asset.id)
      try {
        const model = await loadImportedModelObject(asset)
        model.name = asset.name
        alignObjectToGround(model)
        importedObjects.set(asset.id, model)
        importedGroup.add(model)
        markPolygonCountDirty()
        refreshSceneDisplay()

        if (
          props.selectedObjectId &&
          !props.selectedIsPrimitive &&
          props.selectedObjectId === asset.id
        ) {
          selectObject(model, asset.id, false, false)
        }
      } catch (error) {
        console.error(`Failed to import model "${asset.name}"`, error)
      } finally {
        loadingImports.delete(asset.id)
      }
    }
  } finally {
    isSyncingImports = false
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Camera & rendering                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

function updateAxesCamera(): void {
  if (!controls) return
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
  offset.normalize().multiplyScalar(4)
  axesCamera.position.copy(offset)
  axesCamera.lookAt(0, 0, 0)
}

function isViewportActive(): boolean {
  return document.activeElement === viewportRoot.value
}

function applyKeyboardMovement(deltaSeconds: number): void {
  if (!controls || !isViewportActive()) return

  _moveDirection.set(0, 0, 0)

  /* Full 3D camera direction — W/S fly toward / away from where the camera looks */
  camera.getWorldDirection(_forward)

  /* Strafe vector stays horizontal regardless of camera pitch */
  _right.crossVectors(_forward, upAxis).normalize()

  if (keyState.has('KeyW')) _moveDirection.add(_forward)
  if (keyState.has('KeyS')) _moveDirection.sub(_forward)
  if (keyState.has('KeyA')) _moveDirection.sub(_right)
  if (keyState.has('KeyD')) _moveDirection.add(_right)
  if (keyState.has('Space')) _moveDirection.y += 1
  if (keyState.has('ShiftLeft') || keyState.has('ShiftRight')) _moveDirection.y -= 1

  if (_moveDirection.lengthSq() === 0) return

  _moveDirection.normalize()
  const distance = deltaSeconds * cameraMovementSpeed.value
  _moveDirection.multiplyScalar(distance)
  camera.position.add(_moveDirection)
  controls.target.add(_moveDirection)
}

/** Synchronise the orthographic frustum with the current canvas aspect. */
function updateOrthoFrustum(w: number, h: number): void {
  const aspect = w / h
  const halfH = 10 / orthoCamera.zoom
  const halfW = halfH * aspect
  orthoCamera.left = -halfW
  orthoCamera.right = halfW
  orthoCamera.top = halfH
  orthoCamera.bottom = -halfH
  orthoCamera.updateProjectionMatrix()
}

/** Switch between perspective and orthographic projection. */
function switchCameraType(type: 'perspective' | 'orthographic'): void {
  if (!controls || !transformControls || !renderer) return

  /* Guard: compare against the actual camera, not the ref (the ref is
     already updated by the time the watcher fires). */
  const alreadyCurrent =
    (type === 'perspective' && camera === perspCamera) ||
    (type === 'orthographic' && camera === orthoCamera)
  if (alreadyCurrent) return

  const target = controls.target.clone()
  const position = camera.position.clone()
  const distance = position.distanceTo(target)
  const canvas = renderer.domElement

  if (type === 'orthographic') {
    orthoCamera.position.copy(position)
    orthoCamera.quaternion.copy(camera.quaternion)
    /* Match the ortho frustum to the perspective camera's visible area at
       the orbit target so the scene looks the same size after switching. */
    const halfFov = (perspCamera.fov * Math.PI) / 360
    const visibleHalfH = Math.max(distance, 0.1) * Math.tan(halfFov)
    orthoCamera.zoom = 10 / visibleHalfH // 10 = base frustum half-height
    updateOrthoFrustum(canvas.clientWidth, canvas.clientHeight)
    camera = orthoCamera
  } else {
    perspCamera.position.copy(position)
    perspCamera.quaternion.copy(camera.quaternion)
    perspCamera.aspect = canvas.clientWidth / canvas.clientHeight
    perspCamera.updateProjectionMatrix()
    camera = perspCamera
  }

  controls.object = camera
  transformControls.camera = camera
  controls.update()
}

function renderFrame(): void {
  if (!renderer || !axesRenderer) return
  renderer.render(scene, camera)
  axesRenderer.render(axesScene, axesCamera)
}

function animate(): void {
  if (!renderer || !controls || !axesRenderer) return
  const delta = Math.min(clock.getDelta(), 0.05)
  applyKeyboardMovement(delta)
  controls.update()
  updateAxesCamera()
  if (polygonCountDirty) {
    polygonCount.value = calculatePolygonCount()
    polygonCountDirty = false
  }
  if (selectionHelper) selectionHelper.update()
  syncRendererSize()
  renderFrame()
  frameId = window.requestAnimationFrame(animate)
}

/**
 * Checks whether the renderer's drawing-buffer matches the canvas display size.
 * Called every frame so the buffer is always in sync — this prevents the
 * "drawArraysInstanced: Drawing to a destination rect smaller than the viewport rect" warning.
 */
function syncRendererSize(): void {
  if (!renderer) return
  const canvas = renderer.domElement
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (w <= 0 || h <= 0) return

  /* Keep the shared edge-line resolution vector current for LineMaterial. */
  _edgeResolution.set(w, h)

  const pr = renderer.getPixelRatio()
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    } else {
      updateOrthoFrustum(w, h)
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Context menu                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

function hideContextMenu(): void {
  contextMenu.visible = false
}

function showContextMenuAt(event: MouseEvent): void {
  event.preventDefault()
  if (rightMouseState.suppressContextMenu) {
    rightMouseState.suppressContextMenu = false
    hideContextMenu()
    return
  }
  if (!viewportRoot.value) return
  viewportRoot.value.focus()

  const bounds = viewportRoot.value.getBoundingClientRect()
  contextMenu.x = event.clientX - bounds.left
  contextMenu.y = event.clientY - bounds.top
  contextMenu.visible = true
}

function resetView(): void {
  if (!controls) return
  camera.position.copy(defaultCameraPosition)
  controls.target.set(0, 0, 0)
  controls.update()
}

function handleAddPrimitive(type: PrimitiveType): void {
  hideContextMenu()
  emit('request-add-primitive', type)
}

function handleContextMenuAction(action: 'add-light' | 'import-model'): void {
  hideContextMenu()
  if (action === 'add-light') emit('request-add-light')
  else emit('request-import-model')
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Raycasting / picking                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

function pickObjectAt(event: PointerEvent): void {
  if (!renderer) return

  const rect = renderer.domElement.getBoundingClientRect()
  _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  _raycaster.setFromCamera(_mouse, camera)

  const pickable: THREE.Object3D[] = []
  primitiveMeshes.forEach((m) => pickable.push(m))
  importedObjects.forEach((o) => o.traverse((c) => pickable.push(c)))
  lightObjects.forEach((o) => pickable.push(o))

  const hits = _raycaster.intersectObjects(pickable, true)
  if (hits.length === 0) {
    emit('select-object', null, false, false)
    selectObject(null, null, false, false)
    return
  }

  const hitObj = hits[0]!.object

  for (const [id, m] of primitiveMeshes) {
    if (hitObj === m) {
      emit('select-object', id, true, false)
      selectObject(m, id, true, false)
      return
    }
  }

  for (const [id, o] of importedObjects) {
    let p: THREE.Object3D | null = hitObj
    while (p) {
      if (p === o) {
        emit('select-object', id, false, false)
        selectObject(o, id, false, false)
        return
      }
      p = p.parent
    }
  }

  for (const [id, o] of lightObjects) {
    let p: THREE.Object3D | null = hitObj
    while (p) {
      if (p === o) {
        emit('select-object', id, false, true)
        selectObject(o, id, false, true)
        return
      }
      p = p.parent
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Transform controls change handler                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

function emitTransformChange(): void {
  if (!selectedObject.value || !currentSelectedId.value || !transformControls) return

  const obj = selectedObject.value
  const id = currentSelectedId.value
  const mode = transformControls.mode

  if (isPrimitive.value) {
    const node = props.sceneData.nodes.find((n) => n.id === id)
    const yOffset = node ? getPrimitiveYOffset(node.primitive) : 0.5

    if (mode === 'translate') {
      emit('update-node-position', id, {
        x: obj.position.x,
        y: obj.position.y - yOffset,
        z: obj.position.z,
      })
    } else if (mode === 'rotate') {
      emit('update-node-rotation', id, {
        x: obj.rotation.x * RAD2DEG,
        y: obj.rotation.y * RAD2DEG,
        z: obj.rotation.z * RAD2DEG,
      })
    } else if (mode === 'scale') {
      emit('update-node-scale', id, { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z })
    }
  } else if (isLight.value) {
    if (mode === 'translate') {
      emit('update-light-position', id, { x: obj.position.x, y: obj.position.y, z: obj.position.z })
    }
    /* Lights are billboards — scale/rotate is intentionally ignored. */
  } else {
    /* Imported model — emit whichever transform axis changed. */
    if (mode === 'translate') {
      emit('update-imported-position', id, {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
      })
    } else if (mode === 'rotate') {
      emit('update-imported-rotation', id, {
        x: obj.rotation.x * RAD2DEG,
        y: obj.rotation.y * RAD2DEG,
        z: obj.rotation.z * RAD2DEG,
      })
    } else if (mode === 'scale') {
      emit('update-imported-scale', id, { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z })
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Lifecycle: mount                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

onMounted(() => {
  if (!viewportRoot.value || !canvasHost.value || !gizmoHost.value) return
  if (typeof WebGLRenderingContext === 'undefined') return

  const width = viewportRoot.value.clientWidth || 640
  const height = viewportRoot.value.clientHeight || 360

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    })
  } catch {
    return
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace

  /* Set correct aspect ratio from actual viewport dimensions */
  perspCamera.aspect = width / height
  perspCamera.updateProjectionMatrix()
  updateOrthoFrustum(width, height)

  /* Let CSS control the canvas display size; buffer is synced every frame */
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  canvasHost.value.appendChild(renderer.domElement)

  try {
    axesRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
  } catch {
    renderer.dispose()
    renderer = null
    return
  }

  axesRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  axesRenderer.setSize(GIZMO_RESOLUTION, GIZMO_RESOLUTION)
  gizmoHost.value.appendChild(axesRenderer.domElement)

  /* Orbit controls */
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.85
  controls.zoomSpeed = 0.95
  controls.panSpeed = 0.85
  controls.enableZoom = false
  controls.target.set(0, 0, 0)
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.PAN,
  }
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
  controls.update()

  /* Transform controls */
  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.setMode('translate')
  transformControls.setSpace('world')
  transformControls.addEventListener('dragging-changed', (event) => {
    if (controls) controls.enabled = !event.value
  })
  transformControls.addEventListener('change', () => {
    if (transformUpdateTimeout !== null) clearTimeout(transformUpdateTimeout)
    transformUpdateTimeout = window.setTimeout(emitTransformChange, TRANSFORM_SAVE_DEBOUNCE_MS)
  })

  /* ── Event handlers ──────────────────────────────────────────────── */

  pointerDownHandler = (event: PointerEvent) => {
    hideContextMenu()
    if (!controls || !renderer) return

    if (event.button === 1) {
      controls.mouseButtons.MIDDLE = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
      return
    }

    if (event.button === 0) {
      leftMouseState.isDown = true
      leftMouseState.moved = false
      leftMouseState.startX = event.clientX
      leftMouseState.startY = event.clientY
      pendingPickEvent = event
    }

    if (event.button === 2) {
      rightMouseState.isDown = true
      rightMouseState.moved = false
      rightMouseState.startX = event.clientX
      rightMouseState.startY = event.clientY
    }
  }

  pointerMoveHandler = (event: PointerEvent) => {
    if (leftMouseState.isDown && !leftMouseState.moved) {
      const dx = event.clientX - leftMouseState.startX
      const dy = event.clientY - leftMouseState.startY
      if (dx * dx + dy * dy > MOUSE_DRAG_THRESHOLD_SQ) {
        leftMouseState.moved = true
      }
    }
    if (rightMouseState.isDown && !rightMouseState.moved) {
      const dx = event.clientX - rightMouseState.startX
      const dy = event.clientY - rightMouseState.startY
      if (dx * dx + dy * dy > MOUSE_DRAG_THRESHOLD_SQ) {
        rightMouseState.moved = true
      }
    }
  }

  pointerUpHandler = (event: PointerEvent) => {
    if (controls) controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE

    if (event.button === 0) {
      if (!leftMouseState.moved && pendingPickEvent) {
        pickObjectAt(pendingPickEvent)
      }
      leftMouseState.isDown = false
      leftMouseState.moved = false
      pendingPickEvent = null
    }

    if (event.button === 2) {
      rightMouseState.isDown = false
      rightMouseState.suppressContextMenu = rightMouseState.moved
      rightMouseState.moved = false
    }
  }

  keyDownHandler = (event: KeyboardEvent) => {
    if (!isViewportActive()) return
    if (event.code === 'Tab') return

    if (event.code === 'Escape') {
      emit('select-object', null, false, false)
      selectObject(null, null, false, false)
      return
    }

    event.preventDefault()

    if (event.code === 'KeyC' && event.shiftKey) {
      resetView()
      return
    }

    /* Transform mode switching: 1 = translate, 2 = rotate, 3 = scale */
    if (event.code === 'Digit1' && transformControls) {
      transformControls.setMode('translate')
      return
    }
    if (event.code === 'Digit2' && transformControls) {
      transformControls.setMode('rotate')
      return
    }
    if (event.code === 'Digit3' && transformControls) {
      transformControls.setMode('scale')
      return
    }

    if (event.code.startsWith('Key') || event.code.startsWith('Shift') || event.code === 'Space') {
      keyState.add(event.code)
    }
  }

  keyUpHandler = (event: KeyboardEvent) => keyState.delete(event.code)

  blurHandler = () => keyState.clear()

  clickOutsideHandler = (event: PointerEvent) => {
    if (!viewportRoot.value) return
    const target = event.target as Node | null
    if (!target || viewportRoot.value.contains(target)) return
    hideContextMenu()
  }

  wheelHandler = (event: WheelEvent) => {
    if (!isViewportActive()) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? -CAMERA_SPEED_STEP : CAMERA_SPEED_STEP
    cameraMovementSpeed.value = Math.max(
      CAMERA_SPEED_MIN,
      Math.min(CAMERA_SPEED_MAX, cameraMovementSpeed.value + delta),
    )
  }

  /* ── Attach listeners ────────────────────────────────────────────── */
  renderer.domElement.addEventListener('pointerdown', pointerDownHandler)
  renderer.domElement.addEventListener('pointermove', pointerMoveHandler)
  window.addEventListener('pointerup', pointerUpHandler)
  window.addEventListener('keydown', keyDownHandler)
  window.addEventListener('keyup', keyUpHandler)
  window.addEventListener('blur', blurHandler)
  window.addEventListener('pointerdown', clickOutsideHandler)
  renderer.domElement.addEventListener('wheel', wheelHandler, { passive: false })

  /* ── Initial sync ────────────────────────────────────────────────── */
  syncPrimitiveNodes()
  syncLights()
  void syncImportedAssets()
  gridHelper.visible = showGrid.value
  clock.start()
  animate()
})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Watchers                                                              */
/* ═══════════════════════════════════════════════════════════════════════ */

watch(() => props.sceneData.nodes, syncPrimitiveNodes, { deep: true })
watch(() => props.sceneData.lights, syncLights, { deep: true })
watch(
  () => props.importedAssets,
  () => void syncImportedAssets(),
  { deep: true },
)

watch(displayMode, () => {
  if (displayMode.value === 'wireframe') {
    showPolygonEdges.value = false
    showVertices.value = false
  }
  /* refreshSceneDisplay rebuilds materials from scratch (via
     applyMaterialsForLighting) then applies the display mode, so
     opacity / transparency is always in a correct state. */
  refreshSceneDisplay()
})

watch(cameraType, (type) => switchCameraType(type))
watch(showGrid, () => {
  gridHelper.visible = showGrid.value
})
watch(showVertices, updateVerticesDisplay)
watch(showPolygonEdges, updatePolygonEdgesDisplay)

watch(
  () => [props.selectedObjectId, props.selectedIsPrimitive, props.selectedIsLight],
  () => {
    if (!props.selectedObjectId) {
      selectObject(null, null, false, false)
      return
    }

    if (props.selectedIsPrimitive) {
      const mesh = primitiveMeshes.get(props.selectedObjectId)
      selectObject(mesh ?? null, mesh ? props.selectedObjectId : null, !!mesh, false)
    } else if (props.selectedIsLight) {
      const obj = lightObjects.get(props.selectedObjectId)
      selectObject(obj ?? null, obj ? props.selectedObjectId : null, false, !!obj)
    } else {
      const obj = importedObjects.get(props.selectedObjectId)
      selectObject(obj ?? null, obj ? props.selectedObjectId : null, false, false)
    }
  },
)

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Lifecycle: unmount                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

function removeEventHandlers(): void {
  if (renderer && pointerDownHandler)
    renderer.domElement.removeEventListener('pointerdown', pointerDownHandler)
  if (renderer && pointerMoveHandler)
    renderer.domElement.removeEventListener('pointermove', pointerMoveHandler)
  if (pointerUpHandler) window.removeEventListener('pointerup', pointerUpHandler)
  if (keyDownHandler) window.removeEventListener('keydown', keyDownHandler)
  if (keyUpHandler) window.removeEventListener('keyup', keyUpHandler)
  if (blurHandler) window.removeEventListener('blur', blurHandler)
  if (clickOutsideHandler) window.removeEventListener('pointerdown', clickOutsideHandler)
  if (renderer && wheelHandler) renderer.domElement.removeEventListener('wheel', wheelHandler)

  pointerDownHandler = null
  pointerMoveHandler = null
  pointerUpHandler = null
  keyDownHandler = null
  keyUpHandler = null
  blurHandler = null
  clickOutsideHandler = null
  wheelHandler = null
}

onBeforeUnmount(() => {
  removeEventHandlers()
  keyState.clear()
  leftMouseState.isDown = false
  leftMouseState.moved = false
  pendingPickEvent = null
  rightMouseState.isDown = false
  rightMouseState.moved = false
  rightMouseState.suppressContextMenu = false

  if (transformUpdateTimeout !== null) {
    clearTimeout(transformUpdateTimeout)
    transformUpdateTimeout = null
  }

  if (selectionHelper) {
    scene.remove(selectionHelper)
    selectionHelper.dispose()
    selectionHelper = null
  }

  window.cancelAnimationFrame(frameId)

  primitiveMeshes.forEach((mesh) => disposeObject3D(mesh))
  primitiveMeshes.clear()

  importedObjects.forEach((object) => disposeObject3D(object))
  importedObjects.clear()

  lightObjects.forEach((obj) => {
    lightGroup.remove(obj)
    disposeObject3D(obj)
  })
  lightObjects.clear()

  transformControls?.dispose()
  transformControls = null
  controls?.dispose()
  controls = null
  renderer?.dispose()
  renderer = null
  axesRenderer?.dispose()
  axesRenderer = null
})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Public API for parent component                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

function moveImportedObject(assetId: string, position: { x: number; y: number; z: number }): void {
  const obj = importedObjects.get(assetId)
  if (obj) obj.position.set(position.x, position.y, position.z)
}

function getImportedObjectPosition(assetId: string): { x: number; y: number; z: number } | null {
  const obj = importedObjects.get(assetId)
  if (!obj) return null
  return { x: obj.position.x, y: obj.position.y, z: obj.position.z }
}

function scaleImportedObject(assetId: string, scale: { x: number; y: number; z: number }): void {
  const obj = importedObjects.get(assetId)
  if (obj) obj.scale.set(scale.x, scale.y, scale.z)
}

function getImportedObjectScale(assetId: string): { x: number; y: number; z: number } | null {
  const obj = importedObjects.get(assetId)
  if (!obj) return null
  return { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
}

function rotateImportedObject(
  assetId: string,
  rotation: { x: number; y: number; z: number },
): void {
  const obj = importedObjects.get(assetId)
  if (obj) obj.rotation.set(rotation.x * DEG2RAD, rotation.y * DEG2RAD, rotation.z * DEG2RAD)
}

function getImportedObjectRotation(assetId: string): { x: number; y: number; z: number } | null {
  const obj = importedObjects.get(assetId)
  if (!obj) return null
  return { x: obj.rotation.x * RAD2DEG, y: obj.rotation.y * RAD2DEG, z: obj.rotation.z * RAD2DEG }
}

defineExpose({
  moveImportedObject,
  getImportedObjectPosition,
  scaleImportedObject,
  getImportedObjectScale,
  rotateImportedObject,
  getImportedObjectRotation,
})
</script>

<template>
  <section ref="viewportRoot" class="viewport" tabindex="0" @contextmenu="showContextMenuAt">
    <div ref="canvasHost" class="viewport__canvas" />

    <ViewportToolbar
      v-model:display-mode="displayMode"
      v-model:camera-type="cameraType"
      v-model:show-polygon-edges="showPolygonEdges"
      v-model:show-vertices="showVertices"
      v-model:show-grid="showGrid"
      v-model:show-polygon-count="showPolygonCount"
      v-model:show-camera-speed="showCameraSpeed"
      v-model:show-axes="showAxes"
    />

    <div class="viewport__info">
      <div v-if="showPolygonCount" class="viewport__stats">
        <div class="viewport__stat">
          <span class="viewport__stat-label">{{ t('viewport.polygons') }}:</span>
          <span class="viewport__stat-value">{{ polygonCount.toLocaleString() }}</span>
        </div>
      </div>
      <div v-if="showCameraSpeed" class="viewport__speed-info">
        <span class="viewport__speed-label">{{ t('viewport.cameraSpeed') }}:</span>
        <span class="viewport__speed-value">{{ cameraMovementSpeed.toFixed(1) }}</span>
      </div>
      <div ref="gizmoHost" class="viewport__gizmo" :style="{ display: showAxes ? '' : 'none' }" />
    </div>

    <ViewportContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @add-primitive="handleAddPrimitive"
      @add-light="handleContextMenuAction('add-light')"
      @import-model="handleContextMenuAction('import-model')"
    />
  </section>
</template>
