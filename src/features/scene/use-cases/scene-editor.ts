import type { SceneEntity, SceneNode, Transform } from '@/core/scene/types'

const defaultSceneName = 'Untitled Scene'

function makeId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now()}_${randomPart}`
}

export function createScene(name = defaultSceneName): SceneEntity {
  const now = Date.now()
  return {
    id: makeId('scene'),
    name,
    createdAt: now,
    updatedAt: now,
    nodes: [],
  }
}

export function addCube(scene: SceneEntity): SceneEntity {
  const newNode: SceneNode = {
    id: makeId('node'),
    type: 'mesh',
    primitive: 'box',
    position: { x: 0, y: 0, z: 0 },
  }

  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: [...scene.nodes, newNode],
  }
}

export function deleteNode(scene: SceneEntity, nodeId: string): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: scene.nodes.filter((node) => node.id !== nodeId),
  }
}

export function updateNodePosition(
  scene: SceneEntity,
  nodeId: string,
  position: Transform,
): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: scene.nodes.map((node) =>
      node.id === nodeId ? { ...node, position } : node,
    ),
  }
}
