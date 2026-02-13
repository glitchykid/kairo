import * as THREE from 'three'
import { PRIMITIVE_COLOR, IMPORTED_DEFAULT_COLOR } from './constants'

const litMat = (c: number) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.12 })
const unlitMat = (c: number) => new THREE.MeshBasicMaterial({ color: c })

/**
 * Applies materials to all meshes based on whether the scene has lights.
 * When hasLights: MeshStandardMaterial for lit rendering.
 * When !hasLights: MeshBasicMaterial for flat, unlit rendering.
 */
export function applyMaterialsForLighting(
  hasLights: boolean,
  primitiveMeshes: Map<string, THREE.Mesh>,
  importedObjects: Map<string, THREE.Object3D>,
  sceneLightsGroup: THREE.Group,
): void {
  primitiveMeshes.forEach((mesh) => {
    const oldMat = mesh.material as THREE.Material
    const c =
      oldMat && 'color' in oldMat && oldMat.color instanceof THREE.Color
        ? (oldMat.color as THREE.Color).getHex()
        : PRIMITIVE_COLOR
    const newMat = hasLights ? litMat(c) : unlitMat(c)
    mesh.material = newMat
    oldMat?.dispose?.()
  })

  importedObjects.forEach((object) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        const first = mats[0]
        const c =
          first && 'color' in first && first.color instanceof THREE.Color
            ? (first.color as THREE.Color).getHex()
            : IMPORTED_DEFAULT_COLOR
        const newMat = hasLights ? litMat(c) : unlitMat(c)
        child.material = newMat
        mats.forEach((m) => m?.dispose?.())
      }
    })
  })

  if (hasLights && !sceneLightsGroup.children.some((c) => c instanceof THREE.AmbientLight)) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3)
    sceneLightsGroup.add(ambient)
  } else if (!hasLights) {
    sceneLightsGroup.children
      .filter((c) => c instanceof THREE.AmbientLight)
      .forEach((a) => {
        sceneLightsGroup.remove(a)
        ;(a as THREE.AmbientLight).dispose()
      })
  }
}
