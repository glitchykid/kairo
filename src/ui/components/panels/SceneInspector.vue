<script setup lang="ts">
import type { SceneEntity, Transform } from '@/core/scene/types'
import type { ImportedModelAsset } from '@/features/editor/types/imported-model'
import { useI18n } from '@/localization/i18n'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  scene: SceneEntity
  importedAssets: ImportedModelAsset[]
  selectedObjectId?: string | null
  selectedIsPrimitive?: boolean
  selectedIsLight?: boolean
  selectedPosition?: Transform | null
  selectedScale?: Transform | null
  selectedRotation?: Transform | null
}>()

const emit = defineEmits<{
  (event: 'select-object', objectId: string | null, isPrimitive: boolean, isLight?: boolean): void
  (event: 'update-node-position', nodeId: string, position: Transform): void
  (event: 'update-node-scale', nodeId: string, scale: Transform): void
  (event: 'update-node-rotation', nodeId: string, rotation: Transform): void
  (event: 'update-light-position', lightId: string, position: Transform): void
  (event: 'update-imported-position', assetId: string, position: Transform): void
  (event: 'update-imported-scale', assetId: string, scale: Transform): void
  (event: 'update-imported-rotation', assetId: string, rotation: Transform): void
  (event: 'rename-scene', name: string): void
}>()

const { t } = useI18n()
const editorStore = useEditorStore()

/* ── Helpers ───────────────────────────────────────────────────────── */

const hasSelection = () => !!props.selectedObjectId
const isImported = () => !props.selectedIsPrimitive && !props.selectedIsLight

function fmt(n: number): string {
  return parseFloat(n.toFixed(4)).toString()
}

function parseNum(event: Event): number {
  const raw = (event.target as HTMLInputElement).value
  return Math.round((parseFloat(raw) || 0) * 10000) / 10000
}

/* ── Handlers ──────────────────────────────────────────────────────── */

async function handleDeleteNode(nodeId: string): Promise<void> {
  await editorStore.deleteNodeById(nodeId)
}

async function handleDeleteModel(assetId: string): Promise<void> {
  await editorStore.deleteImportedModel(assetId)
}

async function handleDeleteLight(lightId: string): Promise<void> {
  await editorStore.deleteLightById(lightId)
}

function handleSelectNode(nodeId: string): void {
  emit('select-object', nodeId, true, false)
}

function handleSelectModel(assetId: string): void {
  emit('select-object', assetId, false, false)
}

function handleSelectLight(lightId: string): void {
  emit('select-object', lightId, false, true)
}

function handlePositionChange(axis: 'x' | 'y' | 'z', event: Event): void {
  if (!props.selectedObjectId || !props.selectedPosition) return
  const newPosition: Transform = { ...props.selectedPosition, [axis]: parseNum(event) }

  if (props.selectedIsPrimitive) {
    emit('update-node-position', props.selectedObjectId, newPosition)
  } else if (props.selectedIsLight) {
    emit('update-light-position', props.selectedObjectId, newPosition)
  } else {
    emit('update-imported-position', props.selectedObjectId, newPosition)
  }
}

function handleScaleChange(axis: 'x' | 'y' | 'z', event: Event): void {
  if (!props.selectedObjectId || !props.selectedScale) return
  const newScale: Transform = { ...props.selectedScale, [axis]: parseNum(event) }
  if (props.selectedIsPrimitive) {
    emit('update-node-scale', props.selectedObjectId, newScale)
  } else if (!props.selectedIsLight) {
    emit('update-imported-scale', props.selectedObjectId, newScale)
  }
}

function handleRotationChange(axis: 'x' | 'y' | 'z', event: Event): void {
  if (!props.selectedObjectId || !props.selectedRotation) return
  const newRotation: Transform = { ...props.selectedRotation, [axis]: parseNum(event) }
  if (props.selectedIsPrimitive) {
    emit('update-node-rotation', props.selectedObjectId, newRotation)
  } else if (!props.selectedIsLight) {
    emit('update-imported-rotation', props.selectedObjectId, newRotation)
  }
}

function handleRenameScene(event: Event): void {
  const name = (event.target as HTMLInputElement).value.trim()
  if (name) emit('rename-scene', name)
}
</script>

