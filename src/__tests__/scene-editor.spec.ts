import { describe, expect, it } from 'vitest'
import {
  addCube,
  addLight,
  createScene,
  deleteNode,
  deleteLight,
  updateNodePosition,
  updateLightPosition,
} from '@/features/scene/use-cases/scene-editor'

describe('scene-editor use-cases', () => {
  it('creates an empty scene by default', () => {
    const scene = createScene()
    expect(scene.name).toBe('Untitled Scene')
    expect(scene.nodes).toHaveLength(0)
    expect(scene.lights).toHaveLength(0)
  })

  it('adds a cube node immutably', () => {
    const scene = createScene('Test Scene')
    const updated = addCube(scene)

    expect(scene.nodes).toHaveLength(0)
    expect(updated.nodes).toHaveLength(1)
    expect(updated.nodes[0]?.primitive).toBe('box')
  })

  it('deletes a node by id', () => {
    const scene = createScene()
    const withCube = addCube(scene)
    const nodeId = withCube.nodes[0]!.id

    const updated = deleteNode(withCube, nodeId)
    expect(updated.nodes).toHaveLength(0)
    expect(withCube.nodes).toHaveLength(1)
  })

  it('updateNodePosition updates the matching node', () => {
    const scene = createScene()
    const withCube = addCube(scene)
    const nodeId = withCube.nodes[0]!.id
    const newPos = { x: 1, y: 2, z: 3 }

    const updated = updateNodePosition(withCube, nodeId, newPos)
    expect(updated.nodes[0]?.position).toEqual(newPos)
    expect(withCube.nodes[0]?.position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('updateNodePosition leaves other nodes unchanged', () => {
    const scene = createScene()
    const withTwo = addCube(addCube(scene))
    const firstId = withTwo.nodes[0]!.id

    const updated = updateNodePosition(withTwo, firstId, { x: 1, y: 0, z: 0 })
    expect(updated.nodes[0]?.position).toEqual({ x: 1, y: 0, z: 0 })
    expect(updated.nodes[1]?.position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('adds a light node immutably', () => {
    const scene = createScene()
    const updated = addLight(scene)

    expect(scene.lights).toHaveLength(0)
    expect(updated.lights).toHaveLength(1)
    expect(updated.lights[0]?.type).toBe('light')
  })

  it('deletes a light by id', () => {
    const scene = createScene()
    const withLight = addLight(scene)
    const lightId = withLight.lights[0]!.id

    const updated = deleteLight(withLight, lightId)
    expect(updated.lights).toHaveLength(0)
  })

  it('updateLightPosition updates the matching light', () => {
    const scene = createScene()
    const withLight = addLight(scene)
    const lightId = withLight.lights[0]!.id
    const newPos = { x: 3, y: 5, z: 7 }

    const updated = updateLightPosition(withLight, lightId, newPos)
    expect(updated.lights[0]?.position).toEqual(newPos)
  })
})
