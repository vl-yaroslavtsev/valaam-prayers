<template>
  <f7-chip
    class="rite-type-chip"
    :class="type.type ? `rite-type-chip--${type.type}` : undefined"
    :text="type.typeName"
  />
</template>

<script setup lang="ts">
import type { RiteType } from "@/services/rites/ritesApi";

defineProps<{
  type: RiteType;
}>();
</script>

<style scoped lang="less">
// Компактная пилюля поверх чипа Framework7: о здравии розовая, о упокоении нейтральная.
.rite-type-chip {
  --rite-chip-color: var(--content-color-black-primary);
  --rite-chip-bg: var(--content-color-black-5);
  --rite-chip-border: var(--content-color-black-5);

  &--health {
    --rite-chip-color: var(--red-r-100);
    --rite-chip-bg: rgba(235, 87, 87, 0.1);
    --rite-chip-border: rgba(235, 87, 87, 0.04);
  }
}

.rite-type-chip.chip {
  --f7-chip-height: 20px;
  --f7-chip-font-size: 12px;
  --f7-chip-font-weight: 400;
  --f7-chip-border-radius: 30px;
  --f7-chip-padding-horizontal: 8px;
  --f7-chip-bg-color: var(--rite-chip-bg);
  --f7-chip-text-color: var(--rite-chip-color);

  flex-shrink: 0;
  height: 20px;
  margin: 0;
  border: 1px solid var(--rite-chip-border);
  background: var(--rite-chip-bg);
  color: var(--rite-chip-color);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
}
</style>

<style lang="less">
// Отдельный блок без scoped: Less не пропускает :global, а .dark вешается на html.
.dark .rite-type-chip {
  --rite-chip-color: var(--content-color-white-100);
  --rite-chip-bg: var(--content-color-baige-5);
  --rite-chip-border: var(--content-color-baige-5);
}

.dark .rite-type-chip--health {
  --rite-chip-color: #ff9191;
  --rite-chip-bg: rgba(255, 145, 145, 0.1);
  --rite-chip-border: rgba(255, 145, 145, 0.04);
}
</style>
