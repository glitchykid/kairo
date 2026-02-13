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

function toFlatMaterial(obj: THREE.Object3D): void {
  if (!obj || typeof obj.traverse !== 'function') return
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const oldMat = Array.isArray(child.material) ? child.material[0] : child.material
      const color = oldMat && 'color' in oldMat && oldMat.color instanceof THREE.Color
        ? (oldMat.color as THREE.Color).getHex()
        : 0xa1a8b2
      const mat = new THREE.MeshBasicMaterial({ color })
      child.material = mat
      if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose())
      else oldMat?.dispose?.()
    }
  })
}

function makeGeometryMesh(geometry: THREE.BufferGeometry): THREE.Mesh {
  geometry.computeBoundingSphere()
  geometry.computeVertexNormals()
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xa1a8b2,
    }),
  )
}

export async function loadImportedModelObject(asset: ImportedModelAsset): Promise<THREE.Object3D> {
  try {
  switch (asset.format) {
    case 'glb':
    case 'gltf': {
      const gltf = await gltfLoader.loadAsync(asset.url)
      toFlatMaterial(gltf.scene)
      return gltf.scene
    }
    case 'obj': {
      const obj = await objLoader.loadAsync(asset.url)
      toFlatMaterial(obj)
      return obj
    }
    case 'fbx': {
      const fbx = await fbxLoader.loadAsync(asset.url)
      toFlatMaterial(fbx)
      return fbx
    }
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
      toFlatMaterial(collada.scene)
      return collada.scene
    }
    case '3mf':
      return threeMfLoader.loadAsync(asset.url)
    case 'usdz': {
      const usdzLoader = new USDZLoader()
      return usdzLoader.loadAsync(asset.url)
    }
  }
  } catch (err) {
    throw err
  }
}
