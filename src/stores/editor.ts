import { ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import type { SceneEntity } from '@/core/scene/types'
import { createScene, addCube, deleteNode, updateNodePosition } from '@/features/scene/use-cases/scene-editor'
import {
  detectModelFormat,
  type ImportedModelAsset,
  type StoredModelAsset,
} from '@/features/editor/types/imported-model'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'
import { DexieModelAssetRepository } from '@/infrastructure/indexeddb/model-asset-repository.dexie'
import { DexieSceneRepository } from '@/infrastructure/indexeddb/scene-repository.dexie'

const db = new KairoDb()
const sceneRepository = new DexieSceneRepository(db)
const modelAssetRepository = new DexieModelAssetRepository(db)

export const useEditorStore = defineStore('editor', () => {
  const activeScene = ref<SceneEntity>(createScene())
  const importedAssets = ref<ImportedModelAsset[]>([])
  const isHydrating = ref(false)
  const trackedObjectUrls = ref<string[]>([])

  function makeSceneSnapshot(): SceneEntity {
    return structuredClone(toRaw(activeScene.value))
  }

  function createAssetId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function mapStoredAssetToRuntime(asset: StoredModelAsset): ImportedModelAsset {
    const url = URL.createObjectURL(asset.blob)
    trackedObjectUrls.value.push(url)
    return {
      id: asset.id,
      name: asset.name,
      format: asset.format,
      url,
    }
  }

  function clearTrackedObjectUrls(): void {
    trackedObjectUrls.value.forEach((url) => URL.revokeObjectURL(url))
    trackedObjectUrls.value = []
  }

  async function hydrate(): Promise<void> {
    isHydrating.value = true
    const storedScene = await sceneRepository.getById(activeScene.value.id)
    if (storedScene) {
      activeScene.value = storedScene
    } else {
      await sceneRepository.save(makeSceneSnapshot())
    }

    clearTrackedObjectUrls()
    const storedAssets = await modelAssetRepository.getAll()
    importedAssets.value = storedAssets.map(mapStoredAssetToRuntime)
    isHydrating.value = false
  }

  async function addCubeNode(): Promise<void> {
    activeScene.value = addCube(activeScene.value)
    await sceneRepository.save(makeSceneSnapshot())
  }

  async function importModelFiles(files: File[]): Promise<void> {
    const assetsToPersist: StoredModelAsset[] = []

    for (const file of files) {
      const format = detectModelFormat(file.name)
      if (!format) continue

      assetsToPersist.push({
        id: createAssetId(),
        name: file.name,
        format,
        blob: file,
        createdAt: Date.now(),
      })
    }

    if (assetsToPersist.length === 0) return

    await modelAssetRepository.saveMany(assetsToPersist)
    importedAssets.value.push(...assetsToPersist.map(mapStoredAssetToRuntime))
  }

  async function deleteNodeById(nodeId: string): Promise<void> {
    activeScene.value = deleteNode(activeScene.value, nodeId)
    await sceneRepository.save(makeSceneSnapshot())
  }

  async function deleteImportedModel(assetId: string): Promise<void> {
    const asset = importedAssets.value.find((a) => a.id === assetId)
    if (asset) {
      URL.revokeObjectURL(asset.url)
      trackedObjectUrls.value = trackedObjectUrls.value.filter((url) => url !== asset.url)
    }
    importedAssets.value = importedAssets.value.filter((a) => a.id !== assetId)
    await modelAssetRepository.deleteById(assetId)
  }

  async function updateNodePositionById(nodeId: string, position: { x: number; y: number; z: number }): Promise<void> {
    activeScene.value = updateNodePosition(activeScene.value, nodeId, position)
    await sceneRepository.save(makeSceneSnapshot())
  }

  return {
    activeScene,
    importedAssets,
    isHydrating,
    hydrate,
    addCubeNode,
    importModelFiles,
    deleteNodeById,
    deleteImportedModel,
    updateNodePositionById,
  }
})
