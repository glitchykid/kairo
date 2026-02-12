<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { SceneEntity } from '@/core/scene/types'
import { loadImportedModelObject } from '@/features/editor/services/model-import'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'
import { useI18n } from '@/localization/i18n'

/* ── Constants ──────────────────────────────────────────────────────────── */
const DEFAULT_CAMERA_SPEED = 6.5
const CAMERA_SPEED_MIN = 1
const CAMERA_SPEED_MAX = 20
const CAMERA_SPEED_STEP = 0.5
const SPRINT_MULTIPLIER = 2.2
const CUBE_Y_OFFSET = 0.5
const POSITION_SAVE_DEBOUNCE_MS = 100
const RIGHT_MOUSE_DRAG_THRESHOLD_SQ = 16
const GRID_SIZE = 200
const GRID_DIVISIONS = 200
const GRID_COLOR_PRIMARY = 0x6f7782
const GRID_COLOR_SECONDARY = 0x3d434c
const AXES_HELPER_SIZE = 1.25
const GIZMO_RESOLUTION = 92
const WIREFRAME_COLOR = 0x00ff00
const POLYGON_EDGE_COLOR = 0x00ccff
const PRIMITIVE_COLOR = 0x9099a4

const props = defineProps<{
  sceneData: SceneEntity
  importedAssets: ImportedModelAsset[]
  selectedObjectId?: string | null
  selectedIsPrimitive?: boolean
}>()

const emit = defineEmits<{
  (event: 'request-add-cube'): void
  (event: 'request-import-model'): void
  (event: 'update-node-position', nodeId: string, position: { x: number; y: number; z: number }): void
}>()
const { t } = useI18n()

const viewportRoot = ref<HTMLElement | null>(null)
const canvasHost = ref<HTMLElement | null>(null)
const gizmoHost = ref<HTMLElement | null>(null)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2500)
const primitiveGroup = new THREE.Group()
const importedGroup = new THREE.Group()

const axesScene = new THREE.Scene()
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
const defaultCameraPosition = new THREE.Vector3(8, 9, 8)
const upAxis = new THREE.Vector3(0, 1, 0)
const clock = new THREE.Clock()
const keyState = new Set<string>()
const primitiveMeshes = new Map<string, THREE.Mesh>()
const importedObjects = new Map<string, THREE.Object3D>()
const loadingImports = new Set<string>()
const cameraMovementSpeed = ref(DEFAULT_CAMERA_SPEED)
const displayMode = ref<'solid' | 'wireframe'>('solid')
const polygonCount = ref(0)
const showGrid = ref(true)
const showVertices = ref(false)
const showPolygonCount = ref(true)
const showPolygonEdges = ref(false)
const showCameraSpeed = ref(true)
const showAxes = ref(true)
const selectedObject = ref<THREE.Object3D | null>(null)
const selectedObjectId = ref<string | null>(null)
const isPrimitive = ref(false)
let polygonCountDirty = true
let isSyncingImports = false

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
})

const rightMouseState = reactive({
  isDown: false,
  moved: false,
  startX: 0,
  startY: 0,
  suppressContextMenu: false,
})

let renderer: THREE.WebGLRenderer | null = null
let axesRenderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let transformControls: TransformControls | null = null
let resizeObserver: ResizeObserver | null = null
let positionUpdateTimeout: number | null = null
let frameId = 0
let pointerDownHandler: ((event: PointerEvent) => void) | null = null
let pointerMoveHandler: ((event: PointerEvent) => void) | null = null
let pointerUpHandler: ((event: PointerEvent) => void) | null = null
let keyDownHandler: ((event: KeyboardEvent) => void) | null = null
let keyUpHandler: ((event: KeyboardEvent) => void) | null = null
let blurHandler: (() => void) | null = null
let clickOutsideHandler: ((event: PointerEvent) => void) | null = null
let wheelHandler: ((event: WheelEvent) => void) | null = null

scene.background = new THREE.Color('#101317')
scene.add(primitiveGroup)
scene.add(importedGroup)

const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_COLOR_PRIMARY, GRID_COLOR_SECONDARY)
scene.add(gridHelper)

const axesHelper = new THREE.AxesHelper(AXES_HELPER_SIZE)
scene.add(axesHelper)

const vertexHelpers = new THREE.Group()
scene.add(vertexHelpers)

