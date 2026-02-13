import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'

const loaderMocks = vi.hoisted(() => ({
  gltf: vi.fn(async () => ({ scene: { kind: 'gltfScene' } })),
  obj: vi.fn(async () => ({ kind: 'objObject' })),
  fbx: vi.fn(async () => ({ kind: 'fbxObject' })),
  stl: vi.fn(async () => ({})),
  ply: vi.fn(async () => ({})),
  dae: vi.fn(async () => ({ scene: { kind: 'daeScene' } })),
  threeMf: vi.fn(async () => ({ kind: 'threeMfObject' })),
  usdz: vi.fn(async () => ({ kind: 'usdzObject' })),
}))

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync = loaderMocks.gltf
  },
}))
vi.mock('three/addons/loaders/OBJLoader.js', () => ({
  OBJLoader: class {
    loadAsync = loaderMocks.obj
  },
}))
vi.mock('three/addons/loaders/FBXLoader.js', () => ({
  FBXLoader: class {
    loadAsync = loaderMocks.fbx
  },
}))
vi.mock('three/addons/loaders/STLLoader.js', () => ({
  STLLoader: class {
    loadAsync = loaderMocks.stl
  },
}))
vi.mock('three/addons/loaders/PLYLoader.js', () => ({
  PLYLoader: class {
    loadAsync = loaderMocks.ply
  },
}))
vi.mock('three/addons/loaders/ColladaLoader.js', () => ({
  ColladaLoader: class {
    loadAsync = loaderMocks.dae
  },
}))
vi.mock('three/addons/loaders/3MFLoader.js', () => ({
  ThreeMFLoader: class {
    loadAsync = loaderMocks.threeMf
  },
}))
vi.mock('three/addons/loaders/USDZLoader.js', () => ({
  USDZLoader: class {
    loadAsync = loaderMocks.usdz
  },
}))

import { loadImportedModelObject } from '@/features/editor/services/model-import'

function makeAsset(format: ImportedModelAsset['format']): ImportedModelAsset {
  return {
    id: `asset-${format}`,
    name: `mesh.${format}`,
    format,
    url: `blob:${format}`,
  }
}

describe('model import service', () => {
  it('loads supported model formats', async () => {
    loaderMocks.stl.mockResolvedValueOnce(new THREE.BufferGeometry())
    loaderMocks.ply.mockResolvedValueOnce(new THREE.BufferGeometry())

    const formats: ImportedModelAsset['format'][] = [
      'glb',
      'gltf',
      'obj',
      'fbx',
      'stl',
      'ply',
      'dae',
      '3mf',
      'usdz',
    ]

    for (const format of formats) {
      const model = await loadImportedModelObject(makeAsset(format))
      expect(model).toBeTruthy()
    }
  })

  it('propagates loader errors when parsing fails', async () => {
    const error = new Error('Failed to parse GLB')
    loaderMocks.gltf.mockRejectedValueOnce(error)

    await expect(loadImportedModelObject(makeAsset('glb'))).rejects.toThrow('Failed to parse GLB')
  })

  it('wraps geometry in mesh for STL and PLY formats', async () => {
    const geometry = new THREE.BufferGeometry()
    loaderMocks.stl.mockResolvedValueOnce(geometry)
    loaderMocks.ply.mockResolvedValueOnce(new THREE.BufferGeometry())

    const stlModel = await loadImportedModelObject(makeAsset('stl'))
    expect(stlModel).toBeInstanceOf(THREE.Mesh)
    expect((stlModel as THREE.Mesh).geometry).toBe(geometry)
  })

  it('applies flat material to gltf scenes with Three.js objects', async () => {
    const group = new THREE.Group()
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    )
    group.add(mesh)

    loaderMocks.gltf.mockResolvedValueOnce({ scene: group })
    const result = await loadImportedModelObject(makeAsset('glb'))

    expect(result).toBe(group)
    // toFlatMaterial should have converted to MeshBasicMaterial
    const childMesh = (result as THREE.Group).children[0] as THREE.Mesh
    expect(childMesh.material).toBeInstanceOf(THREE.MeshBasicMaterial)
  })

  it('applies flat material to obj with array materials', async () => {
    const group = new THREE.Group()
    const mat1 = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [mat1, mat2])
    group.add(mesh)

    loaderMocks.obj.mockResolvedValueOnce(group)
    const result = await loadImportedModelObject(makeAsset('obj'))

    const childMesh = (result as THREE.Group).children[0] as THREE.Mesh
    expect(childMesh.material).toBeInstanceOf(THREE.MeshBasicMaterial)
  })

  it('handles fbx objects with no material color', async () => {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial()
    // Simulate material without a Color object
    delete (mat as Record<string, unknown>).color
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat)
    group.add(mesh)

    loaderMocks.fbx.mockResolvedValueOnce(group)
    const result = await loadImportedModelObject(makeAsset('fbx'))

    const childMesh = (result as THREE.Group).children[0] as THREE.Mesh
    expect(childMesh.material).toBeInstanceOf(THREE.MeshBasicMaterial)
    const newMat = childMesh.material as THREE.MeshBasicMaterial
    // Should fall back to default color 0xa1a8b2
    expect(newMat.color.getHex()).toBe(0xa1a8b2)
  })

  it('handles collada scenes with Three.js objects', async () => {
    const scene = new THREE.Group()
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 0x123456 })))

    loaderMocks.dae.mockResolvedValueOnce({ scene })
    const result = await loadImportedModelObject(makeAsset('dae'))
    expect(result).toBe(scene)
  })

  it('wraps PLY geometry in mesh with default material', async () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
    loaderMocks.ply.mockResolvedValueOnce(geometry)

    const result = await loadImportedModelObject(makeAsset('ply'))
    expect(result).toBeInstanceOf(THREE.Mesh)
    expect((result as THREE.Mesh).material).toBeInstanceOf(THREE.MeshBasicMaterial)
  })
})
