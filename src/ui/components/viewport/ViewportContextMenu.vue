<script setup lang="ts">
import type { PrimitiveType } from '@/core/scene/types'
import { useI18n } from '@/localization/i18n'

defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  (event: 'add-primitive', type: PrimitiveType): void
  (event: 'add-light'): void
  (event: 'import-model'): void
}>()

const { t } = useI18n()

const primitives: { type: PrimitiveType; labelKey: string }[] = [
  { type: 'box', labelKey: 'viewport.addBox' },
  { type: 'sphere', labelKey: 'viewport.addSphere' },
  { type: 'cylinder', labelKey: 'viewport.addCylinder' },
  { type: 'cone', labelKey: 'viewport.addCone' },
  { type: 'torus', labelKey: 'viewport.addTorus' },
  { type: 'plane', labelKey: 'viewport.addPlane' },
]
</script>

<template>
  <div
    v-if="visible"
    class="viewport__context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <button
      v-for="prim in primitives"
      :key="prim.type"
      type="button"
      class="viewport__context-action"
      @click="emit('add-primitive', prim.type)"
    >
      {{ t(prim.labelKey) }}
    </button>
    <div class="viewport__context-divider" />
    <button type="button" class="viewport__context-action" @click="emit('add-light')">
      {{ t('viewport.addLight') }}
    </button>
    <button type="button" class="viewport__context-action" @click="emit('import-model')">
      {{ t('viewport.importModel') }}
    </button>
  </div>
</template>