const edgeHelpers = new THREE.Group()
scene.add(edgeHelpers)

scene.add(new THREE.AmbientLight(0x7d8591, 0.45))

const keyLight = new THREE.DirectionalLight(0xcfd5de, 1.1)
keyLight.position.set(8, 14, 6)
scene.add(keyLight)

camera.position.copy(defaultCameraPosition)
camera.lookAt(0, 0, 0)
const viewportAxesHelper = new THREE.AxesHelper(AXES_HELPER_SIZE)
axesScene.add(viewportAxesHelper)

function isViewportActive(): boolean {
  return document.activeElement === viewportRoot.value
}

function hideContextMenu(): void {
  contextMenu.visible = false
}

function showContextMenu(event: MouseEvent): void {
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

function addCubeFromContextMenu(): void {
  hideContextMenu()
  emit('request-add-cube')
}

function importModelFromContextMenu(): void {
  hideContextMenu()
  emit('request-import-model')
}

function makePrimitiveMesh(nodeId: string): THREE.Mesh {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshStandardMaterial({
    color: PRIMITIVE_COLOR,
    roughness: 0.5,
    metalness: 0.12,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = nodeId
  return mesh
}

function syncPrimitiveNodes(): void {
  const nodeIds = new Set(props.sceneData.nodes.map((node) => node.id))

  primitiveMeshes.forEach((mesh, nodeId) => {
    if (nodeIds.has(nodeId)) return
    primitiveGroup.remove(mesh)
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose())
    } else {
      mesh.material.dispose()
    }
    primitiveMeshes.delete(nodeId)
  })

  props.sceneData.nodes.forEach((node) => {
    let mesh = primitiveMeshes.get(node.id)
    if (!mesh) {
      mesh = makePrimitiveMesh(node.id)
      primitiveMeshes.set(node.id, mesh)
      primitiveGroup.add(mesh)
    }
    mesh.position.set(node.position.x, node.position.y + CUBE_Y_OFFSET, node.position.z)
  })
  markPolygonCountDirty()
  applyDisplayMode()
  updateVerticesDisplay()
  updatePolygonEdgesDisplay()
  
  if (selectedObject.value && selectedObjectId.value && isPrimitive.value) {
    const mesh = primitiveMeshes.get(selectedObjectId.value)
    if (mesh) {
      selectObject(mesh, selectedObjectId.value, true)
    }
  }
}

function alignObjectToGround(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object)
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3())
    object.position.sub(center)
    const adjusted = new THREE.Box3().setFromObject(object)
    object.position.y -= adjusted.min.y
  }
}

function layoutImportedObjects(): void {
  let offsetX = 0
  importedObjects.forEach((object) => {
    object.position.x = offsetX
    offsetX += 3.5
  })
}

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose())
      } else {
        child.material?.dispose()
      }
    }
  })
}

async function syncImportedAssets(): Promise<void> {
  if (isSyncingImports) return
  isSyncingImports = true

  try {
    const activeAssetIds = new Set(props.importedAssets.map((asset) => asset.id))

    importedObjects.forEach((object, assetId) => {
      if (activeAssetIds.has(assetId)) return
      importedGroup.remove(object)
      disposeObject3D(object)
      importedObjects.delete(assetId)
    })

    for (const asset of props.importedAssets) {
      if (importedObjects.has(asset.id) || loadingImports.has(asset.id)) continue

      loadingImports.add(asset.id)
      try {
        const model = await loadImportedModelObject(asset)
        model.name = asset.name
        alignObjectToGround(model)
        importedObjects.set(asset.id, model)
        importedGroup.add(model)
        layoutImportedObjects()
        markPolygonCountDirty()
        applyDisplayMode()
        updateVerticesDisplay()
        updatePolygonEdgesDisplay()

        if (props.selectedObjectId && !props.selectedIsPrimitive && props.selectedObjectId === asset.id) {
          selectObject(model, asset.id, false)
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

function updateAxesCamera(): void {
  if (!controls) return
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
  offset.normalize().multiplyScalar(4)
  axesCamera.position.copy(offset)
  axesCamera.lookAt(0, 0, 0)
}

function calculatePolygonCount(): number {
  let count = 0
  primitiveMeshes.forEach((mesh) => {
    if (mesh.geometry instanceof THREE.BufferGeometry) {
      const index = mesh.geometry.index
      if (index) {
        count += index.count / 3
      } else {
        const position = mesh.geometry.attributes.position
        if (position) {
          count += position.count / 3
        }
      }
    }
  })
  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        const index = child.geometry.index
        if (index) {
          count += index.count / 3
        } else {
          const position = child.geometry.attributes.position
          if (position) {
            count += position.count / 3
          }
        }
      }
    })
  })
  return Math.floor(count)
}

