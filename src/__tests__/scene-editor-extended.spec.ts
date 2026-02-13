import { describe, expect, it } from 'vitest'
import {
  addCube,
  addPrimitive,
  addLight,
  createScene,
  deleteNode,
  deleteLight,
  updateNodePosition,
  updateNodeScale,
  updateNodeRotation,
  updateLightPosition,
  renameScene,
} from '@/features/scene/use-cases/scene-editor'

describe('scene-editor extended', () => {
  it('createScene uses custom name', () => {
    const scene = createScene('My Custom Scene')
    expect(scene.name).toBe('My Custom Scene')
  })

  it('createScene generates unique ids', () => {
    const s1 = createScene()
    const s2 = createScene()
    expect(s1.id).not.toBe(s2.id)
  })

  it('createScene sets timestamps', () => {
    const before = Date.now()
    const scene = createScene()
    const after = Date.now()
    expect(scene.createdAt).toBeGreaterThanOrEqual(before)
    expect(scene.createdAt).toBeLessThanOrEqual(after)
    expect(scene.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('addCube generates unique node ids across calls', () => {
    const scene = createScene()
    const with1 = addCube(scene)
    const with2 = addCube(with1)
    expect(with2.nodes[0]!.id).not.toBe(with2.nodes[1]!.id)
  })

  it('addCube default position is (0,0,0)', () => {
    const scene = createScene()
    const updated = addCube(scene)
    expect(updated.nodes[0]!.position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('addCube updates the updatedAt timestamp', () => {
    const scene = createScene()
    const updated = addCube(scene)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(scene.updatedAt)
  })

  it('deleteNode is no-op for non-existent id', () => {
    const scene = addCube(createScene())
    const updated = deleteNode(scene, 'non-existent-id')
    expect(updated.nodes).toHaveLength(1)
  })

  it('deleteNode updates the updatedAt timestamp', () => {
    const scene = addCube(createScene())
    const nodeId = scene.nodes[0]!.id
    const updated = deleteNode(scene, nodeId)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(scene.updatedAt)
  })

  it('updateNodePosition is no-op for non-existent id', () => {
    const scene = addCube(createScene())
    const updated = updateNodePosition(scene, 'non-existent', { x: 99, y: 99, z: 99 })
    expect(updated.nodes[0]!.position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('addLight default position is (0,2,0)', () => {
    const scene = createScene()
    const updated = addLight(scene)
    expect(updated.lights[0]!.position).toEqual({ x: 0, y: 2, z: 0 })
  })

  it('addLight generates unique ids', () => {
    const scene = createScene()
    const with1 = addLight(scene)
    const with2 = addLight(with1)
    expect(with2.lights[0]!.id).not.toBe(with2.lights[1]!.id)
  })

  it('deleteLight is no-op for non-existent id', () => {
    const scene = addLight(createScene())
    const updated = deleteLight(scene, 'non-existent-id')
    expect(updated.lights).toHaveLength(1)
  })

  it('updateLightPosition is no-op for non-existent id', () => {
    const scene = addLight(createScene())
    const updated = updateLightPosition(scene, 'non-existent', { x: 99, y: 99, z: 99 })
    expect(updated.lights[0]!.position).toEqual({ x: 0, y: 2, z: 0 })
  })

  it('addLight handles scene with no lights array', () => {
    const scene = createScene()
    // Simulate a scene loaded from old format without lights
    const legacyScene = { ...scene, lights: undefined as unknown as typeof scene.lights }
    const updated = addLight(legacyScene)
    expect(updated.lights).toHaveLength(1)
  })

  it('deleteLight handles scene with no lights array', () => {
    const scene = createScene()
    const legacyScene = { ...scene, lights: undefined as unknown as typeof scene.lights }
    const updated = deleteLight(legacyScene, 'any-id')
    expect(updated.lights).toHaveLength(0)
  })

  it('updateLightPosition handles scene with no lights array', () => {
    const scene = createScene()
    const legacyScene = { ...scene, lights: undefined as unknown as typeof scene.lights }
    const updated = updateLightPosition(legacyScene, 'any-id', { x: 1, y: 1, z: 1 })
    expect(updated.lights).toHaveLength(0)
  })

  it('multiple operations maintain immutability', () => {
    const scene = createScene()
    const s1 = addCube(scene)
    const s2 = addCube(s1)
    const s3 = addLight(s2)
    const s4 = deleteNode(s3, s1.nodes[0]!.id)

    expect(scene.nodes).toHaveLength(0)
    expect(s1.nodes).toHaveLength(1)
    expect(s2.nodes).toHaveLength(2)
    expect(s3.lights).toHaveLength(1)
    expect(s4.nodes).toHaveLength(1)
    expect(s4.lights).toHaveLength(1)
  })

  /* ── addPrimitive tests ──────────────────────────────────────────── */

  it('addPrimitive defaults to box', () => {
    const scene = createScene()
    const updated = addPrimitive(scene)
    expect(updated.nodes[0]!.primitive).toBe('box')
  })

  it('addPrimitive creates sphere', () => {
    const scene = createScene()
    const updated = addPrimitive(scene, 'sphere')
    expect(updated.nodes[0]!.primitive).toBe('sphere')
  })

  it('addPrimitive creates cylinder', () => {
    const updated = addPrimitive(createScene(), 'cylinder')
    expect(updated.nodes[0]!.primitive).toBe('cylinder')
  })

  it('addPrimitive creates cone', () => {
    const updated = addPrimitive(createScene(), 'cone')
    expect(updated.nodes[0]!.primitive).toBe('cone')
  })

  it('addPrimitive creates torus', () => {
    const updated = addPrimitive(createScene(), 'torus')
    expect(updated.nodes[0]!.primitive).toBe('torus')
  })

  it('addPrimitive creates plane', () => {
    const updated = addPrimitive(createScene(), 'plane')
    expect(updated.nodes[0]!.primitive).toBe('plane')
  })

  it('addPrimitive sets default scale to (1,1,1)', () => {
    const scene = addPrimitive(createScene(), 'sphere')
    expect(scene.nodes[0]!.scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('addPrimitive sets default rotation to (0,0,0)', () => {
    const scene = addPrimitive(createScene(), 'sphere')
    expect(scene.nodes[0]!.rotation).toEqual({ x: 0, y: 0, z: 0 })
  })

  /* ── renameScene tests ───────────────────────────────────────────── */

  it('renameScene changes the name', () => {
    const scene = createScene('Old Name')
    const updated = renameScene(scene, 'New Name')
    expect(updated.name).toBe('New Name')
    expect(scene.name).toBe('Old Name') // immutable
  })

  it('renameScene updates updatedAt', () => {
    const scene = createScene()
    const updated = renameScene(scene, 'Renamed')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(scene.updatedAt)
  })

  /* ── updateNodeScale tests ───────────────────────────────────────── */

  it('updateNodeScale changes the scale', () => {
    const scene = addPrimitive(createScene(), 'box')
    const nodeId = scene.nodes[0]!.id
    const updated = updateNodeScale(scene, nodeId, { x: 2, y: 3, z: 4 })
    expect(updated.nodes[0]!.scale).toEqual({ x: 2, y: 3, z: 4 })
  })

  it('updateNodeScale is immutable', () => {
    const scene = addPrimitive(createScene(), 'box')
    const nodeId = scene.nodes[0]!.id
    updateNodeScale(scene, nodeId, { x: 2, y: 3, z: 4 })
    expect(scene.nodes[0]!.scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('updateNodeScale is no-op for non-existent id', () => {
    const scene = addPrimitive(createScene(), 'box')
    const updated = updateNodeScale(scene, 'non-existent', { x: 2, y: 2, z: 2 })
    expect(updated.nodes[0]!.scale).toEqual({ x: 1, y: 1, z: 1 })
  })

  /* ── updateNodeRotation tests ────────────────────────────────────── */

  it('updateNodeRotation changes the rotation', () => {
    const scene = addPrimitive(createScene(), 'box')
    const nodeId = scene.nodes[0]!.id
    const updated = updateNodeRotation(scene, nodeId, { x: 45, y: 90, z: 180 })
    expect(updated.nodes[0]!.rotation).toEqual({ x: 45, y: 90, z: 180 })
  })

  it('updateNodeRotation is immutable', () => {
    const scene = addPrimitive(createScene(), 'box')
    const nodeId = scene.nodes[0]!.id
    updateNodeRotation(scene, nodeId, { x: 45, y: 90, z: 180 })
    expect(scene.nodes[0]!.rotation).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('updateNodeRotation is no-op for non-existent id', () => {
    const scene = addPrimitive(createScene(), 'box')
    const updated = updateNodeRotation(scene, 'non-existent', { x: 45, y: 45, z: 45 })
    expect(updated.nodes[0]!.rotation).toEqual({ x: 0, y: 0, z: 0 })
  })
})
