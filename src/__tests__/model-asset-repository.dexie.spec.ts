import { afterEach, describe, expect, it } from 'vitest'
import type { StoredModelAsset } from '@/features/editor/types/imported-model'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'
import { DexieModelAssetRepository } from '@/infrastructure/indexeddb/model-asset-repository.dexie'

describe('DexieModelAssetRepository', () => {
  const db = new KairoDb(`kairo-model-repo-test-${Date.now()}`)
  const repository = new DexieModelAssetRepository(db)

  afterEach(async () => {
    await db.modelAssets.clear()
  })

  it('saves and reads model assets in created order', async () => {
    const assets: StoredModelAsset[] = [
      {
        id: 'asset-1',
        name: 'first.glb',
        format: 'glb',
        blob: new Blob(['a']),
        createdAt: 1,
      },
      {
        id: 'asset-2',
        name: 'second.obj',
        format: 'obj',
        blob: new Blob(['b']),
        createdAt: 2,
      },
    ]

    await repository.saveMany(assets)
    const loaded = await repository.getAll()

    expect(loaded.map((asset) => asset.id)).toEqual(['asset-1', 'asset-2'])
    expect(loaded[0]?.name).toBe('first.glb')
  })
})