function applyDisplayMode(): void {
  const isWireframe = displayMode.value === 'wireframe'
  
  if (isWireframe && showPolygonEdges.value) {
    showPolygonEdges.value = false
    updatePolygonEdgesDisplay()
  }
  
  function applyWireframeToMaterial(mat: THREE.Material, originalColor?: number): void {
    if ('wireframe' in mat) {
      ;(mat as THREE.MeshStandardMaterial).wireframe = isWireframe
      if ('color' in mat && mat.color instanceof THREE.Color) {
        mat.color.setHex(isWireframe ? WIREFRAME_COLOR : (originalColor ?? PRIMITIVE_COLOR))
      }
      if (isWireframe && 'emissive' in mat && mat.emissive instanceof THREE.Color) {
        mat.emissive.setHex(0x000000)
      }
    }
  }
  
  primitiveMeshes.forEach((mesh) => {
    if (mesh.material instanceof THREE.Material) {
      applyWireframeToMaterial(mesh.material, PRIMITIVE_COLOR)
    } else if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        applyWireframeToMaterial(mat, PRIMITIVE_COLOR)
      })
    }
  })
  
  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.Material) {
          applyWireframeToMaterial(child.material)
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            applyWireframeToMaterial(mat)
          })
        }
      }
    })
  })
}

function toggleGrid(): void {
  gridHelper.visible = showGrid.value
}

function toggleAxes(): void {
  axesHelper.visible = showAxes.value
}

function markPolygonCountDirty(): void {
  polygonCountDirty = true
}

function updatePolygonEdgesDisplay(): void {
  edgeHelpers.clear()
  if (!showPolygonEdges.value) return
  
  if (displayMode.value === 'wireframe') {
    displayMode.value = 'solid'
    applyDisplayMode()
  }

  const edgeMaterial = new THREE.LineBasicMaterial({ color: POLYGON_EDGE_COLOR, linewidth: 1 })

  primitiveMeshes.forEach((mesh) => {
    if (mesh.geometry instanceof THREE.BufferGeometry) {
      const edges = new THREE.EdgesGeometry(mesh.geometry)
      const line = new THREE.LineSegments(edges, edgeMaterial)
      line.position.copy(mesh.position)
      line.rotation.copy(mesh.rotation)
      line.scale.copy(mesh.scale)
      edgeHelpers.add(line)
    }
  })

  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        const edges = new THREE.EdgesGeometry(child.geometry)
        const line = new THREE.LineSegments(edges, edgeMaterial)
        
        const worldPosition = new THREE.Vector3()
        const worldQuaternion = new THREE.Quaternion()
        const worldScale = new THREE.Vector3()
        child.getWorldPosition(worldPosition)
        child.getWorldQuaternion(worldQuaternion)
        child.getWorldScale(worldScale)

        line.position.copy(worldPosition)
        line.quaternion.copy(worldQuaternion)
        line.scale.copy(worldScale)
        edgeHelpers.add(line)
      }
    })
  })
}

function selectObject(object: THREE.Object3D | null, objectId: string | null, primitive: boolean): void {
  selectedObject.value = object
  selectedObjectId.value = objectId
  isPrimitive.value = primitive
  
  if (transformControls) {
    if (object) {
      transformControls.attach(object)
    } else {
      transformControls.detach()
    }
  }
}