<template>
  <aside class="scene-inspector">
    <!-- Scene name (editable) -->
    <label class="scene-inspector__name-label">
      <span class="scene-inspector__name-prefix">{{ t('inspector.name') }}:</span>
      <input
        type="text"
        class="scene-inspector__name-input"
        :value="scene.name"
        @change="handleRenameScene"
      />
    </label>

    <section class="scene-inspector__section">
      <h3 class="scene-inspector__section-title">{{ t('inspector.primitives') }}</h3>
      <ul v-if="scene.nodes.length > 0" class="scene-inspector__list">
        <li
          v-for="node in scene.nodes"
          :key="node.id"
          class="scene-inspector__item"
          :class="{
            'scene-inspector__item--selected':
              props.selectedObjectId === node.id && props.selectedIsPrimitive,
          }"
          @click="handleSelectNode(node.id)"
        >
          <span class="scene-inspector__item-name">{{
            t(`inspector.primitive.${node.primitive}`)
          }}</span>
          <span class="scene-inspector__item-id">({{ node.id.slice(0, 8) }})</span>
          <button
            type="button"
            class="scene-inspector__delete-btn"
            :title="t('inspector.deletePrimitive')"
            @click.stop="handleDeleteNode(node.id)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
        <li
          v-for="asset in importedAssets"
          :key="asset.id"
          class="scene-inspector__item"
          :class="{
            'scene-inspector__item--selected':
              props.selectedObjectId === asset.id &&
              !props.selectedIsPrimitive &&
              !props.selectedIsLight,
          }"
          @click="handleSelectModel(asset.id)"
        >
          <span class="scene-inspector__item-name">{{ asset.name }}</span>
          <span class="scene-inspector__item-format">.{{ asset.format }}</span>
          <button
            type="button"
            class="scene-inspector__delete-btn"
            :title="t('inspector.deleteModel')"
            @click.stop="handleDeleteModel(asset.id)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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

    <section class="scene-inspector__section">
      <h3 class="scene-inspector__section-title">{{ t('inspector.lights') }}</h3>
      <ul v-if="scene.lights?.length" class="scene-inspector__list">
        <li
          v-for="light in scene.lights"
          :key="light.id"
          class="scene-inspector__item"
          :class="{
            'scene-inspector__item--selected':
              props.selectedObjectId === light.id && props.selectedIsLight,
          }"
          @click="handleSelectLight(light.id)"
        >
          <span class="scene-inspector__item-name">{{ t('inspector.light') }}</span>
          <span class="scene-inspector__item-id">({{ light.id.slice(0, 8) }})</span>
          <button
            type="button"
            class="scene-inspector__delete-btn"
            :title="t('inspector.deleteLight')"
            @click.stop="handleDeleteLight(light.id)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
      <p v-else class="scene-inspector__empty">{{ t('inspector.noLights') }}</p>
    </section>

    <!-- Transform editor — always visible, disabled when nothing selected -->
    <section class="scene-inspector__section scene-inspector__position">
      <h3 class="scene-inspector__section-title">{{ t('inspector.position') }}</h3>
      <div class="scene-inspector__position-fields">
        <label
          v-for="axis in ['x', 'y', 'z'] as const"
          :key="`pos-${axis}`"
          class="scene-inspector__position-field"
        >
          <span
            :class="['scene-inspector__position-label', `scene-inspector__position-label--${axis}`]"
            >{{ axis.toUpperCase() }}</span
          >
          <input
            type="number"
            class="scene-inspector__position-input"
            :value="fmt(selectedPosition?.[axis] ?? 0)"
            :disabled="!hasSelection()"
            step="0.1"
            @change="handlePositionChange(axis, $event)"
          />
        </label>
      </div>

      <!-- Scale (primitives and imported models, not lights) -->
      <h3
        v-if="!selectedIsLight"
        class="scene-inspector__section-title scene-inspector__subsection-title"
      >
        {{ t('inspector.scale') }}
      </h3>
      <div v-if="!selectedIsLight" class="scene-inspector__position-fields">
        <label
          v-for="axis in ['x', 'y', 'z'] as const"
          :key="`scl-${axis}`"
          class="scene-inspector__position-field"
        >
          <span
            :class="['scene-inspector__position-label', `scene-inspector__position-label--${axis}`]"
            >{{ axis.toUpperCase() }}</span
          >
          <input
            type="number"
            class="scene-inspector__position-input"
            :value="fmt(selectedScale?.[axis] ?? 1)"
            :disabled="!hasSelection() || selectedIsLight"
            step="0.1"
            @change="handleScaleChange(axis, $event)"
          />
        </label>
      </div>

      <!-- Rotation (primitives and imported models, not lights) -->
      <h3
        v-if="!selectedIsLight"
        class="scene-inspector__section-title scene-inspector__subsection-title"
      >
        {{ t('inspector.rotation') }}
      </h3>
      <div v-if="!selectedIsLight" class="scene-inspector__position-fields">
        <label
          v-for="axis in ['x', 'y', 'z'] as const"
          :key="`rot-${axis}`"
          class="scene-inspector__position-field"
        >
          <span
            :class="['scene-inspector__position-label', `scene-inspector__position-label--${axis}`]"
            >{{ axis.toUpperCase() }}</span
          >
          <input
            type="number"
            class="scene-inspector__position-input"
            :value="fmt(selectedRotation?.[axis] ?? 0)"
            :disabled="!hasSelection() || selectedIsLight"
            step="1"
            @change="handleRotationChange(axis, $event)"
          />
        </label>
      </div>

      <p v-if="!hasSelection()" class="scene-inspector__position-hint">
        {{ t('inspector.noSelection') }}
      </p>
    </section>
  </aside>
</template>
