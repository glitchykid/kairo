import { afterEach, describe, expect, it } from 'vitest'
import { addCube, createScene } from '@/features/scene/use-cases/scene-editor'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'
import { DexieSceneRepository } from '@/infrastructure/indexeddb/scene-repository.dexie'

describe('DexieSceneRepository', () => {
  const db = new KairoDb(`kairo-scene-repo-test-${Date.now()}`)
  const repository = new DexieSceneRepository(db)

  afterEach(async () => {
    await db.scenes.clear()
  })

  it('persists and reloads a scene', async () => {
    const scene = addCube(createScene('Persisted Scene'))
    await repository.save(scene)

    const loaded = await repository.getById(scene.id)

    expect(loaded?.id).toBe(scene.id)
    expect(loaded?.nodes).toHaveLength(1)
    expect(loaded?.nodes[0]?.primitive).toBe('box')
  })
})
