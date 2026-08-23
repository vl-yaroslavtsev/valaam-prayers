<template>
  <f7-link 
    icon-only 
    smart-select 
    :smart-select-params="{
      openIn: 'popover',
      closeOnSelect: true,
      cssClass: 'simple-select'
    }">
    <select name="language" v-model="currentLanguage">
      <option 
        v-for="lang in availableLanguages" 
        :key="lang" 
        :value="lang"
      >
        {{ getLanguageLabel(lang) }}
      </option>
    </select>
    <SvgIcon icon="language2" :color="iconColor" :size="20" />
  </f7-link>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";

type Language = 'cs' | 'cs-cf' | 'ru';

interface Props {
  availableLanguages: Language[];
}

const props = defineProps<Props>();
const currentLanguage = defineModel<Language>({ required: true });

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));

const getLanguageLabel = (language: Language): string => {
  const labels: Record<Language, string> = {
    'cs': 'Церковнославянский',
    'cs-cf': 'Церковнослав. (гражданский)',
    'ru': 'Русский'
  };
  return labels[language];
};
</script>

<style scoped lang="less"></style> 