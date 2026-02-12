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
})
