export const SUPPORTED_MODEL_FORMATS = [
  'glb',
  'gltf',
  'obj',
  'fbx',
  'stl',
  'ply',
  'dae',
  '3mf',
  'usdz',
] as const

export type ModelFormat = (typeof SUPPORTED_MODEL_FORMATS)[number]

export interface ImportedModelAsset {
  id: string
  name: string
  format: ModelFormat
  url: string
}

export interface StoredModelAsset {
  id: string
  name: string
  format: ModelFormat
  blob: Blob
  createdAt: number
}

export interface ModelAssetRepository {
  getAll(): Promise<StoredModelAsset[]>
  saveMany(assets: StoredModelAsset[]): Promise<void>
  deleteById(assetId: string): Promise<void>
}

export function detectModelFormat(fileName: string): ModelFormat | undefined {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension) return undefined
  return SUPPORTED_MODEL_FORMATS.find((format) => format === extension)
}

export function buildModelAcceptString(): string {
  return SUPPORTED_MODEL_FORMATS.map((format) => `.${format}`).join(',')
}
