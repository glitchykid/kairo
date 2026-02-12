<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    initialSecondaryWidth?: number
    minSecondaryWidth?: number
    maxSecondaryWidth?: number
  }>(),
  {
    initialSecondaryWidth: 340,
    minSecondaryWidth: 260,
    maxSecondaryWidth: 640,
  },
)

const rootElement = ref<HTMLElement | null>(null)
const secondaryWidth = ref(props.initialSecondaryWidth)
let onMove: ((event: PointerEvent) => void) | null = null
let onUp: (() => void) | null = null

function startResize(event: PointerEvent): void {
  if (!rootElement.value) return

  event.preventDefault()
  const startX = event.clientX
  const startWidth = secondaryWidth.value
  const rootRect = rootElement.value.getBoundingClientRect()
  const maxWidth = Math.min(props.maxSecondaryWidth, rootRect.width - 320)

  onMove = (moveEvent: PointerEvent) => {
    const delta = startX - moveEvent.clientX
    const next = startWidth + delta
    secondaryWidth.value = Math.max(props.minSecondaryWidth, Math.min(maxWidth, next))
  }

  onUp = () => {
    if (onMove) window.removeEventListener('pointermove', onMove)
    if (onUp) window.removeEventListener('pointerup', onUp)
    onMove = null
    onUp = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

onBeforeUnmount(() => {
  if (onMove) window.removeEventListener('pointermove', onMove)
  if (onUp) window.removeEventListener('pointerup', onUp)
  onMove = null
  onUp = null
})
</script>

<template>
  <section ref="rootElement" class="resizable-panels">
    <div class="resizable-panels__primary">
      <slot name="primary" />
    </div>
    <button
      type="button"
      class="resizable-panels__divider"
      aria-label="Resize panels"
      @pointerdown="startResize"
    />
    <div class="resizable-panels__secondary" :style="{ width: `${secondaryWidth}px` }">
      <slot name="secondary" />
    </div>
  </section>
</template>
