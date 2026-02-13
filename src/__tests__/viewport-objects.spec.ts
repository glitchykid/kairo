import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

// Mock canvas 2d context for jsdom (no native canvas support)
const mockCtx = {
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  )
})

describe('viewport-objects', () => {
  describe('makeBoxGeometry', () => {
    it('creates a buffer geometry with position and index attributes', async () => {
      const { makeBoxGeometry } = await import('@/features/viewport/viewport-objects')
      const geom = makeBoxGeometry()

      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      expect(geom.attributes.position).toBeDefined()
      expect(geom.index).toBeTruthy()
      geom.dispose()
    })

    it('produces 24 vertices (4 per face × 6 faces)', async () => {
      const { makeBoxGeometry } = await import('@/features/viewport/viewport-objects')
      const geom = makeBoxGeometry()

      expect(geom.attributes.position!.count).toBe(24)
      geom.dispose()
    })

    it('produces 36 index entries (6 triangles × 2 per face × 3 vertices)', async () => {
      const { makeBoxGeometry } = await import('@/features/viewport/viewport-objects')
      const geom = makeBoxGeometry()

      expect(geom.index!.count).toBe(36)
      geom.dispose()
    })

    it('computes vertex normals', async () => {
      const { makeBoxGeometry } = await import('@/features/viewport/viewport-objects')
      const geom = makeBoxGeometry()

      expect(geom.attributes.normal).toBeDefined()
      geom.dispose()
    })
  })

  describe('alignObjectToGround', () => {
    it('centers object on XZ and places bottom at y=0', async () => {
      const { alignObjectToGround } = await import('@/features/viewport/viewport-objects')
      const geom = new THREE.BoxGeometry(2, 4, 2)
      const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial())
      mesh.position.set(5, 10, 5)
      mesh.updateMatrixWorld(true)

      alignObjectToGround(mesh)

      // After aligning, the bounding box bottom should be near y=0
      const box = new THREE.Box3().setFromObject(mesh)
      expect(box.min.y).toBeCloseTo(0, 1)
      geom.dispose()
    })

    it('handles empty objects without crashing', async () => {
      const { alignObjectToGround } = await import('@/features/viewport/viewport-objects')
      const group = new THREE.Group()

      expect(() => alignObjectToGround(group)).not.toThrow()
    })

    it('centers object horizontally', async () => {
      const { alignObjectToGround } = await import('@/features/viewport/viewport-objects')
      const geom = new THREE.BoxGeometry(2, 2, 2)
      const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial())
      mesh.position.set(10, 0, -10)
      mesh.updateMatrixWorld(true)

      alignObjectToGround(mesh)

      const box = new THREE.Box3().setFromObject(mesh)
      const center = box.getCenter(new THREE.Vector3())
      expect(center.x).toBeCloseTo(0, 0)
      expect(center.z).toBeCloseTo(0, 0)
      geom.dispose()
    })
  })

  describe('disposeObject3D', () => {
    it('disposes geometry and material of a mesh', async () => {
      const { disposeObject3D } = await import('@/features/viewport/viewport-objects')
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geom, mat)

      const geomSpy = vi.spyOn(geom, 'dispose')
      const matSpy = vi.spyOn(mat, 'dispose')

      disposeObject3D(mesh)
      expect(geomSpy).toHaveBeenCalled()
      expect(matSpy).toHaveBeenCalled()
    })

    it('disposes multiple materials on a mesh', async () => {
      const { disposeObject3D } = await import('@/features/viewport/viewport-objects')
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mat1 = new THREE.MeshBasicMaterial()
      const mat2 = new THREE.MeshBasicMaterial()
      const mesh = new THREE.Mesh(geom, [mat1, mat2])

      const mat1Spy = vi.spyOn(mat1, 'dispose')
      const mat2Spy = vi.spyOn(mat2, 'dispose')

      disposeObject3D(mesh)
      expect(mat1Spy).toHaveBeenCalled()
      expect(mat2Spy).toHaveBeenCalled()
    })

    it('disposes sprite material', async () => {
      const { disposeObject3D } = await import('@/features/viewport/viewport-objects')
      const mat = new THREE.SpriteMaterial()
      const sprite = new THREE.Sprite(mat)

      const matSpy = vi.spyOn(mat, 'dispose')
      disposeObject3D(sprite)
      expect(matSpy).toHaveBeenCalled()
    })

    it('traverses and disposes nested objects', async () => {
      const { disposeObject3D } = await import('@/features/viewport/viewport-objects')
      const group = new THREE.Group()
      const geom1 = new THREE.BoxGeometry()
      const geom2 = new THREE.BoxGeometry()
      const mat1 = new THREE.MeshBasicMaterial()
      const mat2 = new THREE.MeshBasicMaterial()

      group.add(new THREE.Mesh(geom1, mat1))
      group.add(new THREE.Mesh(geom2, mat2))

      const spy1 = vi.spyOn(geom1, 'dispose')
      const spy2 = vi.spyOn(geom2, 'dispose')

      disposeObject3D(group)
      expect(spy1).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })
  })

  describe('getPrimitiveYOffset', () => {
    it('returns 0.5 for box', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('box')).toBe(0.5)
    })

    it('returns 0.5 for sphere', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('sphere')).toBe(0.5)
    })

    it('returns 0.5 for cylinder', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('cylinder')).toBe(0.5)
    })

    it('returns 0.5 for cone', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('cone')).toBe(0.5)
    })

    it('returns 0.15 for torus', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('torus')).toBe(0.15)
    })

    it('returns 0 for plane', async () => {
      const { getPrimitiveYOffset } = await import('@/features/viewport/viewport-objects')
      expect(getPrimitiveYOffset('plane')).toBe(0)
    })
  })

  describe('makeGeometryForPrimitive', () => {
    it('returns a BufferGeometry for box', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('box')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      expect(geom.attributes.position).toBeDefined()
      geom.dispose()
    })

    it('returns a SphereGeometry for sphere', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('sphere')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      expect(geom.attributes.position!.count).toBeGreaterThan(24)
      geom.dispose()
    })

    it('returns a CylinderGeometry for cylinder', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('cylinder')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      geom.dispose()
    })

    it('returns a ConeGeometry for cone', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('cone')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      geom.dispose()
    })

    it('returns a rotated TorusGeometry for torus', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('torus')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      geom.dispose()
    })

    it('returns a rotated PlaneGeometry for plane', async () => {
      const { makeGeometryForPrimitive } = await import('@/features/viewport/viewport-objects')
      const geom = makeGeometryForPrimitive('plane')
      expect(geom).toBeInstanceOf(THREE.BufferGeometry)
      geom.dispose()
    })

    it('falls back to box for unknown type', async () => {
      const { makeGeometryForPrimitive, makeBoxGeometry } =
        await import('@/features/viewport/viewport-objects')
      const unknown = makeGeometryForPrimitive('unknown' as any)
      const box = makeBoxGeometry()
      // Both should have same vertex count
      expect(unknown.attributes.position!.count).toBe(box.attributes.position!.count)
      unknown.dispose()
      box.dispose()
    })
  })

  describe('makeLightBillboard', () => {
    it('creates a sprite with the given light id as name', async () => {
      // Reset module to force new texture creation
      vi.resetModules()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCtx as unknown as CanvasRenderingContext2D,
      )

      const { makeLightBillboard } = await import('@/features/viewport/viewport-objects')
      const sprite = makeLightBillboard('light-123')

      expect(sprite).toBeInstanceOf(THREE.Sprite)
      expect(sprite.name).toBe('light-123')
    })

    it('has scale set to 0.8', async () => {
      vi.resetModules()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCtx as unknown as CanvasRenderingContext2D,
      )

      const { makeLightBillboard } = await import('@/features/viewport/viewport-objects')
      const sprite = makeLightBillboard('light-456')

      expect(sprite.scale.x).toBeCloseTo(0.8)
      expect(sprite.scale.y).toBeCloseTo(0.8)
    })

    it('uses transparent sprite material', async () => {
      vi.resetModules()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCtx as unknown as CanvasRenderingContext2D,
      )

      const { makeLightBillboard } = await import('@/features/viewport/viewport-objects')
      const sprite = makeLightBillboard('light-789')

      expect(sprite.material).toBeInstanceOf(THREE.SpriteMaterial)
      expect(sprite.material.transparent).toBe(true)
    })
  })
})
