import { ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import type { PrimitiveType, SceneEntity } from '@/core/scene/types'
import {
  createScene,
  addPrimitive,
  deleteNode,
  updateNodePosition,
  updateNodeScale,
  updateNodeRotation,
  addLight,
  deleteLight,
  updateLightPosition,
  renameScene,
} from '@/features/scene/use-cases/scene-editor'
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
    return JSON.parse(JSON.stringify(toRaw(activeScene.value)))
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
      activeScene.value = {
        ...storedScene,
        lights: storedScene.lights ?? [],
      }
    } else {
      await sceneRepository.save(makeSceneSnapshot())
    }

    clearTrackedObjectUrls()
    const storedAssets = await modelAssetRepository.getAll()
    importedAssets.value = storedAssets.map(mapStoredAssetToRuntime)
    isHydrating.value = false
  }

  async function addPrimitiveNode(type: PrimitiveType = 'box'): Promise<void> {
    activeScene.value = addPrimitive(activeScene.value, type)
    await sceneRepository.save(makeSceneSnapshot())
  }

  /** @deprecated Use addPrimitiveNode('box') instead. */
  async function addCubeNode(): Promise<void> {
    return addPrimitiveNode('box')
  }

  async function addLightNode(): Promise<void> {
    activeScene.value = addLight(activeScene.value)
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

  async function deleteLightById(lightId: string): Promise<void> {
    activeScene.value = deleteLight(activeScene.value, lightId)
    await sceneRepository.save(makeSceneSnapshot())
  }

  async function updateLightPositionById(
    lightId: string,
    position: { x: number; y: number; z: number },
  ): Promise<void> {
    activeScene.value = updateLightPosition(activeScene.value, lightId, position)
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

  async function updateNodeScaleById(nodeId: string, scale: { x: number; y: number; z: number }): Promise<void> {
    activeScene.value = updateNodeScale(activeScene.value, nodeId, scale)
    await sceneRepository.save(makeSceneSnapshot())
  }

  async function updateNodeRotationById(nodeId: string, rotation: { x: number; y: number; z: number }): Promise<void> {
    activeScene.value = updateNodeRotation(activeScene.value, nodeId, rotation)
    await sceneRepository.save(makeSceneSnapshot())
  }

  async function renameActiveScene(name: string): Promise<void> {
    activeScene.value = renameScene(activeScene.value, name)
    await sceneRepository.save(makeSceneSnapshot())
  }

  return {
    activeScene,
    importedAssets,
    isHydrating,
    hydrate,
    addCubeNode,
    addPrimitiveNode,
    addLightNode,
    importModelFiles,
    deleteNodeById,
    deleteLightById,
    deleteImportedModel,
    updateNodePositionById,
    updateNodeScaleById,
    updateNodeRotationById,
    updateLightPositionById,
    renameActiveScene,
  }
})
