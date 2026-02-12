import { describe, expect, it } from 'vitest'
import { addCube, createScene } from '@/features/scene/use-cases/scene-editor'

describe('scene-editor use-cases', () => {
  it('creates an empty scene by default', () => {
    const scene = createScene()
    expect(scene.name).toBe('Untitled Scene')
    expect(scene.nodes).toHaveLength(0)
  })

  it('adds a cube node immutably', () => {
    const scene = createScene('Test Scene')
    const updated = addCube(scene)

    expect(scene.nodes).toHaveLength(0)
    expect(updated.nodes).toHaveLength(1)
    expect(updated.nodes[0]?.primitive).toBe('box')
  })
})
