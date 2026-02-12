<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/localization/i18n'

const modelValue = defineModel<boolean>({ required: true })
const { locale, availableLocales, localeLabels, setLocale, t } = useI18n()

const activeTab = ref('ui')

const localeModel = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value as typeof locale.value),
})
</script>

<template>
  <el-dialog
    v-model="modelValue"
    :title="t('dialog.settingsTitle')"
    width="700px"
    class="settings-dialog"
    append-to-body
  >
    <el-tabs v-model="activeTab" tab-position="left" class="settings-dialog__tabs">
      <el-tab-pane :label="t('menu.userInterface')" name="ui">
        <section class="settings-panel">
          <h3>{{ t('menu.userInterface') }}</h3>
          <p>{{ t('settings.localeHint') }}</p>
          <div class="settings-panel__field">
            <label for="locale-select">{{ t('settings.language') }}</label>
            <el-select id="locale-select" v-model="localeModel">
              <el-option
                v-for="localeCode in availableLocales"
                :key="localeCode"
                :label="localeLabels[localeCode]"
                :value="localeCode"
              />
            </el-select>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>
