<template>
  <div v-if="rect" class="spotlight-hint">
    <div class="sh-backdrop" @click="close"></div>

    <div class="sh-hole" :style="holeStyle"></div>

    <div class="sh-hand" :style="handStyle">
      <SvgIcon icon="cursor-hand" :size="36" />
    </div>

    <div class="sh-card" :style="cardStyle">
      <f7-link class="sh-close" icon-only @click="close">
        <SvgIcon icon="cancel" :size="20" color="black-40" />
      </f7-link>

      <div v-if="targets.length > 1" class="sh-progress">
        {{ activeIndex + 1 }} из {{ targets.length }}
      </div>

      <h3 class="sh-title">{{ currentTarget?.title }}</h3>
      <p class="sh-text">{{ currentTarget?.text }}</p>

      <div class="sh-actions">
        <f7-button
          v-if="activeIndex > 0"
          outline
          round
          class="sh-button"
          @click="prev"
        >
          Назад
        </f7-button>
        <f7-button fill round class="sh-button" @click="next">
          {{ isLastTarget ? "Понятно" : "Далее" }}
        </f7-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";

export interface SpotlightTarget {
  title: string;
  text: string;
  getTargetEl: () => HTMLElement | null | undefined;
  // "circle" — для круглых/квадратных иконок-кнопок, "rounded" — для прямоугольных
  // блоков (переключатель вкладок, пункт списка настроек)
  shape: "circle" | "rounded";
}

// Отступ вокруг подсвечиваемого элемента (px)
const HOLE_PADDING = 6;
const HAND_ICON_SIZE = 36;
const CARD_MARGIN = 12;

const { targets } = defineProps<{
  targets: SpotlightTarget[];
}>();

// close — единственный сигнал наружу: и естественное завершение (Понятно на
// последнем таргете), и досрочный пропуск помечают подсказку увиденной одинаково
const emit = defineEmits<{ close: [] }>();

const activeIndex = ref(0);
const rect = ref<DOMRect | null>(null);

const currentTarget = computed(() => targets[activeIndex.value]);
const isLastTarget = computed(() => activeIndex.value >= targets.length - 1);

const close = () => emit("close");

const updateRect = () => {
  const el = currentTarget.value?.getTargetEl();
  const nextRect = el ? el.getBoundingClientRect() : null;
  // Элемент-цель может быть недоступен (например, скрыт другим взаимодействием
  // между шагами) — в этом случае просто закрываем подсказку, а не показываем пустоту
  if (!nextRect || (nextRect.width === 0 && nextRect.height === 0)) {
    rect.value = null;
    close();
    return;
  }
  rect.value = nextRect;
};

const next = () => {
  if (isLastTarget.value) {
    close();
    return;
  }
  activeIndex.value += 1;
};

const prev = () => {
  if (activeIndex.value > 0) {
    activeIndex.value -= 1;
  }
};

watch(activeIndex, () => nextTick(updateRect));

onMounted(() => {
  updateRect();
  window.addEventListener("resize", updateRect);
  window.addEventListener("orientationchange", updateRect);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateRect);
  window.removeEventListener("orientationchange", updateRect);
});

// "Вырез" в затемнении — реализован через box-shadow с огромным растяжением
// вместо отдельного затемняющего слоя: сам div остаётся прозрачным, поэтому
// настоящий элемент интерфейса виден под ним в своём реальном цвете/фоне
const holeStyle = computed(() => {
  if (!rect.value || !currentTarget.value) return {};
  const padding = HOLE_PADDING;
  if (currentTarget.value.shape === "circle") {
    const diameter = Math.max(rect.value.width, rect.value.height) + padding * 2;
    const centerX = rect.value.left + rect.value.width / 2;
    const centerY = rect.value.top + rect.value.height / 2;
    return {
      left: `${centerX - diameter / 2}px`,
      top: `${centerY - diameter / 2}px`,
      width: `${diameter}px`,
      height: `${diameter}px`,
      borderRadius: "50%",
    };
  }
  return {
    left: `${rect.value.left - padding}px`,
    top: `${rect.value.top - padding}px`,
    width: `${rect.value.width + padding * 2}px`,
    height: `${rect.value.height + padding * 2}px`,
    borderRadius: "12px",
  };
});

// Указатель-рука перекрывает нижний правый край выреза, как бы "указывая" на него
const handStyle = computed(() => {
  if (!rect.value) return {};
  const overlap = HAND_ICON_SIZE * 0.35;
  return {
    left: `${rect.value.left + rect.value.width - overlap}px`,
    top: `${rect.value.top + rect.value.height - overlap}px`,
  };
});

// Карточка размещается под целью, если снизу достаточно места, иначе — над ней
const cardStyle = computed(() => {
  if (!rect.value) return {};
  const spaceBelow = window.innerHeight - rect.value.bottom;
  const placeBelow = spaceBelow >= 160;
  return placeBelow
    ? { top: `${rect.value.bottom + CARD_MARGIN}px` }
    : { bottom: `${window.innerHeight - rect.value.top + CARD_MARGIN}px` };
});
</script>

<style scoped lang="less">
.spotlight-hint {
  position: fixed;
  inset: 0;
  // Выше f7-sheet/f7-popup (используется и для подсказок внутри шторки настроек
  // текста, и внутри попапа со списком закладок), но ниже f7-dialog
  z-index: 13000;
}

.sh-backdrop {
  position: fixed;
  inset: 0;
  // Само затемнение рисует .sh-hole через box-shadow — здесь только перехват
  // кликов вне выреза, чтобы подсказку можно было закрыть тапом мимо
  background-color: transparent;
}

.sh-hole {
  position: fixed;
  background-color: transparent;
  box-shadow: 0 0 0 9999px rgba(69, 69, 69, 0.5);
  pointer-events: none;
}

.sh-hand {
  position: fixed;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}

.sh-card {
  position: fixed;
  left: 16px;
  right: 16px;
  background-color: var(--content-color-white-100);
  border-radius: 12px;
  padding: 12px 16px 16px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
}

.sh-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
}

.sh-progress {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--content-color-black-40);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.sh-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--content-color-black-primary);
  padding-right: 28px;
}

.sh-text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.4;
  color: var(--content-color-black-secondary);
}

.sh-actions {
  display: flex;
  gap: 10px;
}

.sh-button {
  flex: 1 0 0;
}

:global(.dark) {
  .sh-card {
    background-color: var(--content-color-baige-10-no-opacity);
  }

  .sh-progress {
    color: var(--content-color-baige-60);
  }

  .sh-title {
    color: var(--content-color-baige-100);
  }

  .sh-text {
    color: var(--content-color-baige-90);
  }
}
</style>
