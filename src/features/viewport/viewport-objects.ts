import * as THREE from 'three'
import type { PrimitiveType } from '@/core/scene/types'

/* ── Sun billboard (2D sprite that always faces the camera) ─────────── */

let cachedSunTexture: THREE.CanvasTexture | null = null

function createSunTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2

  ctx.clearRect(0, 0, size, size)

  /* Outer glow */
  const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 56)
  glowGrad.addColorStop(0, 'rgba(255, 221, 68, 0.35)')
  glowGrad.addColorStop(1, 'rgba(255, 221, 68, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(cx, cy, 56, 0, Math.PI * 2)
  ctx.fill()

  /* Rays */
  const rayCount = 12
  ctx.strokeStyle = '#ffcc22'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2
    const inner = 20
    const outer = 42
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.stroke()
  }

  /* Core */
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16)
  coreGrad.addColorStop(0, '#ffffee')
  coreGrad.addColorStop(0.5, '#ffdd44')
  coreGrad.addColorStop(1, '#ffbb22')
  ctx.fillStyle = coreGrad
  ctx.beginPath()
  ctx.arc(cx, cy, 14, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function getSunTexture(): THREE.CanvasTexture {
  if (!cachedSunTexture) {
    cachedSunTexture = createSunTexture()
  }
  return cachedSunTexture
}

/**
 * Creates a 2D billboard sprite representing a sun/light.
 * The sprite always faces the camera automatically (classic billboard).
 */
export function makeLightBillboard(lightId: string): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getSunTexture(),
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const sprite = new THREE.Sprite(material)
  sprite.name = lightId
  sprite.scale.set(0.8, 0.8, 1)
  return sprite
}

/**
 * Places an object at the viewport origin: centers it in XZ and grounds it (min Y = 0).
 * Use for imported models so they appear at the zero point.
 */
export function alignObjectToGround(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object)
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3())
    object.position.sub(center)
    const adjusted = new THREE.Box3().setFromObject(object)
    object.position.y -= adjusted.min.y
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Primitive geometry                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

/**
 * Creates a box geometry from quads (supports both triangles and quads).
 * Each face is two triangles (i0,i1,i2) and (i0,i2,i3).
 */
export function makeBoxGeometry(): THREE.BufferGeometry {
  const s = 0.5
  const positions: number[] = []
  const indices: number[] = []
  let idx = 0
  const faces: [number, number, number][][] = [
    [
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ],
    [
      [s, -s, -s],
      [-s, -s, -s],
      [-s, s, -s],
      [s, s, -s],
    ],
    [
      [-s, s, -s],
      [-s, -s, -s],
      [-s, -s, s],
      [-s, s, s],
    ],
    [
      [s, -s, s],
      [s, -s, -s],
      [s, s, -s],
      [s, s, s],
    ],
    [
      [-s, -s, -s],
      [s, -s, -s],
      [s, -s, s],
      [-s, -s, s],
    ],
    [
      [-s, s, s],
      [s, s, s],
      [s, s, -s],
      [-s, s, -s],
    ],
  ]
  for (const face of faces) {
    const i0 = idx++
    const i1 = idx++
    const i2 = idx++
    const i3 = idx++
    for (const v of face) {
      positions.push(v[0], v[1], v[2])
    }
    indices.push(i0, i1, i2, i0, i2, i3)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * Returns the Y offset needed to place the bottom of a primitive at y=0.
 * This is half the height for centered geometries.
 */
export function getPrimitiveYOffset(type: PrimitiveType): number {
  switch (type) {
    case 'box':
      return 0.5
    case 'sphere':
      return 0.5
    case 'cylinder':
      return 0.5
    case 'cone':
      return 0.5
    case 'torus':
      return 0.15
    case 'plane':
      return 0
    default:
      return 0.5
  }
}

/**
 * Creates the appropriate Three.js geometry for a given primitive type.
 */
export function makeGeometryForPrimitive(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box':
      return makeBoxGeometry()
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 24)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 32)
    case 'torus': {
      const geom = new THREE.TorusGeometry(0.35, 0.15, 16, 48)
      geom.rotateX(Math.PI / 2) // lay flat so it sits nicely on grid
      return geom
    }
    case 'plane': {
      const geom = new THREE.PlaneGeometry(1, 1)
      geom.rotateX(-Math.PI / 2) // lay flat on the XZ plane
      return geom
    }
    default:
      return makeBoxGeometry()
  }
}

/**
 * Disposes all geometry and material resources in an Object3D hierarchy.
 * Handles Mesh, Sprite, and nested objects.
 */
export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose())
      } else {
        child.material?.dispose()
      }
    } else if (child instanceof THREE.Sprite) {
      child.material?.dispose()
    }
  })
}
