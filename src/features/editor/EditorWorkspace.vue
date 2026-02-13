<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { PrimitiveType, Transform } from '@/core/scene/types'
import AppShell from '@/ui/components/layout/AppShell.vue'
import ResizablePanels from '@/ui/components/layout/ResizablePanels.vue'
import EditorMenuBar from '@/ui/components/menu/EditorMenuBar.vue'
import SceneInspector from '@/ui/components/panels/SceneInspector.vue'
import ViewportCanvas from '@/ui/components/viewport/ViewportCanvas.vue'
import { buildModelAcceptString } from '@/features/editor/types/imported-model'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const modelInput = ref<HTMLInputElement | null>(null)
const viewportRef = ref<InstanceType<typeof ViewportCanvas> | null>(null)
const modelAccept = buildModelAcceptString()
const selectedObjectId = ref<string | null>(null)
const selectedIsPrimitive = ref(false)
const selectedIsLight = ref(false)

/** Runtime-only transform tracking for imported models (not persisted in DB). */
const importedModelPositions = reactive(new Map<string, Transform>())
const importedModelScales = reactive(new Map<string, Transform>())
const importedModelRotations = reactive(new Map<string, Transform>())

let blockBrowserShortcutHandler: ((event: KeyboardEvent) => void) | null = null
let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null

/* ── Selected object transforms ────────────────────────────────────── */

const selectedPosition = computed<Transform | null>(() => {
  if (!selectedObjectId.value) return null

  if (selectedIsPrimitive.value) {
    const node = editorStore.activeScene.nodes.find((n) => n.id === selectedObjectId.value)
    return node?.position ?? null
  }

  if (selectedIsLight.value) {
    const light = editorStore.activeScene.lights?.find((l) => l.id === selectedObjectId.value)
    return light?.position ?? null
  }

  const tracked = importedModelPositions.get(selectedObjectId.value)
  if (tracked) return tracked

  const viewportPos = viewportRef.value?.getImportedObjectPosition(selectedObjectId.value)
  if (viewportPos) {
    importedModelPositions.set(selectedObjectId.value, viewportPos)
    return viewportPos
  }

  return { x: 0, y: 0, z: 0 }
})

const selectedScale = computed<Transform | null>(() => {
  if (!selectedObjectId.value) return null
  if (selectedIsLight.value) return null

  if (selectedIsPrimitive.value) {
    const node = editorStore.activeScene.nodes.find((n) => n.id === selectedObjectId.value)
    return node?.scale ?? { x: 1, y: 1, z: 1 }
  }

  /* Imported model */
  const tracked = importedModelScales.get(selectedObjectId.value)
  if (tracked) return tracked

  const viewportScale = viewportRef.value?.getImportedObjectScale(selectedObjectId.value)
  if (viewportScale) {
    importedModelScales.set(selectedObjectId.value, viewportScale)
    return viewportScale
  }
  return { x: 1, y: 1, z: 1 }
})

const selectedRotation = computed<Transform | null>(() => {
  if (!selectedObjectId.value) return null
  if (selectedIsLight.value) return null

  if (selectedIsPrimitive.value) {
    const node = editorStore.activeScene.nodes.find((n) => n.id === selectedObjectId.value)
    return node?.rotation ?? { x: 0, y: 0, z: 0 }
  }

  /* Imported model */
  const tracked = importedModelRotations.get(selectedObjectId.value)
  if (tracked) return tracked

  const viewportRotation = viewportRef.value?.getImportedObjectRotation(selectedObjectId.value)
  if (viewportRotation) {
    importedModelRotations.set(selectedObjectId.value, viewportRotation)
    return viewportRotation
  }
  return { x: 0, y: 0, z: 0 }
})

/* ── Lifecycle ─────────────────────────────────────────────────────── */

async function hydrateEditor(): Promise<void> {
  try {
    await editorStore.hydrate()
  } catch (error) {
    console.error('Failed to hydrate editor state.', error)
  }
}

