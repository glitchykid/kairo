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
})