function updateVerticesDisplay(): void {
  vertexHelpers.clear()
  if (!showVertices.value) return

  const pointMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 4,
    sizeAttenuation: false,
  })

  primitiveMeshes.forEach((mesh) => {
    if (mesh.geometry instanceof THREE.BufferGeometry) {
      const positions = mesh.geometry.attributes.position
      if (positions) {
        const points = new THREE.Points(
          new THREE.BufferGeometry().setAttribute('position', positions.clone()),
          pointMaterial.clone(),
        )
        points.position.copy(mesh.position)
        points.rotation.copy(mesh.rotation)
        points.scale.copy(mesh.scale)
        vertexHelpers.add(points)
      }
    }
  })

  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
        const positions = child.geometry.attributes.position
        if (positions) {
          const worldPosition = new THREE.Vector3()
          const worldQuaternion = new THREE.Quaternion()
          const worldScale = new THREE.Vector3()
          child.getWorldPosition(worldPosition)
          child.getWorldQuaternion(worldQuaternion)
          child.getWorldScale(worldScale)

          const worldRotation = new THREE.Euler().setFromQuaternion(worldQuaternion)

          const points = new THREE.Points(
            new THREE.BufferGeometry().setAttribute('position', positions.clone()),
            pointMaterial.clone(),
          )
          points.position.copy(worldPosition)
          points.rotation.copy(worldRotation)
          points.scale.copy(worldScale)
          vertexHelpers.add(points)
        }
      }
    })
  })
}

function applyKeyboardMovement(deltaSeconds: number): void {
  if (!controls || !isViewportActive()) return

  const moveDirection = new THREE.Vector3()
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()

  const right = new THREE.Vector3().crossVectors(forward, upAxis).normalize()

  if (keyState.has('KeyW')) moveDirection.add(forward)
  if (keyState.has('KeyS')) moveDirection.sub(forward)
  if (keyState.has('KeyA')) moveDirection.sub(right)
  if (keyState.has('KeyD')) moveDirection.add(right)
  if (keyState.has('Space')) moveDirection.y += 1
  if (keyState.has('ControlLeft') || keyState.has('ControlRight')) moveDirection.y -= 1

  if (moveDirection.lengthSq() === 0) return

  moveDirection.normalize()
  const speedMultiplier = keyState.has('ShiftLeft') || keyState.has('ShiftRight') ? SPRINT_MULTIPLIER : 1
  const distance = deltaSeconds * cameraMovementSpeed.value * speedMultiplier
  moveDirection.multiplyScalar(distance)
  camera.position.add(moveDirection)
  controls.target.add(moveDirection)
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
  renderFrame()
  frameId = window.requestAnimationFrame(animate)
}

