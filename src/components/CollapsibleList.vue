<template>
  <div class="collapsible-list">
    <f7-list v-if="visibleItems.length" dividers no-hairlines class="collapsible-list-part">
      <template v-for="(item, index) in visibleItems" :key="getKey(item, index)">
        <slot name="item" :item="item" :index="index" />
      </template>
    </f7-list>

    <!-- Скрытая часть и кнопка: высоту анимирует аккордеон Framework7 по клику на .accordion-item-toggle -->
    <f7-accordion-item
      v-if="hiddenItems.length"
      class="collapsible-list-more"
      @accordion:open="isExpanded = true"
      @accordion:close="isExpanded = false"
    >
      <f7-accordion-content>
        <f7-list dividers no-hairlines class="collapsible-list-part is-hidden-part">
          <template v-for="(item, index) in hiddenItems" :key="getKey(item, visibleCount + index)">
            <slot name="item" :item="item" :index="visibleCount + index" />
          </template>
        </f7-list>
      </f7-accordion-content>

      <f7-button class="accordion-item-toggle collapsible-list-toggle" :class="{ 'is-expanded': isExpanded }">
        <span class="collapsible-list-toggle-label">{{ isExpanded ? collapseLabel : expandLabel }}</span>
        <SvgIcon class="collapsible-list-toggle-icon" icon="arrow-small" :size="24" :color="iconColor" />
      </f7-button>
    </f7-accordion-item>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, ref } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";

/**
 * Список, в котором видны первые `visibleCount` строк, а остальные разворачиваются
 * кнопкой с плавной анимацией (аккордеон Framework7). Строки рисует слот `item`.
 */
const {
  items,
  visibleCount = 3,
  expandLabel = "Развернуть",
  collapseLabel = "Свернуть",
  itemKey,
} = defineProps<{
  items: T[];
  visibleCount?: number;
  expandLabel?: string;
  collapseLabel?: string;
  itemKey?: (item: T, index: number) => string | number;
}>();

defineSlots<{
  item(props: { item: T; index: number }): unknown;
}>();

const { isDarkMode } = useTheme();

const isExpanded = ref(false);

const visibleItems = computed(() => items.slice(0, visibleCount));
const hiddenItems = computed(() => items.slice(visibleCount));

const getKey = (item: T, index: number) => itemKey?.(item, index) ?? index;

const iconColor = computed(() => (isDarkMode.value ? "baige-40" : "black-40"));
</script>

<style scoped lang="less">
.collapsible-list {
  --f7-list-margin-vertical: 0;
  --f7-list-bg-color: transparent;
}

.collapsible-list-part.is-hidden-part {
  border-top: 1px solid var(--f7-list-item-border-color);
}

.collapsible-list-toggle {
  --f7-button-text-transform: none;
  --f7-button-height: 40px;

  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  padding: 8px 0;
  border-top: 1px solid var(--f7-list-item-border-color);
  border-radius: 0;
  font-size: var(--mobile-main-text-regular-b3);
  font-weight: 400;
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--collapsible-list-toggle-color, inherit);
}

.collapsible-list-toggle-icon {
  flex-shrink: 0;
  transform: rotate(90deg);
  transition: transform 300ms;
}

.collapsible-list-toggle.is-expanded .collapsible-list-toggle-icon {
  transform: rotate(-90deg);
}
</style>