onMounted(() => {
  void hydrateEditor()

  /* Attempt to intercept Ctrl+W / Ctrl+S at the keydown level (works in some browsers) */
  blockBrowserShortcutHandler = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && (event.code === 'KeyS' || event.code === 'KeyW')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  window.addEventListener('keydown', blockBrowserShortcutHandler, { capture: true })

  /*
   * Fallback: most browsers (Chrome, Edge, Firefox) process Ctrl+W at the native
   * level before JavaScript sees it. The beforeunload dialog is the only reliable
   * cross-browser way to prevent accidental tab closure while editing.
   */
  beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    event.preventDefault()
    /* Chrome ≥ 119 ignores returnValue but still needs preventDefault() */
    event.returnValue = ''
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeUnmount(() => {
  if (blockBrowserShortcutHandler) {
    window.removeEventListener('keydown', blockBrowserShortcutHandler, { capture: true })
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  }
  blockBrowserShortcutHandler = null
  beforeUnloadHandler = null
})

/* ── Handlers ──────────────────────────────────────────────────────── */

function handleAddPrimitive(type: PrimitiveType): void {
  void editorStore.addPrimitiveNode(type)
}

function handleAddLight(): void {
  void editorStore.addLightNode()
}

function openImportDialog(): void {
  modelInput.value?.click()
}

function handleModelImport(event: Event): void {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length > 0) {
    void editorStore.importModelFiles(files)
  }
  target.value = ''
}

function handleUpdateNodePosition(nodeId: string, position: Transform): void {
  void editorStore.updateNodePositionById(nodeId, position)
}

function handleUpdateNodeScale(nodeId: string, scale: Transform): void {
  void editorStore.updateNodeScaleById(nodeId, scale)
}

function handleUpdateNodeRotation(nodeId: string, rotation: Transform): void {
  void editorStore.updateNodeRotationById(nodeId, rotation)
}

function handleUpdateLightPosition(lightId: string, position: Transform): void {
  void editorStore.updateLightPositionById(lightId, position)
}

function handleUpdateImportedPosition(assetId: string, position: Transform): void {
  importedModelPositions.set(assetId, position)
}

function handleUpdateImportedScale(assetId: string, scale: Transform): void {
  importedModelScales.set(assetId, scale)
}

function handleUpdateImportedRotation(assetId: string, rotation: Transform): void {
  importedModelRotations.set(assetId, rotation)
}

function handleInspectorImportedPosition(assetId: string, position: Transform): void {
  importedModelPositions.set(assetId, position)
  viewportRef.value?.moveImportedObject(assetId, position)
}

function handleInspectorImportedScale(assetId: string, scale: Transform): void {
  importedModelScales.set(assetId, scale)
  viewportRef.value?.scaleImportedObject(assetId, scale)
}

function handleInspectorImportedRotation(assetId: string, rotation: Transform): void {
  importedModelRotations.set(assetId, rotation)
  viewportRef.value?.rotateImportedObject(assetId, rotation)
}

function handleSelectObject(objectId: string | null, isPrimitive: boolean, isLight = false): void {
  selectedObjectId.value = objectId
  selectedIsPrimitive.value = isPrimitive
  selectedIsLight.value = isLight
}

function handleRenameScene(name: string): void {
  void editorStore.renameActiveScene(name)
}
</script>

<template>
  <AppShell>
    <template #menu>
      <EditorMenuBar />
    </template>
    <section class="workspace">
      <ResizablePanels :initial-secondary-width="360">
        <template #primary>
          <ViewportCanvas
            ref="viewportRef"
            :scene-data="editorStore.activeScene"
            :imported-assets="editorStore.importedAssets"
            :selected-object-id="selectedObjectId"
            :selected-is-primitive="selectedIsPrimitive"
            :selected-is-light="selectedIsLight"
            @request-add-primitive="handleAddPrimitive"
            @request-add-light="handleAddLight"
            @request-import-model="openImportDialog"
            @select-object="handleSelectObject"
            @update-node-position="handleUpdateNodePosition"
            @update-node-scale="handleUpdateNodeScale"
            @update-node-rotation="handleUpdateNodeRotation"
            @update-light-position="handleUpdateLightPosition"
            @update-imported-position="handleUpdateImportedPosition"
            @update-imported-scale="handleUpdateImportedScale"
            @update-imported-rotation="handleUpdateImportedRotation"
          />
        </template>
        <template #secondary>
          <SceneInspector
            :scene="editorStore.activeScene"
            :imported-assets="editorStore.importedAssets"
            :selected-object-id="selectedObjectId"
            :selected-is-primitive="selectedIsPrimitive"
            :selected-is-light="selectedIsLight"
            :selected-position="selectedPosition"
            :selected-scale="selectedScale"
            :selected-rotation="selectedRotation"
            @select-object="handleSelectObject"
            @update-node-position="handleUpdateNodePosition"
            @update-node-scale="handleUpdateNodeScale"
            @update-node-rotation="handleUpdateNodeRotation"
            @update-light-position="handleUpdateLightPosition"
            @update-imported-position="handleInspectorImportedPosition"
            @update-imported-scale="handleInspectorImportedScale"
            @update-imported-rotation="handleInspectorImportedRotation"
            @rename-scene="handleRenameScene"
          />
        </template>
      </ResizablePanels>
    </section>
    <input
      ref="modelInput"
      type="file"
      :accept="modelAccept"
      multiple
      class="workspace__file-input"
      @change="handleModelImport"
    />
  </AppShell>
</template>
