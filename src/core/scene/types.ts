export type PrimitiveType = 'box'

export interface Transform {
  x: number
  y: number
  z: number
}

export interface SceneNode {
  id: string
  type: 'mesh'
  primitive: PrimitiveType
  position: Transform
}

export interface SceneEntity {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  nodes: SceneNode[]
}

export interface SceneRepository {
  save(scene: SceneEntity): Promise<void>
  getById(sceneId: string): Promise<SceneEntity | undefined>
}
