import { describe, expect, it } from 'vitest'
import {
  PRIMITIVE_COLOR,
  WIREFRAME_COLOR,
  POLYGON_EDGE_COLOR,
  IMPORTED_DEFAULT_COLOR,
  CUBE_Y_OFFSET,
  SELECTION_BOX_COLOR,
} from '@/features/viewport'

describe('viewport constants', () => {
  it('PRIMITIVE_COLOR is a valid hex number', () => {
    expect(PRIMITIVE_COLOR).toBe(0x9099a4)
    expect(typeof PRIMITIVE_COLOR).toBe('number')
  })

  it('WIREFRAME_COLOR is bright green', () => {
    expect(WIREFRAME_COLOR).toBe(0x00ff00)
  })

  it('POLYGON_EDGE_COLOR is near-black', () => {
    expect(POLYGON_EDGE_COLOR).toBe(0x1a1a1a)
  })

  it('IMPORTED_DEFAULT_COLOR is a valid hex number', () => {
    expect(IMPORTED_DEFAULT_COLOR).toBe(0xa1a8b2)
  })

  it('CUBE_Y_OFFSET is 0.5', () => {
    expect(CUBE_Y_OFFSET).toBe(0.5)
  })

  it('SELECTION_BOX_COLOR is a valid hex number', () => {
    expect(SELECTION_BOX_COLOR).toBe(0x00bfff)
    expect(typeof SELECTION_BOX_COLOR).toBe('number')
  })
})
