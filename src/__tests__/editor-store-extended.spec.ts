import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'

describe('editor store – lights & extended coverage', () => {
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

  it('adds a light node and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addLightNode()

    expect(store.activeScene.lights).toHaveLength(1)
    expect(store.activeScene.lights[0]?.type).toBe('light')
  })

  it('deletes a light node and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addLightNode()
    const lightId = store.activeScene.lights[0]!.id

    await store.deleteLightById(lightId)
    expect(store.activeScene.lights).toHaveLength(0)

    setActivePinia(createPinia())
    const reloaded = useEditorStore()
    await reloaded.hydrate()
    expect(reloaded.activeScene.lights).toHaveLength(0)
  })

  it('updates light position and persists across hydrate', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addLightNode()
    const lightId = store.activeScene.lights[0]!.id

    await store.updateLightPositionById(lightId, { x: 3, y: 5, z: 7 })
    expect(store.activeScene.lights[0]?.position).toEqual({ x: 3, y: 5, z: 7 })

    // Re-hydrate the same store (same scene ID)
    await store.hydrate()
    expect(store.activeScene.lights[0]?.position).toEqual({ x: 3, y: 5, z: 7 })
  })

  it('hydrate restores scene nodes and lights from indexeddb', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addCubeNode()
    await store.addLightNode()

    expect(store.activeScene.nodes).toHaveLength(1)
    expect(store.activeScene.lights).toHaveLength(1)

    // Re-hydrate the same store
    await store.hydrate()
    expect(store.activeScene.nodes).toHaveLength(1)
    expect(store.activeScene.lights).toHaveLength(1)
  })

  it('hydrate creates a new scene when none exists', async () => {
    await db.scenes.clear()
    const store = useEditorStore()
    await store.hydrate()

    expect(store.activeScene.name).toBe('Untitled Scene')
    expect(store.activeScene.nodes).toHaveLength(0)
  })

  it('importModelFiles handles multiple files with mixed formats', async () => {
    const store = useEditorStore()
    await store.hydrate()

    await store.importModelFiles([
      new File(['x'], 'mesh.glb', { type: 'model/gltf-binary' }),
      new File(['y'], 'bad.txt', { type: 'text/plain' }),
      new File(['z'], 'model.obj', { type: 'model/obj' }),
    ])

    expect(store.importedAssets).toHaveLength(2)
    expect(store.importedAssets.map((a) => a.format)).toEqual(['glb', 'obj'])
  })

  it('multiple addCubeNode calls create separate nodes', async () => {
    const store = useEditorStore()
    await store.hydrate()

    await store.addCubeNode()
    await store.addCubeNode()
    await store.addCubeNode()

    expect(store.activeScene.nodes).toHaveLength(3)
    const ids = store.activeScene.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(3)
  })

  /* ── addPrimitiveNode tests ──────────────────────────────────────── */

  it('addPrimitiveNode adds a sphere', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addPrimitiveNode('sphere')

    expect(store.activeScene.nodes).toHaveLength(1)
    expect(store.activeScene.nodes[0]!.primitive).toBe('sphere')
  })

  it('addPrimitiveNode adds all primitive types', async () => {
    const store = useEditorStore()
    await store.hydrate()

    const types = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'] as const
    for (const type of types) {
      await store.addPrimitiveNode(type)
    }

    expect(store.activeScene.nodes).toHaveLength(6)
    expect(store.activeScene.nodes.map((n) => n.primitive)).toEqual([...types])
  })

  /* ── updateNodeScaleById tests ───────────────────────────────────── */

  it('updates node scale and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addPrimitiveNode('box')
    const nodeId = store.activeScene.nodes[0]!.id

    await store.updateNodeScaleById(nodeId, { x: 2, y: 3, z: 4 })
    expect(store.activeScene.nodes[0]!.scale).toEqual({ x: 2, y: 3, z: 4 })

    // Re-hydrate
    await store.hydrate()
    expect(store.activeScene.nodes[0]!.scale).toEqual({ x: 2, y: 3, z: 4 })
  })

  /* ── updateNodeRotationById tests ────────────────────────────────── */

  it('updates node rotation and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()
    await store.addPrimitiveNode('box')
    const nodeId = store.activeScene.nodes[0]!.id

    await store.updateNodeRotationById(nodeId, { x: 45, y: 90, z: 180 })
    expect(store.activeScene.nodes[0]!.rotation).toEqual({ x: 45, y: 90, z: 180 })

    // Re-hydrate
    await store.hydrate()
    expect(store.activeScene.nodes[0]!.rotation).toEqual({ x: 45, y: 90, z: 180 })
  })

  /* ── renameActiveScene tests ─────────────────────────────────────── */

  it('renames the active scene and persists', async () => {
    const store = useEditorStore()
    await store.hydrate()

    await store.renameActiveScene('My Custom Scene')
    expect(store.activeScene.name).toBe('My Custom Scene')

    // Re-hydrate
    await store.hydrate()
    expect(store.activeScene.name).toBe('My Custom Scene')
  })
})
