export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane'

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
  scale?: Transform
  rotation?: Transform
}

export interface LightNode {
  id: string
  type: 'light'
  position: Transform
}

export type SceneNodeOrLight = SceneNode | LightNode

export interface SceneEntity {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  nodes: SceneNode[]
  lights: LightNode[]
}

export interface SceneRepository {
  save(scene: SceneEntity): Promise<void>
  getById(sceneId: string): Promise<SceneEntity | undefined>
}
