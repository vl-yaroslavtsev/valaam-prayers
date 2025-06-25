<template>
  <div class="lang-badges">
    <div class="lang-badges-item" v-for="lang in languages" :key="lang">
      {{ translateLang(lang) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Lang } from "@/types/common"; 

const translateLang = (lang: Lang): string => {
  switch (lang) {
    case "cs":
      return "цс";
    case "cs-cf":
      return "цг";
    case "ru":
      return "ру";
    default:
      return lang;
  }
};

defineProps<{
  languages?: Array<Lang>;
}>();
</script>

<style scoped>
.lang-badges {
  --list-item-lang-color: var(--content-color-black-600);

  display: flex;
  gap: 18px;
}

.lang-badges-item {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;

  border: 1px solid var(--list-item-lang-color);
  border-radius: 50%;
  width: 15px;
  height: 15px;
  color: var(--list-item-lang-color);
  font-weight: 700;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  text-transform: uppercase;
}

.dark {
  .lang-badges {
    --list-item-lang-color: var(--content-color-baige-900);
  }
}
</style>
