import type { SceneEntity, SceneRepository } from '@/core/scene/types'
import { KairoDb } from '@/infrastructure/indexeddb/kairo-db'

export class DexieSceneRepository implements SceneRepository {
  constructor(private readonly db: KairoDb) {}

  async save(scene: SceneEntity): Promise<void> {
    await this.db.scenes.put(structuredClone(scene))
  }

  async getById(sceneId: string): Promise<SceneEntity | undefined> {
    const scene = await this.db.scenes.get(sceneId)
    return scene ? structuredClone(scene) : undefined
  }
}