function updateRendererSize(width: number, height: number): void {
  if (!renderer || width <= 0 || height <= 0) return
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

onMounted(() => {
  if (!viewportRoot.value || !canvasHost.value || !gizmoHost.value) return
  if (typeof WebGLRenderingContext === 'undefined') return

  const width = viewportRoot.value.clientWidth || 640
  const height = viewportRoot.value.clientHeight || 360

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  } catch {
    return
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
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
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  }
  controls.update()

  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.setMode('translate')
  transformControls.setSpace('world')
  transformControls.addEventListener('dragging-changed', (event) => {
    if (controls) {
      controls.enabled = !event.value
    }
  })
  
  transformControls.addEventListener('change', () => {
    if (selectedObject.value && selectedObjectId.value) {
      if (isPrimitive.value && selectedObject.value instanceof THREE.Mesh) {
        if (positionUpdateTimeout !== null) {
          clearTimeout(positionUpdateTimeout)
        }
        positionUpdateTimeout = window.setTimeout(() => {
          emit('update-node-position', selectedObjectId.value!, {
            x: selectedObject.value!.position.x,
            y: selectedObject.value!.position.y - CUBE_Y_OFFSET,
            z: selectedObject.value!.position.z,
          })
        }, POSITION_SAVE_DEBOUNCE_MS)
      }
    }
  })

  pointerDownHandler = (event: PointerEvent) => {
    hideContextMenu()
    if (!controls) return

    if (event.button === 1) {
      controls.mouseButtons.MIDDLE = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
      return
    }

    if (event.button === 2) {
      rightMouseState.isDown = true
      rightMouseState.moved = false
      rightMouseState.startX = event.clientX
      rightMouseState.startY = event.clientY
    }
  }

  pointerMoveHandler = (event: PointerEvent) => {
    if (!rightMouseState.isDown) return
    const dx = event.clientX - rightMouseState.startX
    const dy = event.clientY - rightMouseState.startY
    if (dx * dx + dy * dy > RIGHT_MOUSE_DRAG_THRESHOLD_SQ) {
      rightMouseState.moved = true
    }
  }

  pointerUpHandler = (event: PointerEvent) => {
    if (controls) {
      controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE
    }
    if (event.button === 2) {
      rightMouseState.isDown = false
      rightMouseState.suppressContextMenu = rightMouseState.moved
      rightMouseState.moved = false
    }
  }

  keyDownHandler = (event: KeyboardEvent) => {
    if (!isViewportActive()) return
    if (event.code === 'KeyC' && event.shiftKey) {
      event.preventDefault()
      resetView()
      return
    }
    if (event.code === 'Space') {
      event.preventDefault()
    }
    if (
      event.code.startsWith('Key') ||
      event.code.startsWith('Shift') ||
      event.code.startsWith('Control') ||
      event.code === 'Space'
    ) {
      keyState.add(event.code)
    }
  }

  keyUpHandler = (event: KeyboardEvent) => {
    keyState.delete(event.code)
  }

  blurHandler = () => {
    keyState.clear()
  }

  clickOutsideHandler = (event: PointerEvent) => {
    if (!viewportRoot.value) return
    const targetNode = event.target as Node | null
    if (!targetNode || viewportRoot.value.contains(targetNode)) return
    hideContextMenu()
  }

  wheelHandler = (event: WheelEvent) => {
    if (!isViewportActive()) return
    event.preventDefault()
    const speedDelta = event.deltaY > 0 ? -CAMERA_SPEED_STEP : CAMERA_SPEED_STEP
    cameraMovementSpeed.value = Math.max(CAMERA_SPEED_MIN, Math.min(CAMERA_SPEED_MAX, cameraMovementSpeed.value + speedDelta))
  }

  renderer.domElement.addEventListener('pointerdown', pointerDownHandler)
  renderer.domElement.addEventListener('pointermove', pointerMoveHandler)
  window.addEventListener('pointerup', pointerUpHandler)
  window.addEventListener('keydown', keyDownHandler)
  window.addEventListener('keyup', keyUpHandler)
  window.addEventListener('blur', blurHandler)
  window.addEventListener('pointerdown', clickOutsideHandler)
  renderer.domElement.addEventListener('wheel', wheelHandler, { passive: false })

  syncPrimitiveNodes()
  void syncImportedAssets()
  toggleGrid()
  toggleAxes()
  clock.start()
  animate()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      updateRendererSize(entry.contentRect.width, entry.contentRect.height)
    })
    resizeObserver.observe(viewportRoot.value)
  }
})

watch(
  () => props.sceneData.nodes,
  () => {
    syncPrimitiveNodes()
  },
  { deep: true },
)

watch(
  () => props.importedAssets,
  () => {
    void syncImportedAssets()
  },
  { deep: true },
)

watch(showGrid, () => {
  toggleGrid()
})

watch(showVertices, () => {
  updateVerticesDisplay()
})

watch(showPolygonEdges, () => {
  updatePolygonEdgesDisplay()
})

watch(showAxes, () => {
  toggleAxes()
})

watch(
  () => [props.selectedObjectId, props.selectedIsPrimitive],
  () => {
    if (props.selectedObjectId) {
      if (props.selectedIsPrimitive) {
        const mesh = primitiveMeshes.get(props.selectedObjectId)
        if (mesh) {
          selectObject(mesh, props.selectedObjectId, true)
        } else {
          selectObject(null, null, false)
        }
      } else {
        const object = importedObjects.get(props.selectedObjectId)
        if (object) {
          selectObject(object, props.selectedObjectId, false)
        } else {
          selectObject(null, null, false)
        }
      }
    } else {
      selectObject(null, null, false)
    }
  },
)


