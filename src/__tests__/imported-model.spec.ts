import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_MODEL_FORMATS,
  buildModelAcceptString,
  detectModelFormat,
} from '@/features/editor/types/imported-model'

describe('imported-model utilities', () => {
  it('detects supported formats case-insensitively', () => {
    expect(detectModelFormat('scene.GLB')).toBe('glb')
    expect(detectModelFormat('mesh.obj')).toBe('obj')
    expect(detectModelFormat('unknown.txt')).toBeUndefined()
  })

  it('builds an accept string containing all formats', () => {
    const accept = buildModelAcceptString()
    for (const format of SUPPORTED_MODEL_FORMATS) {
      expect(accept).toContain(`.${format}`)
    }
  })
})
