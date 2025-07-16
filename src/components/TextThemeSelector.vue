<template>
  <f7-list strong-ios dividers-ios outline-ios>
    <f7-list-item title="Тема текста">
      <template #after>
        <f7-segmented>
          <f7-button
            :class="{ 'button-active': currentTextTheme === 'light' }"
            @click="setTextTheme('light')"
            small
          >
            Светлая
          </f7-button>
          <f7-button
            :class="{ 'button-active': currentTextTheme === 'dark' }"
            @click="setTextTheme('dark')"
            small
          >
            Темная
          </f7-button>
          <f7-button
            :class="{ 'button-active': currentTextTheme === 'grey' }"
            @click="setTextTheme('grey')"
            small
          >
            Серая
          </f7-button>
          <f7-button
            :class="{ 'button-active': currentTextTheme === 'sepia' }"
            @click="setTextTheme('sepia')"
            small
          >
            Сепия
          </f7-button>
          <f7-button
            :class="{ 'button-active': currentTextTheme === 'cream' }"
            @click="setTextTheme('cream')"
            small
          >
            Кремовая
          </f7-button>
        </f7-segmented>
      </template>
    </f7-list-item>
  </f7-list>
  
  <f7-block-title>Размер шрифта</f7-block-title>
  <f7-list simple-list outline-ios strong-ios>
    <f7-list-item>
      <div style="width: 100%; margin: 0 16px">
        <f7-range
          :min="12"
          :max="24"
          :step="1"
          v-model:value="fontSize"
          :label="true"
          color="orange"
        />
      </div>
    </f7-list-item>
  </f7-list>
  
  <f7-block-title>Межстрочное расстояние</f7-block-title>
  <f7-list simple-list outline-ios strong-ios>
    <f7-list-item>
      <div style="width: 100%; margin: 0 16px">
        <f7-range
          :min="1.0"
          :max="2.0"
          :step="0.1"
          v-model:value="lineHeight"
          :label="true"
          color="orange"
        />
      </div>
    </f7-list-item>
  </f7-list>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore, type AppSettings } from '@/stores/settings';

const settingsStore = useSettingsStore();

const currentTextTheme = computed(() => settingsStore.textTheme);

const fontSize = computed({
  get: () => settingsStore.fontSize,
  set: (value: number) => settingsStore.setFontSize(value)
});

const lineHeight = computed({
  get: () => settingsStore.lineHeight,
  set: (value: number) => settingsStore.setLineHeight(value)
});

const setTextTheme = (theme: AppSettings['textTheme']) => {
  settingsStore.setTextTheme(theme);
};
</script>

<style scoped lang="less"></style> 