onBeforeUnmount(() => {
  if (renderer && pointerDownHandler) {
    renderer.domElement.removeEventListener('pointerdown', pointerDownHandler)
  }
  if (renderer && pointerMoveHandler) {
    renderer.domElement.removeEventListener('pointermove', pointerMoveHandler)
  }
  if (pointerUpHandler) window.removeEventListener('pointerup', pointerUpHandler)
  if (keyDownHandler) window.removeEventListener('keydown', keyDownHandler)
  if (keyUpHandler) window.removeEventListener('keyup', keyUpHandler)
  if (blurHandler) window.removeEventListener('blur', blurHandler)
  if (clickOutsideHandler) window.removeEventListener('pointerdown', clickOutsideHandler)
  if (renderer && wheelHandler) {
    renderer.domElement.removeEventListener('wheel', wheelHandler)
  }

  keyState.clear()
  rightMouseState.isDown = false
  rightMouseState.moved = false
  rightMouseState.suppressContextMenu = false
  pointerDownHandler = null
  pointerMoveHandler = null
  pointerUpHandler = null
  keyDownHandler = null
  keyUpHandler = null
  blurHandler = null
  clickOutsideHandler = null
  wheelHandler = null

  if (positionUpdateTimeout !== null) {
    clearTimeout(positionUpdateTimeout)
    positionUpdateTimeout = null
  }

  window.cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  resizeObserver = null

  primitiveMeshes.forEach((mesh) => {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => mat.dispose())
    } else {
      mesh.material.dispose()
    }
  })
  primitiveMeshes.clear()

  importedObjects.forEach((object) => {
    disposeObject3D(object)
  })
  importedObjects.clear()

  transformControls?.dispose()
  transformControls = null
  controls?.dispose()
  controls = null
  renderer?.dispose()
  renderer = null
  axesRenderer?.dispose()
  axesRenderer = null
})
</script>

<template>
  <section
    ref="viewportRoot"
    class="viewport"
    tabindex="0"
    @contextmenu="showContextMenu"
  >
    <div ref="canvasHost" class="viewport__canvas" />
    <div class="viewport__controls">
      <div class="viewport__display-modes">
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': displayMode === 'solid' }"
          :title="t('viewport.displayMode.solid')"
          @click="displayMode = 'solid'; applyDisplayMode()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4L8 1L14 4V12L8 15L2 12V4Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
            <path d="M2 4L8 7L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 7V15" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': displayMode === 'wireframe' }"
          :title="t('viewport.displayMode.wireframe')"
          @click="displayMode = 'wireframe'; applyDisplayMode()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4L8 1L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 12L8 15L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 4L2 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 1L8 15" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M14 4L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 4L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 12L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showVertices }"
          :title="t('viewport.displayMode.vertices')"
          @click="showVertices = !showVertices; updateVerticesDisplay()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <path d="M4 4L12 4M4 4L4 12M12 4L12 12M4 12L12 12" stroke="currentColor" stroke-width="1" stroke-opacity="0.3" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn viewport__display-btn--polygon-edges"
          :class="{ 'viewport__display-btn--active': showPolygonEdges }"
          :title="t('viewport.displayMode.polygonEdges')"
          @click="showPolygonEdges = !showPolygonEdges; updatePolygonEdgesDisplay()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L14 2M2 2L2 14M14 2L14 14M2 14L14 14" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 8L14 8M8 2L8 14" stroke="currentColor" stroke-width="1" stroke-opacity="0.5" fill="none"/>
          </svg>
        </button>
      </div>
      <div class="viewport__display-modes viewport__display-modes--separated">
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showGrid }"
          :title="t('viewport.displayMode.grid')"
          @click="showGrid = !showGrid; toggleGrid()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2H14V14H2V2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 8H14" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 2V14" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showPolygonCount }"
          :title="t('viewport.displayMode.polygons')"
          @click="showPolygonCount = !showPolygonCount"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H7V7H3V3Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M9 3H13V7H9V3Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M3 9H7V13H3V9Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M9 9H13V13H9V9Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showCameraSpeed }"
          :title="t('viewport.displayMode.cameraSpeed')"
          @click="showCameraSpeed = !showCameraSpeed"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2L10 6L14 7L11 10L11.5 14L8 12L4.5 14L5 10L2 7L6 6L8 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showAxes }"
          :title="t('viewport.displayMode.axes')"
          @click="showAxes = !showAxes; toggleAxes()"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8L14 8" stroke="#ff0000" stroke-width="1.5" fill="none"/>
            <path d="M8 2L8 14" stroke="#00ff00" stroke-width="1.5" fill="none"/>
            <path d="M8 8L14 14" stroke="#0080ff" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
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
      <div ref="gizmoHost" class="viewport__gizmo" />
    </div>
    <div
      v-if="contextMenu.visible"
      class="viewport__context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <button type="button" class="viewport__context-action" @click="addCubeFromContextMenu">
        {{ t('viewport.addCube') }}
      </button>
      <button type="button" class="viewport__context-action" @click="importModelFromContextMenu">
        {{ t('viewport.importModel') }}
      </button>
    </div>
  </section>
</template>
