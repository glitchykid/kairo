<script setup lang="ts">
import { useI18n } from '@/localization/i18n'

const displayMode = defineModel<'solid' | 'wireframe'>('displayMode', { required: true })
const cameraType = defineModel<'perspective' | 'orthographic'>('cameraType', { required: true })
const showPolygonEdges = defineModel<boolean>('showPolygonEdges', { required: true })
const showVertices = defineModel<boolean>('showVertices', { required: true })
const showGrid = defineModel<boolean>('showGrid', { required: true })
const showPolygonCount = defineModel<boolean>('showPolygonCount', { required: true })
const showCameraSpeed = defineModel<boolean>('showCameraSpeed', { required: true })
const showAxes = defineModel<boolean>('showAxes', { required: true })

const { t } = useI18n()

const isWireframe = () => displayMode.value === 'wireframe'
const isOrtho = () => cameraType.value === 'orthographic'
</script>

<template>
  <div class="viewport__controls">
    <!-- Row 1: Wireframe + Solid group -->
    <div class="viewport__controls-row">
      <div class="viewport__display-modes">
        <button
          type="button"
          class="viewport__display-btn viewport__display-btn--wireframe"
          :class="{ 'viewport__display-btn--active': isWireframe() }"
          :title="t('viewport.displayMode.wireframe')"
          @click="displayMode = 'wireframe'"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4L8 1L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 12L8 15L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 4L2 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 1L8 15" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M14 4L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 4L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 12L14 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      <div class="viewport__display-modes">
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': !isWireframe() }"
          :title="t('viewport.displayMode.solid')"
          @click="displayMode = 'solid'"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4L8 1L14 4V12L8 15L2 12V4Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/>
            <path d="M2 4L8 7L14 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M8 7V15" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn viewport__display-btn--polygon-edges"
          :class="{ 'viewport__display-btn--active': showPolygonEdges }"
          :disabled="isWireframe()"
          :title="t('viewport.displayMode.polygonEdges')"
          @click="showPolygonEdges = !showPolygonEdges"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L14 2M2 2L2 14M14 2L14 14M2 14L14 14" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M2 8L14 8M8 2L8 14" stroke="currentColor" stroke-width="1" stroke-opacity="0.5" fill="none"/>
          </svg>
        </button>
        <button
          type="button"
          class="viewport__display-btn"
          :class="{ 'viewport__display-btn--active': showVertices }"
          :disabled="isWireframe()"
          :title="t('viewport.displayMode.vertices')"
          @click="showVertices = !showVertices"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <path d="M4 4L12 4M4 4L4 12M12 4L12 12M4 12L12 12" stroke="currentColor" stroke-width="1" stroke-opacity="0.3" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
    <!-- Row 2: Projection toggle -->
    <div class="viewport__display-modes viewport__display-modes--separated">
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': !isOrtho() }"
        :title="t('viewport.displayMode.perspective')"
        @click="cameraType = 'perspective'"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13L6 3H10L13 13H3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
          <path d="M6 3H10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </button>
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': isOrtho() }"
        :title="t('viewport.displayMode.orthographic')"
        @click="cameraType = 'orthographic'"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </button>
    </div>
    <!-- Row 3: Utility toggles -->
    <div class="viewport__display-modes viewport__display-modes--separated">
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': showGrid }"
        :title="t('viewport.displayMode.grid')"
        @click="showGrid = !showGrid"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2H14V14H2V2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M2 8H14" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M8 2V14" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </button>
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': showPolygonCount }"
        :title="t('viewport.displayMode.polygons')"
        @click="showPolygonCount = !showPolygonCount"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H7V7H3V3Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M9 3H13V7H9V3Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M3 9H7V13H3V9Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M9 9H13V13H9V9Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </button>
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': showCameraSpeed }"
        :title="t('viewport.displayMode.cameraSpeed')"
        @click="showCameraSpeed = !showCameraSpeed"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <path d="M2 11C2 7 4 4 8 4C12 4 14 7 14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M8 9L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </button>
      <button
        type="button"
        class="viewport__display-btn"
        :class="{ 'viewport__display-btn--active': showAxes }"
        :title="t('viewport.displayMode.axes')"
        @click="showAxes = !showAxes"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8L14 8" stroke="#ff0000" stroke-width="1.5" fill="none"/>
          <path d="M8 2L8 14" stroke="#00ff00" stroke-width="1.5" fill="none"/>
          <path d="M8 8L14 14" stroke="#0080ff" stroke-width="1.5" fill="none"/>
        </svg>
      </button>
    </div>
  </div>
</template>
