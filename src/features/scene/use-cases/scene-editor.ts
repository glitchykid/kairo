import type { SceneEntity, SceneNode, LightNode, Transform, PrimitiveType } from '@/core/scene/types'

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
    lights: [],
  }
}

export function renameScene(scene: SceneEntity, name: string): SceneEntity {
  return { ...scene, name, updatedAt: Date.now() }
}

export function addPrimitive(scene: SceneEntity, primitive: PrimitiveType = 'box'): SceneEntity {
  const newNode: SceneNode = {
    id: makeId('node'),
    type: 'mesh',
    primitive,
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
  }

  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: [...scene.nodes, newNode],
  }
}

/** @deprecated Use addPrimitive(scene, 'box') instead. */
export function addCube(scene: SceneEntity): SceneEntity {
  return addPrimitive(scene, 'box')
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

export function updateNodeScale(
  scene: SceneEntity,
  nodeId: string,
  scale: Transform,
): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: scene.nodes.map((node) =>
      node.id === nodeId ? { ...node, scale } : node,
    ),
  }
}

export function updateNodeRotation(
  scene: SceneEntity,
  nodeId: string,
  rotation: Transform,
): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    nodes: scene.nodes.map((node) =>
      node.id === nodeId ? { ...node, rotation } : node,
    ),
  }
}

export function addLight(scene: SceneEntity): SceneEntity {
  const newLight: LightNode = {
    id: makeId('light'),
    type: 'light',
    position: { x: 0, y: 2, z: 0 },
  }
  return {
    ...scene,
    updatedAt: Date.now(),
    lights: [...(scene.lights ?? []), newLight],
  }
}

export function deleteLight(scene: SceneEntity, lightId: string): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    lights: (scene.lights ?? []).filter((l) => l.id !== lightId),
  }
}

export function updateLightPosition(
  scene: SceneEntity,
  lightId: string,
  position: Transform,
): SceneEntity {
  return {
    ...scene,
    updatedAt: Date.now(),
    lights: (scene.lights ?? []).map((light) =>
      light.id === lightId ? { ...light, position } : light,
    ),
  }
}
