import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'

const gltfLoader = new GLTFLoader()
const objLoader = new OBJLoader()
const fbxLoader = new FBXLoader()
const stlLoader = new STLLoader()
const plyLoader = new PLYLoader()
const colladaLoader = new ColladaLoader()
const threeMfLoader = new ThreeMFLoader()

function makeGeometryMesh(geometry: THREE.BufferGeometry): THREE.Mesh {
  geometry.computeBoundingSphere()
  geometry.computeVertexNormals()
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0xa1a8b2,
      roughness: 0.52,
      metalness: 0.12,
    }),
  )
}

export async function loadImportedModelObject(asset: ImportedModelAsset): Promise<THREE.Object3D> {
  switch (asset.format) {
    case 'glb':
    case 'gltf': {
      const gltf = await gltfLoader.loadAsync(asset.url)
      return gltf.scene
    }
    case 'obj':
      return objLoader.loadAsync(asset.url)
    case 'fbx':
      return fbxLoader.loadAsync(asset.url)
    case 'stl': {
      const geometry = await stlLoader.loadAsync(asset.url)
      return makeGeometryMesh(geometry)
    }
    case 'ply': {
      const geometry = await plyLoader.loadAsync(asset.url)
      return makeGeometryMesh(geometry)
    }
    case 'dae': {
      const collada = await colladaLoader.loadAsync(asset.url)
      return collada.scene
    }
    case '3mf':
      return threeMfLoader.loadAsync(asset.url)
    case 'usdz': {
      const usdzLoader = new USDZLoader()
      return usdzLoader.loadAsync(asset.url)
    }
  }
}
