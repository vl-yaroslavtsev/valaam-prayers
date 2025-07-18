<template>
  <f7-sheet 
    class="text-settings-sheet" 
    v-model:opened="isOpened"
    bottom 
    swipe-to-close
    backdrop
    backdrop-el=".text-settings-sheet-backdrop"
    swipe-handler=".swipe-handler"
  >
    <f7-page-content>
      <f7-block-title>Настройки текста</f7-block-title>
      <f7-list dividers>
        <f7-list-item 
          title="Листать стр."
          smart-select
          class="text-theme-select"
          :smart-select-params="{
            openIn: 'popover',
            closeOnSelect: true,
            cssClass: 'simple-select', 
                     
          }">
          <template #default>
            <select name="textPageMode" v-model="currentTextPageMode">
              <option 
                v-for="(label, mode) in textPageModeLabels" 
                :value="mode"
                :key="mode">{{ label }}</option>
            </select>
          </template>
          <template #media>
            <SvgIcon icon="arrow-right-left" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Тема"
          smart-select
          class="text-theme-select"
          :smart-select-params="{
            openIn: 'popover',
            closeOnSelect: true,
            cssClass: 'simple-select', 
                     
          }">
          <template #default>
            <select name="textTheme" v-model="currentTextTheme">
              <option 
                v-for="(label, theme) in textThemeLabels" 
                :value="theme"
                :key="theme">{{ label }}</option>
            </select>
          </template>
          <template #media>
            <SvgIcon icon="color-theme" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Размер шрифта"
        >
          <template #after>
            <f7-stepper 
              :input="false" 
              class="stepper-minimal stepper-tiny"
              :min="10"
              :max="35"
              :step="1"
              v-model:value="fontSize" />
          </template>
          <template #media>
            <SvgIcon icon="letter-tt" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Шрифт"
          smart-select
          class="font-family-select"
          :smart-select-params="{
            openIn: 'popover',
            closeOnSelect: true,
            cssClass: 'simple-select',        
          }">
          <template #default>
            <select name="fontFamily" v-model="currentFontFamily">
              <option 
                v-for="label in fontFamilyLabels" 
                :value="label"
                :key="label">{{ label }}</option>
            </select>
          </template>
          <template #media>
            <SvgIcon icon="letter-a" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Высота строки"
        >
          <template #after>
            <f7-stepper 
              :input="false"
              class="stepper-minimal stepper-tiny"
              :min="0.8"
              :max="2.0"
              :step="0.05"
              :format-value="(val: number) => val.toFixed(2)"
              :value="lineHeight"
              @stepper:change="onLineHeightChange" />
          </template>
          <template #media>
            <SvgIcon icon="line-height" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Выравнивание по ширине"
        >
          <template #after>
            <f7-toggle 
              small
              v-model:checked="isTextAlignJustified"
            />
          </template>
          <template #media>
            <SvgIcon icon="align-center" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Переносы слов"
        >
          <template #after>
            <f7-toggle 
              small
              v-model:checked="isTextWordsBreak"
            />
          </template>
          <template #media>
            <SvgIcon icon="wrap-text" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Поля страницы"
        >
          <template #after>
            <f7-toggle 
              small
              v-model:checked="isTextPagePadding"
            />
          </template>
          <template #media>
              <SvgIcon icon="double-arrow" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Жирный"
        >
          <template #after>
            <f7-toggle 
              small
              v-model:checked="isTextBold"
            />
          </template>
          <template #media>
            <SvgIcon icon="letter-b" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
        <f7-list-item 
          title="Верхнее меню"
        >
          <template #after>
            <f7-toggle 
              small
              v-model:checked="showStatusBar"
            />
          </template>
          <template #media>
            <SvgIcon icon="fullscreen" :color="iconColor" :size="24" />
          </template>
        </f7-list-item>
      </f7-list> 

    </f7-page-content>
    <div class="swipe-handler"></div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSettingsStore, type AppSettings } from '@/stores/settings';
import SvgIcon from '@/components/SvgIcon.vue';
import { useTheme } from '@/composables/useTheme';

const isOpened = defineModel<boolean>('isOpened');

const settingsStore = useSettingsStore();
const { isDarkMode } = useTheme();

const textThemeLabels: Record<AppSettings['textTheme'], string> = {
  'grey': 'Серая',
  'sepia': 'Сепия',
  'sepia-contrast': 'Сепия (контраст)',
  'cream': 'Кремовая',
  'yellow': 'Жёлтая',  
  'light': 'Светлая',
  'dark': 'Тёмная',
};

const textPageModeLabels: Record<AppSettings['pageMode'], string> = {
  'horizontal': 'Горизонтально',
  'vertical': 'Вертикально',
};

const currentTextPageMode = computed({
  get: () => settingsStore.pageMode,
  set: (value: AppSettings['pageMode']) => settingsStore.setPageMode(value)
});

const currentTextTheme = computed({
  get: () => settingsStore.textTheme,
  set: (value: AppSettings['textTheme']) => settingsStore.setTextTheme(value)
});

const fontSize = computed({
  get: () => settingsStore.fontSize,
  set: (value: number) => settingsStore.setFontSize(value)
});

const lineHeight = ref(settingsStore.lineHeight);

const onLineHeightChange = (value: number) => {
  console.log(value);
  settingsStore.setLineHeight(Number(value.toFixed(2)));
};

const showStatusBar = computed({
  get: () => settingsStore.isStatusBarVisible,
  set: (value: boolean) => settingsStore.setIsStatusBarVisible(value)
});

const currentFontFamily = computed({
  get: () => settingsStore.fontFamily,
  set: (value: string) => settingsStore.setFontFamily(value)
});

const fontFamilyLabels = [
  'PT Sans',
  'PT Serif',
  'Circe',
  'Literata',
  'Noto Sans',
  'Noto Serif',
  'Roboto',
];

const isTextAlignJustified = ref(true);
const isTextWordsBreak= ref(true);
const isTextPagePadding = ref(true);
const isTextBold = ref(false);

const iconColor = computed(() => isDarkMode.value ? 'baige-60' : 'black-40');

</script>

<style scoped lang="less">
.text-settings-sheet {
  // --f7-block-margin-vertical: 30px;
  --f7-block-title-margin-bottom: 5px;
  --f7-list-item-padding-vertical: 12px;
  --f7-list-item-min-height: 64px;
}
</style> 