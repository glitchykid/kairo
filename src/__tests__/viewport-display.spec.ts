import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyDisplayMode, updatePolygonEdgesDisplay, updateVerticesDisplay } from '@/features/viewport'

const resolution = new THREE.Vector2(800, 600)

function makeMeshMap(count = 1): Map<string, THREE.Mesh> {
  const map = new Map<string, THREE.Mesh>()
  for (let i = 0; i < count; i++) {
    const geom = new THREE.BoxGeometry(1, 1, 1)
    geom.computeVertexNormals()
    const mat = new THREE.MeshBasicMaterial({ color: 0x9099a4 })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.name = `mesh-${i}`
    map.set(`mesh-${i}`, mesh)
  }
  return map
}

function makeImportedMap(count = 1): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>()
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group()
    const geom = new THREE.BoxGeometry(1, 1, 1)
    geom.computeVertexNormals()
    group.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0xa1a8b2 })))
    group.name = `imported-${i}`
    map.set(`imported-${i}`, group)
  }
  return map
}

describe('viewport-display', () => {
  describe('applyDisplayMode', () => {
    it('makes meshes nearly invisible in wireframe mode (no native wireframe)', () => {
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap()

      applyDisplayMode('wireframe', meshes, imported)

      meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshBasicMaterial
        // Native wireframe is never used — edge overlays provide clean wireframe
        expect(mat.wireframe).toBe(false)
        expect(mat.transparent).toBe(true)
        expect(mat.opacity).toBeCloseTo(0.03)
      })
    })

    it('restores solid mode on primitives', () => {
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap()

      applyDisplayMode('wireframe', meshes, imported)
      applyDisplayMode('solid', meshes, imported)

      meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshBasicMaterial
        expect(mat.wireframe).toBe(false)
        expect(mat.transparent).toBe(false)
        expect(mat.opacity).toBe(1.0)
      })
    })

    it('applies wireframe transparency to imported objects', () => {
      const meshes = makeMeshMap()
      const imported = makeImportedMap(1)

      applyDisplayMode('wireframe', meshes, imported)

      imported.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshBasicMaterial
            expect(mat.wireframe).toBe(false)
            expect(mat.transparent).toBe(true)
            expect(mat.opacity).toBeCloseTo(0.03)
          }
        })
      })
    })

    it('handles empty maps without errors', () => {
      const meshes = new Map<string, THREE.Mesh>()
      const imported = new Map<string, THREE.Object3D>()

      expect(() => applyDisplayMode('solid', meshes, imported)).not.toThrow()
      expect(() => applyDisplayMode('wireframe', meshes, imported)).not.toThrow()
    })

    it('restores primitive color in solid mode', () => {
      const meshes = makeMeshMap(1)
      const imported = makeImportedMap()

      applyDisplayMode('wireframe', meshes, imported)
      applyDisplayMode('solid', meshes, imported)

      const mat = meshes.get('mesh-0')!.material as THREE.MeshBasicMaterial
      expect(mat.color.getHex()).toBe(0x9099a4) // PRIMITIVE_COLOR
    })

    it('handles mesh with array material', () => {
      const meshes = new Map<string, THREE.Mesh>()
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mesh = new THREE.Mesh(geom, [
        new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
      ])
      meshes.set('array-mat', mesh)
      const imported = new Map<string, THREE.Object3D>()

      expect(() => applyDisplayMode('wireframe', meshes, imported)).not.toThrow()
      geom.dispose()
    })

    it('handles imported object with array material', () => {
      const meshes = new Map<string, THREE.Mesh>()
      const imported = new Map<string, THREE.Object3D>()
      const group = new THREE.Group()
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [
        new THREE.MeshBasicMaterial(),
        new THREE.MeshBasicMaterial(),
      ])
      group.add(mesh)
      imported.set('arr-imp', group)

      expect(() => applyDisplayMode('wireframe', meshes, imported)).not.toThrow()
    })

    it('sets emissive to black in wireframe mode for MeshStandardMaterial', () => {
      const meshes = new Map<string, THREE.Mesh>()
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({ color: 0x9099a4, emissive: 0xffffff })
      meshes.set('std-mesh', new THREE.Mesh(geom, mat))
      const imported = new Map<string, THREE.Object3D>()

      applyDisplayMode('wireframe', meshes, imported)

      const updatedMat = meshes.get('std-mesh')!.material as THREE.MeshStandardMaterial
      expect(updatedMat.wireframe).toBe(false)
      expect(updatedMat.transparent).toBe(true)
      expect(updatedMat.emissive.getHex()).toBe(0x000000)
      geom.dispose()
    })

    it('sets polygonOffset on all materials', () => {
      const meshes = makeMeshMap(1)
      const imported = makeImportedMap(1)

      applyDisplayMode('solid', meshes, imported)

      meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.Material
        expect(mat.polygonOffset).toBe(true)
        expect(mat.polygonOffsetFactor).toBe(1)
      })
    })
  })

  describe('updatePolygonEdgesDisplay', () => {
    it('adds edge lines when enabled without selection (solid mode)', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap()

      updatePolygonEdgesDisplay('solid', true, null, false, false, meshes, imported, edgeHelpers, resolution)
      expect(edgeHelpers.children.length).toBeGreaterThan(0)
    })

    it('clears edges when disabled in solid mode', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap()

      updatePolygonEdgesDisplay('solid', true, null, false, false, meshes, imported, edgeHelpers, resolution)
      expect(edgeHelpers.children.length).toBeGreaterThan(0)

      updatePolygonEdgesDisplay('solid', false, null, false, false, meshes, imported, edgeHelpers, resolution)
      expect(edgeHelpers.children.length).toBe(0)
    })

    it('shows edges only for selected primitive', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(3)
      const imported = makeImportedMap()

      updatePolygonEdgesDisplay('solid', true, 'mesh-1', true, false, meshes, imported, edgeHelpers, resolution)
      expect(edgeHelpers.children.length).toBe(1)
    })

    it('shows edges only for selected imported object', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap(2)

      updatePolygonEdgesDisplay('solid', true, 'imported-0', false, false, meshes, imported, edgeHelpers, resolution)
      expect(edgeHelpers.children.length).toBeGreaterThan(0)
    })

    it('skips light selection (no edges for lights)', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(1)
      const imported = makeImportedMap()

      updatePolygonEdgesDisplay('solid', true, 'light-1', false, true, meshes, imported, edgeHelpers, resolution)
      // isLight = true means no selection target, so show all edges
      expect(edgeHelpers.children.length).toBeGreaterThan(0)
    })

    it('shows edges for ALL objects in wireframe mode (ignoring showPolygonEdges)', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap(1)

      // showPolygonEdges=false but wireframe mode forces edges on
      updatePolygonEdgesDisplay('wireframe', false, null, false, false, meshes, imported, edgeHelpers, resolution)
      // 2 primitive meshes + 1 imported child mesh = at least 3 line objects
      expect(edgeHelpers.children.length).toBeGreaterThanOrEqual(3)
    })

    it('shows all edges in wireframe mode even with a selection', () => {
      const edgeHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap(1)

      updatePolygonEdgesDisplay('wireframe', false, 'mesh-0', true, false, meshes, imported, edgeHelpers, resolution)
      // wireframe overrides selection filter — all objects get edges
      expect(edgeHelpers.children.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('updateVerticesDisplay', () => {
    it('shows vertex points when enabled', () => {
      const vertexHelpers = new THREE.Group()
      const meshes = makeMeshMap(1)
      const imported = makeImportedMap()

      updateVerticesDisplay(true, null, false, false, meshes, imported, vertexHelpers)
      expect(vertexHelpers.children.length).toBeGreaterThan(0)
    })

    it('clears vertices when disabled', () => {
      const vertexHelpers = new THREE.Group()
      const meshes = makeMeshMap(1)
      const imported = makeImportedMap()

      updateVerticesDisplay(true, null, false, false, meshes, imported, vertexHelpers)
      updateVerticesDisplay(false, null, false, false, meshes, imported, vertexHelpers)
      expect(vertexHelpers.children.length).toBe(0)
    })

    it('shows vertices only for selected primitive', () => {
      const vertexHelpers = new THREE.Group()
      const meshes = makeMeshMap(3)
      const imported = makeImportedMap()

      updateVerticesDisplay(true, 'mesh-1', true, false, meshes, imported, vertexHelpers)
      expect(vertexHelpers.children.length).toBe(1)
    })

    it('shows vertices only for selected imported object', () => {
      const vertexHelpers = new THREE.Group()
      const meshes = makeMeshMap()
      const imported = makeImportedMap(2)

      updateVerticesDisplay(true, 'imported-0', false, false, meshes, imported, vertexHelpers)
      expect(vertexHelpers.children.length).toBeGreaterThan(0)
    })

    it('shows all vertices when no selection and not light', () => {
      const vertexHelpers = new THREE.Group()
      const meshes = makeMeshMap(2)
      const imported = makeImportedMap(1)

      updateVerticesDisplay(true, null, false, false, meshes, imported, vertexHelpers)
      // 2 primitive meshes + 1 imported child mesh = 3 points groups
      expect(vertexHelpers.children.length).toBe(3)
    })
  })
})
