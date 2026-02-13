import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'

describe('editor store', () => {
  const db = new KairoDb()
  let objectUrlCounter = 0

  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.scenes.clear()
    await db.modelAssets.clear()
    objectUrlCounter = 0

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => `blob:test-${++objectUrlCounter}`),
      revokeObjectURL: vi.fn(),
    })
  })

  it('hydrates and persists scene changes', async () => {
    const store = useEditorStore()
    await store.hydrate()
    expect(store.activeScene.nodes).toHaveLength(0)

    await store.addCubeNode()
    expect(store.activeScene.nodes).toHaveLength(1)
  })

  it('imports model files and reloads them from indexeddb', async () => {
    const store = useEditorStore()
    await store.hydrate()

    const file = new File(['x'], 'mesh.glb', { type: 'model/gltf-binary' })
    await store.importModelFiles([file])
    expect(store.importedAssets).toHaveLength(1)

    setActivePinia(createPinia())
    const reloadedStore = useEditorStore()
    await reloadedStore.hydrate()
    expect(reloadedStore.importedAssets).toHaveLength(1)
    expect(reloadedStore.importedAssets[0]?.name).toBe('mesh.glb')
  })

  it('skips files with unsupported format', async () => {
    const store = useEditorStore()
    await store.hydrate()

    const file = new File(['x'], 'doc.txt', { type: 'text/plain' })
    await store.importModelFiles([file])
    expect(store.importedAssets).toHaveLength(0)
  })

  it('deletes nodes and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addCubeNode()
    const nodeId = store.activeScene.nodes[0]!.id

    await store.deleteNodeById(nodeId)
    expect(store.activeScene.nodes).toHaveLength(0)

    setActivePinia(createPinia())
    const reloaded = useEditorStore()
    await reloaded.hydrate()
    expect(reloaded.activeScene.nodes).toHaveLength(0)
  })

  it('updates node position and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addCubeNode()
    const nodeId = store.activeScene.nodes[0]!.id

    await store.updateNodePositionById(nodeId, { x: 5, y: 10, z: 15 })
    expect(store.activeScene.nodes[0]?.position).toEqual({ x: 5, y: 10, z: 15 })

    await store.hydrate()
    expect(store.activeScene.nodes[0]?.position).toEqual({ x: 5, y: 10, z: 15 })
  })

  it('deletes imported model and revokes object URL', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const store = useEditorStore()
    await store.hydrate()

    const file = new File(['x'], 'mesh.glb', { type: 'model/gltf-binary' })
    await store.importModelFiles([file])
    const assetId = store.importedAssets[0]!.id

    await store.deleteImportedModel(assetId)
    expect(store.importedAssets).toHaveLength(0)
    expect(revokeSpy).toHaveBeenCalled()
  })

  it('deleteImportedModel is no-op when asset not found', async () => {
    const store = useEditorStore()
    await store.hydrate()

    await store.deleteImportedModel('nonexistent-id')
    expect(store.importedAssets).toHaveLength(0)
  })

  it('importModelFiles does nothing when all files have unsupported format', async () => {
    const store = useEditorStore()
    await store.hydrate()

    await store.importModelFiles([
      new File(['x'], 'a.txt'),
      new File(['x'], 'b.pdf'),
    ])
    expect(store.importedAssets).toHaveLength(0)
  })
})
