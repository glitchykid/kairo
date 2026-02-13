<script setup lang="ts">
import { ref } from 'vue'
import { HOTKEYS } from '@/features/editor/hotkeys/hotkeys-registry'
import SettingsDialog from '@/ui/components/settings/SettingsDialog.vue'
import { useI18n } from '@/localization/i18n'

const { t } = useI18n()
const isHotkeysDialogOpen = ref(false)
const isSettingsDialogOpen = ref(false)

function openSettingsPane(command: string): void {
  if (command !== 'user-interface') return
  isSettingsDialogOpen.value = true
}

function contextLabel(context: 'viewport' | 'global'): string {
  return context === 'viewport' ? t('hotkeys.contextViewport') : t('hotkeys.contextGlobal')
}
</script>

<template>
  <nav class="editor-menu-bar" aria-label="Editor main menu">
    <button class="editor-menu-bar__trigger" type="button" @click="isHotkeysDialogOpen = true">
      {{ t('menu.hotkeys') }}
    </button>

    <el-dropdown trigger="click" popper-class="editor-menu-bar__dropdown" @command="openSettingsPane">
      <button class="editor-menu-bar__trigger" type="button">{{ t('menu.settings') }}</button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="user-interface">{{ t('menu.userInterface') }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </nav>

  <el-dialog
    v-model="isHotkeysDialogOpen"
    :title="t('dialog.hotkeysTitle')"
    width="680px"
    class="hotkeys-dialog"
    append-to-body
  >
    <table class="hotkeys-table">
      <thead>
        <tr>
          <th>{{ t('hotkeys.keys') }}</th>
          <th>{{ t('hotkeys.context') }}</th>
          <th>{{ t('hotkeys.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="hotkey in HOTKEYS" :key="hotkey.id">
          <td><code>{{ hotkey.keys }}</code></td>
          <td>{{ contextLabel(hotkey.context) }}</td>
          <td>{{ t(hotkey.descriptionKey) }}</td>
        </tr>
      </tbody>
    </table>
  </el-dialog>

  <SettingsDialog v-model="isSettingsDialogOpen" />
</template>
