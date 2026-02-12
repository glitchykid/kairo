import type { ModelAssetRepository, StoredModelAsset } from '@/features/editor/types/imported-model'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'

export class DexieModelAssetRepository implements ModelAssetRepository {
  constructor(private readonly db: KairoDb) {}

  async getAll(): Promise<StoredModelAsset[]> {
    const assets = await this.db.modelAssets.orderBy('createdAt').toArray()
    return structuredClone(assets)
  }

  async saveMany(assets: StoredModelAsset[]): Promise<void> {
    await this.db.modelAssets.bulkPut(structuredClone(assets))
  }

  async deleteById(assetId: string): Promise<void> {
    await this.db.modelAssets.delete(assetId)
  }
}
