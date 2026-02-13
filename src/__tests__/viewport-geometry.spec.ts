import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { offsetEdgeGeometry } from '@/features/editor/services/viewport-geometry'

describe('viewport-geometry', () => {
  describe('offsetEdgeGeometry', () => {
    it('returns geometry with vertices offset outward from centroid', () => {
      const box = new THREE.BoxGeometry(1, 1, 1)
      const edges = new THREE.EdgesGeometry(box)
      const result = offsetEdgeGeometry(edges)

      expect(result).toBeInstanceOf(THREE.BufferGeometry)
      const origPos = edges.attributes.position
      const newPos = result.attributes.position
      expect(origPos).toBeDefined()
      expect(newPos).toBeDefined()
      expect(newPos!.count).toBe(origPos!.count)

      // Centroid of unit cube edges is near (0.5, 0.5, 0.5) - vertices should be pushed outward
      const origArray = origPos!.array as Float32Array
      const newArray = newPos!.array as Float32Array

      for (let i = 0; i < origPos!.count; i++) {
        const ox = origArray[i * 3] ?? 0
        const oy = origArray[i * 3 + 1] ?? 0
        const oz = origArray[i * 3 + 2] ?? 0
        const nx = newArray[i * 3] ?? 0
        const ny = newArray[i * 3 + 1] ?? 0
        const nz = newArray[i * 3 + 2] ?? 0

        const origLen = Math.sqrt(ox * ox + oy * oy + oz * oz)
        const newLen = Math.sqrt(nx * nx + ny * ny + nz * nz)
        // Vertices should be slightly farther from origin (pushed outward)
        expect(newLen).toBeGreaterThanOrEqual(origLen - 0.0001)
      }

      box.dispose()
      edges.dispose()
      result.dispose()
    })

    it('returns input geometry when position attribute is missing', () => {
      const box = new THREE.BoxGeometry(1, 1, 1)
      const edges = new THREE.EdgesGeometry(box)
      const noPos = edges.clone()
      noPos.deleteAttribute('position')

      const result = offsetEdgeGeometry(noPos as THREE.EdgesGeometry)
      expect(result).toBe(noPos)

      box.dispose()
      edges.dispose()
    })

    it('handles geometry with coincident vertices (len=0)', () => {
      const geom = new THREE.BufferGeometry()
      geom.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1))
      geom.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), 3))
      geom.computeVertexNormals()
      const edges = new THREE.EdgesGeometry(geom)
      const result = offsetEdgeGeometry(edges)
      expect(result.attributes.position).toBeDefined()
      geom.dispose()
      edges.dispose()
      result.dispose()
    })

  })
})
