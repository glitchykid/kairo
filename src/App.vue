<script setup lang="ts">
import EditorWorkspace from '@/features/editor/EditorWorkspace.vue'
import DesktopOnlyGuard from '@/ui/components/layout/DesktopOnlyGuard.vue'
</script>

<template>
  <DesktopOnlyGuard>
    <EditorWorkspace />
  </DesktopOnlyGuard>
</template>
