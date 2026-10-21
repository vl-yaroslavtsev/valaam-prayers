<template>
  <!--
    Стандартный аккордеон F7 (родитель — f7-list accordion-list accordion-opposite):
    стрелка слева рисуется самим F7 для `.item-content.accordion-item-toggle`.

    Общий переключатель стоит рядом с областью `accordion-item-toggle`, а не внутри неё
    и не внутри <a>: глобальный обработчик кликов F7 вызывает preventDefault() для любого
    клика внутри <a> и отменил бы переключение чекбокса.
  -->
  <li
    ref="accordionRef"
    class="accordion-item reminder-section"
    :class="{ 'is-disabled': !enabled }"
    @accordion:open="isOpened = true"
    @accordion:close="isOpened = false"
  >
    <div class="reminder-section-head">
      <div class="item-content accordion-item-toggle">
        <div class="item-inner">
          <div class="reminder-section-text">
            <!--
              Невидимая копия «название + описание» задаёт постоянную высоту заголовка.
              Видимый блок лежит поверх неё и центрируется по вертикали: описание
              плавно появляется/скрывается, название плавно смещается, высота не меняется.
            -->
            <div class="reminder-section-sizer" aria-hidden="true">
              <div class="item-title">{{ title }}</div>
              <div class="item-footer">{{ description }}</div>
            </div>
            <div class="reminder-section-visible">
              <div class="item-title">{{ title }}</div>
              <div class="reminder-section-footer" :class="{ 'is-shown': showDescription }">
                <div class="reminder-section-footer-clip">
                  <div class="item-footer">{{ description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="reminder-section-switch">
        <f7-toggle small :checked="enabled" @change="onToggle" />
      </div>
    </div>

    <f7-accordion-content>
      <div class="reminder-section-body" :class="{ 'is-disabled': !enabled }">
        <slot />
      </div>
    </f7-accordion-content>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { f7 } from "framework7-vue";

const props = defineProps<{
  title: string;
  description: string;
  enabled: boolean;
}>();

const emit = defineEmits<{
  "update:enabled": [value: boolean];
}>();

const accordionRef = ref<HTMLElement | null>(null);
const isOpened = ref(false);
// Описание: только у включённого и свёрнутого раздела
const showDescription = computed(() => props.enabled && !isOpened.value);

const onToggle = (event: Event) => {
  emit("update:enabled", (event.target as HTMLInputElement).checked);
};

// Выключили общий переключатель — раздел сворачивается
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled && isOpened.value && accordionRef.value) {
      f7.accordion.close(accordionRef.value);
    }
  }
);
</script>

<style scoped lang="less">
.reminder-section {
  // Линия между разделами на всю ширину (вместе с переключателем)

  &:after {
    content: '';
    position: absolute;
    background-color: var(--f7-list-item-border-color);
    display: block;
    z-index: 15;
    top: auto;
    right: auto;
    bottom: 0;
    left: 0;
    height: 1px;
    width: 100%;
    transform-origin: 50% 100%;
    transform: scaleY(calc(1 / var(--f7-device-pixel-ratio)));
  }

  &:last-child:after {
    display: none;
  }
}

.reminder-section-head {
  display: flex;
  align-items: center;

  .accordion-item-toggle {
    flex: 1 1 auto;
    min-width: 0;
  }

  // Линия рисуется у всего раздела, а не у левой части заголовка
  :deep(.item-inner)::after {
    display: none;
  }
}

.reminder-section-text {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}

.is-disabled .reminder-section-text {
    opacity: 0.7;
}

.reminder-section-sizer {
  visibility: hidden;
}

.reminder-section-visible {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

// Высота строки описания анимируется 0fr -> 1fr, поэтому название плавно уезжает вверх
.reminder-section-footer {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  // visibility убирает скрытое описание из доступного дерева (после окончания анимации)
  visibility: hidden;
  transition:
    grid-template-rows 0.25s ease,
    opacity 0.25s ease,
    visibility 0s linear 0.25s;

  &.is-shown {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
    transition-delay: 0s;
  }
}

.reminder-section-footer-clip {
  min-height: 0;
  overflow: hidden;
}

.reminder-section-switch {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 0 var(--f7-list-item-padding-horizontal) 0 10px;
}

.reminder-section-body {
  padding: 0 var(--f7-list-item-padding-horizontal);
}

.reminder-section-body.is-disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
