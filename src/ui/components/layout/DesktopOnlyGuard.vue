<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '@/localization/i18n'

const { t } = useI18n()
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920)
let resizeHandler: (() => void) | null = null

const isDesktopSupported = computed(() => viewportWidth.value >= 1200)

onMounted(() => {
  resizeHandler = () => {
    viewportWidth.value = window.innerWidth
  }
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  resizeHandler = null
})
</script>

<template>
  <slot v-if="isDesktopSupported" />
  <section v-else class="desktop-only">
    <div class="desktop-only__card">
      <h1>{{ t('desktopOnly.title') }}</h1>
      <p>{{ t('desktopOnly.description') }}</p>
    </div>
  </section>
</template>
