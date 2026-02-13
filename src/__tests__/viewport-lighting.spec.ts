import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyMaterialsForLighting } from '@/features/viewport'

function makeMeshMap(): Map<string, THREE.Mesh> {
  const map = new Map<string, THREE.Mesh>()
  const geom = new THREE.BoxGeometry(1, 1, 1)
  const mat = new THREE.MeshBasicMaterial({ color: 0x9099a4 })
  map.set('prim-1', new THREE.Mesh(geom, mat))
  return map
}

function makeImportedMap(): Map<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>()
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 0xa1a8b2 })))
  map.set('import-1', group)
  return map
}

describe('viewport-lighting', () => {
  describe('applyMaterialsForLighting', () => {
    it('applies MeshStandardMaterial when scene has lights', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)

      prims.forEach((mesh) => {
        expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial)
      })
    })

    it('applies MeshBasicMaterial when scene has no lights', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(false, prims, imported, lightsGroup)

      prims.forEach((mesh) => {
        expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial)
      })
    })

    it('adds ambient light when scene has lights and none exists', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)

      const ambientLights = lightsGroup.children.filter((c) => c instanceof THREE.AmbientLight)
      expect(ambientLights.length).toBe(1)
    })

    it('does not duplicate ambient light if one already exists', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)
      applyMaterialsForLighting(true, prims, imported, lightsGroup)

      const ambientLights = lightsGroup.children.filter((c) => c instanceof THREE.AmbientLight)
      expect(ambientLights.length).toBe(1)
    })

    it('removes ambient light when scene has no lights', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)
      expect(lightsGroup.children.filter((c) => c instanceof THREE.AmbientLight).length).toBe(1)

      applyMaterialsForLighting(false, prims, imported, lightsGroup)
      expect(lightsGroup.children.filter((c) => c instanceof THREE.AmbientLight).length).toBe(0)
    })

    it('applies lit material to imported objects', () => {
      const prims = makeMeshMap()
      const imported = makeImportedMap()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)

      imported.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            expect(child.material).toBeInstanceOf(THREE.MeshStandardMaterial)
          }
        })
      })
    })

    it('preserves color when switching material types', () => {
      const prims = new Map<string, THREE.Mesh>()
      const geom = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      prims.set('colored', new THREE.Mesh(geom, mat))

      const imported = new Map<string, THREE.Object3D>()
      const lightsGroup = new THREE.Group()

      applyMaterialsForLighting(true, prims, imported, lightsGroup)

      const newMat = prims.get('colored')!.material as THREE.MeshStandardMaterial
      expect(newMat.color.getHex()).toBe(0xff0000)
    })

    it('handles empty maps gracefully', () => {
      const emptyPrims = new Map<string, THREE.Mesh>()
      const emptyImported = new Map<string, THREE.Object3D>()
      const lightsGroup = new THREE.Group()

      expect(() => applyMaterialsForLighting(true, emptyPrims, emptyImported, lightsGroup)).not.toThrow()
      expect(() => applyMaterialsForLighting(false, emptyPrims, emptyImported, lightsGroup)).not.toThrow()
    })
  })
})
