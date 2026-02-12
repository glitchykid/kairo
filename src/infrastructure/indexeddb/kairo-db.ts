import Dexie, { type EntityTable } from 'dexie'
import type { SceneEntity } from '@/core/scene/types'
import type { StoredModelAsset } from '@/features/editor/types/imported-model'

export class KairoDb extends Dexie {
  scenes!: EntityTable<SceneEntity, 'id'>
  modelAssets!: EntityTable<StoredModelAsset, 'id'>

  constructor(databaseName = 'kairo') {
    super(databaseName)

    this.version(1).stores({
      scenes: 'id, name, updatedAt',
    })

    this.version(2).stores({
      scenes: 'id, name, updatedAt',
      modelAssets: 'id, name, format, createdAt',
    })
  }
}
