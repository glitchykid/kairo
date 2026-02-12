<script setup lang="ts">
import type { SceneEntity } from '@/core/scene/types'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'
import { useI18n } from '@/localization/i18n'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  scene: SceneEntity
  importedAssets: ImportedModelAsset[]
}>()

const emit = defineEmits<{
  (event: 'select-object', objectId: string, isPrimitive: boolean): void
}>()

const { t } = useI18n()
const editorStore = useEditorStore()

async function handleDeleteNode(nodeId: string): Promise<void> {
  await editorStore.deleteNodeById(nodeId)
}

async function handleDeleteModel(assetId: string): Promise<void> {
  await editorStore.deleteImportedModel(assetId)
}

function handleSelectNode(nodeId: string): void {
  emit('select-object', nodeId, true)
}

function handleSelectModel(assetId: string): void {
  emit('select-object', assetId, false)
}
</script>

<template>
  <aside class="scene-inspector">
    <p class="scene-inspector__name">{{ t('inspector.name') }}: {{ scene.name }}</p>

    <section class="scene-inspector__section">
      <h3 class="scene-inspector__section-title">{{ t('inspector.primitives') }}</h3>
      <ul v-if="scene.nodes.length > 0" class="scene-inspector__list">
        <li v-for="node in scene.nodes" :key="node.id" class="scene-inspector__item" @click="handleSelectNode(node.id)">
          <span class="scene-inspector__item-name">{{ t(`inspector.primitive.${node.primitive}`) }}</span>
          <span class="scene-inspector__item-id">({{ node.id.slice(0, 8) }})</span>
          <button
            type="button"
            class="scene-inspector__delete-btn"
            :title="t('inspector.deletePrimitive')"
            @click.stop="handleDeleteNode(node.id)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </li>
      </ul>
      <p v-else class="scene-inspector__empty">{{ t('inspector.noPrimitives') }}</p>
    </section>

    <section class="scene-inspector__section">
      <h3 class="scene-inspector__section-title">{{ t('inspector.importedModels') }}</h3>
      <ul v-if="importedAssets.length > 0" class="scene-inspector__list">
        <li v-for="asset in importedAssets" :key="asset.id" class="scene-inspector__item" @click="handleSelectModel(asset.id)">
          <span class="scene-inspector__item-name">{{ asset.name }}</span>
          <span class="scene-inspector__item-format">.{{ asset.format }}</span>
          <button
            type="button"
            class="scene-inspector__delete-btn"
            :title="t('inspector.deleteModel')"
            @click.stop="handleDeleteModel(asset.id)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </li>
      </ul>
      <p v-else class="scene-inspector__empty">{{ t('inspector.noImportedModels') }}</p>
    </section>
  </aside>
</template>
