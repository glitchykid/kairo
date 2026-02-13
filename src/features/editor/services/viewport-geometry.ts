import * as THREE from 'three'

/**
 * Offsets edge geometry vertices slightly outward from the mesh center.
 * Reduces z-fighting so polygon edges render more cleanly on surfaces.
 */
export function offsetEdgeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const posAttr = geometry.getAttribute('position')
  if (!posAttr) return geometry

  const pos = posAttr.array
  const count = pos.length / 3
  let cx = 0,
    cy = 0,
    cz = 0
  for (let i = 0; i < count; i++) {
    cx += pos[i * 3] ?? 0
    cy += pos[i * 3 + 1] ?? 0
    cz += pos[i * 3 + 2] ?? 0
  }
  cx /= count
  cy /= count
  cz /= count

  geometry.computeBoundingSphere()
  const r = geometry.boundingSphere?.radius ?? 1
  const epsilon = 5e-4 * Math.max(r, 0.001)
  const newPos = new Float32Array(pos.length)
  for (let i = 0; i < count; i++) {
    const x = pos[i * 3] ?? 0
    const y = pos[i * 3 + 1] ?? 0
    const z = pos[i * 3 + 2] ?? 0
    const dx = x - cx
    const dy = y - cy
    const dz = z - cz
    const len = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1e-10)
    const s = epsilon / len
    newPos[i * 3] = x + dx * s
    newPos[i * 3 + 1] = y + dy * s
    newPos[i * 3 + 2] = z + dz * s
  }

  const result = geometry.clone()
  result.setAttribute('position', new THREE.BufferAttribute(newPos, 3))
  result.deleteAttribute('normal')
  return result
}
