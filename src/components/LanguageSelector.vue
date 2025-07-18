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
    <SvgIcon icon="language" color="baige-90" :size="24" />
  </f7-link>
</template>

<script setup lang="ts">
import SvgIcon from "@/components/SvgIcon.vue";

type Language = 'cs' | 'cs-cf' | 'ru';

interface Props {
  availableLanguages: Language[];
}

const props = defineProps<Props>();
const currentLanguage = defineModel<Language>({ required: true });

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