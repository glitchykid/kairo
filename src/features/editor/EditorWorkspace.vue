<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { ref } from 'vue'
import AppShell from '@/ui/components/layout/AppShell.vue'
import ResizablePanels from '@/ui/components/layout/ResizablePanels.vue'
import EditorMenuBar from '@/ui/components/menu/EditorMenuBar.vue'
import SceneInspector from '@/ui/components/panels/SceneInspector.vue'
import ViewportCanvas from '@/ui/components/viewport/ViewportCanvas.vue'
import { buildModelAcceptString } from '@/features/editor/types/imported-model'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
const modelInput = ref<HTMLInputElement | null>(null)
const modelAccept = buildModelAcceptString()
const selectedObjectId = ref<string | null>(null)
const selectedIsPrimitive = ref(false)
let blockSaveShortcutHandler: ((event: KeyboardEvent) => void) | null = null

async function hydrateEditor(): Promise<void> {
  try {
    await editorStore.hydrate()
  } catch (error) {
    console.error('Failed to hydrate editor state.', error)
  }
}

onMounted(() => {
  void hydrateEditor()

  blockSaveShortcutHandler = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  window.addEventListener('keydown', blockSaveShortcutHandler)
})

function handleAddCube(): void {
  void editorStore.addCubeNode()
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

function handleUpdateNodePosition(nodeId: string, position: { x: number; y: number; z: number }): void {
  void editorStore.updateNodePositionById(nodeId, position)
}

function handleSelectObject(objectId: string, isPrimitive: boolean): void {
  selectedObjectId.value = objectId
  selectedIsPrimitive.value = isPrimitive
}

onBeforeUnmount(() => {
  if (blockSaveShortcutHandler) {
    window.removeEventListener('keydown', blockSaveShortcutHandler)
  }
  blockSaveShortcutHandler = null
})
</script>

<template>
  <AppShell>
    <template #menu>
      <EditorMenuBar @add-cube="handleAddCube" @import-model="openImportDialog" />
    </template>
    <section class="workspace">
      <ResizablePanels :initial-secondary-width="360">
        <template #primary>
          <ViewportCanvas
            :scene-data="editorStore.activeScene"
            :imported-assets="editorStore.importedAssets"
            :selected-object-id="selectedObjectId"
            :selected-is-primitive="selectedIsPrimitive"
            @request-add-cube="handleAddCube"
            @request-import-model="openImportDialog"
            @update-node-position="handleUpdateNodePosition"
          />
        </template>
        <template #secondary>
          <SceneInspector
            :scene="editorStore.activeScene"
            :imported-assets="editorStore.importedAssets"
            @select-object="handleSelectObject"
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
