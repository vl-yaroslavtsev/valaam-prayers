<template>
  <div ref="overlay" class="reading-basics-tutorial">
    <div class="rbt-backdrop"></div>

    <template v-if="step === 0 || step === 1">
      <div class="rbt-circle rbt-circle-edge" :style="edgeCircleStyle"></div>
    </template>

    <template v-else-if="step === 2">
      <div class="rbt-circle rbt-circle-center" :style="centerCircleStyle"></div>
    </template>

    <template v-else>
      <div class="rbt-circle rbt-circle-corner" :style="cornerCircleStyle"></div>
    </template>

    <div
      class="rbt-card"
      :class="placeBelow ? 'rbt-card--caret-top' : 'rbt-card--caret-bottom'"
      :style="cardStyle"
    >
      <div class="rbt-caret" :style="caretStyle"></div>
      <f7-link class="rbt-close" icon-only @click="emit('close')">
        <SvgIcon icon="cancel" :size="20" color="black-40" />
      </f7-link>

      <div class="rbt-progress">{{ step + 1 }} из {{ stepsCount }}</div>

      <h3 class="rbt-title">{{ currentContent.title }}</h3>
      <p class="rbt-text">{{ currentContent.text }}</p>

      <div class="rbt-actions">
        <f7-button
          v-if="step > 0"
          outline
          round
          class="rbt-button"
          @click="emit('prev')"
        >
          Назад
        </f7-button>
        <f7-button
          fill
          round
          class="rbt-button"
          @click="emit('next')"
        >
          {{ isLastStep ? "Готово" : "Далее" }}
        </f7-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { isAndroid } from "@/js/device";
import {
  BOOKMARK_ZONE_SIZE,
  TAP_ZONE_ALONG_START_RATIO,
} from "@/components/text-paginator/tapZone";
import SvgIcon from "@/components/SvgIcon.vue";

const { pageMode, step, stepsCount } = defineProps<{
  pageMode: "horizontal" | "vertical";
  step: number;
  stepsCount: number;
}>();

const emit = defineEmits<{
  next: [];
  prev: [];
  close: [];
}>();

const isHorizontal = computed(() => pageMode === "horizontal");
const isLastStep = computed(() => step >= stepsCount - 1);

// Диаметры кругов, обозначающих зоны — декоративны, но их положение вдоль
// продольной оси привязано к реальной геометрии зон (см. tapZone.ts), чтобы
// не разъезжаться с фактическим поведением тапа
const EDGE_CIRCLE_SIZE = 132;
const CENTER_CIRCLE_SIZE = 168;
const CORNER_CIRCLE_SIZE = 110;

const alongZonePercent = TAP_ZONE_ALONG_START_RATIO * 100;
const edgeCenterPercent = alongZonePercent / 2;

const overlayRef = useTemplateRef<HTMLElement>("overlay");
const overlayWidth = ref(0);
const overlayHeight = ref(0);

const updateOverlaySize = () => {
  overlayWidth.value = overlayRef.value?.clientWidth ?? 0;
  overlayHeight.value = overlayRef.value?.clientHeight ?? 0;
};

const edgeCircleStyle = computed(() => {
  const style = { width: `${EDGE_CIRCLE_SIZE}px`, height: `${EDGE_CIRCLE_SIZE}px` };
  const isBack = step === 0;
  if (isHorizontal.value) {
    return isBack
      ? { ...style, left: `${edgeCenterPercent}%`, top: "50%" }
      : { ...style, left: `${100 - edgeCenterPercent}%`, top: "50%" };
  }
  return isBack
    ? { ...style, left: "50%", top: `${edgeCenterPercent}%` }
    : { ...style, left: "50%", top: `${100 - edgeCenterPercent}%` };
});

const centerCircleStyle = {
  width: `${CENTER_CIRCLE_SIZE}px`,
  height: `${CENTER_CIRCLE_SIZE}px`,
  left: "50%",
  top: "50%",
};

// Центр круга совмещён с центром реальной зоны закладки (верхний правый угол,
// см. BOOKMARK_ZONE_SIZE) — круг больше самой зоны, поэтому слегка выходит за края экрана
const cornerCircleStyle = {
  width: `${CORNER_CIRCLE_SIZE}px`,
  height: `${CORNER_CIRCLE_SIZE}px`,
  top: `${BOOKMARK_ZONE_SIZE / 2}px`,
  right: `${BOOKMARK_ZONE_SIZE / 2}px`,
};

const stepsContent = computed(() => [
  {
    title: "Листание назад",
    text: isHorizontal.value
      ? "Коснитесь левого края экрана, чтобы вернуться на страницу назад."
      : "Коснитесь верхнего края экрана, чтобы прокрутить страницу вверх.",
  },
  {
    title: "Листание вперёд",
    text: isHorizontal.value
      ? "Коснитесь правого края экрана, чтобы перейти на страницу вперёд."
      : "Коснитесь нижнего края экрана, чтобы прокрутить страницу вниз.",
  },
  {
    title: "Как показать меню",
    text: "Коснитесь в центре экрана, чтобы показать или скрыть меню.",
  },
  {
    title: "Добавление закладки",
    text: "Коснитесь правого верхнего угла экрана, чтобы добавить закладку на этой странице. Позже вы сможете быстро вернуться к ней из списка закладок.",
  },
]);

const currentContent = computed(
  () => stepsContent.value[step] ?? stepsContent.value[0]
);

// Плашка на всю ширину, по вертикали рядом с подсветкой — как в SpotlightHint:
// под кружком, если снизу хватает места, иначе над ним
const CARD_MARGIN = 12;
const CARD_SIDE_INSET = 16;
const MIN_SPACE_BELOW = 160;
const CARET_EDGE_PAD = 20;

const circleBounds = computed(() => {
  const width = overlayWidth.value;
  const height = overlayHeight.value;
  if (height <= 0 || width <= 0) return null;

  if (step === 0 || step === 1) {
    const radius = EDGE_CIRCLE_SIZE / 2;
    const isBack = step === 0;
    const centerX = isHorizontal.value
      ? ((isBack ? edgeCenterPercent : 100 - edgeCenterPercent) / 100) * width
      : width / 2;
    const centerY = isHorizontal.value
      ? height / 2
      : ((isBack ? edgeCenterPercent : 100 - edgeCenterPercent) / 100) * height;
    return { top: centerY - radius, bottom: centerY + radius, centerX };
  }

  if (step === 2) {
    const radius = CENTER_CIRCLE_SIZE / 2;
    const centerY = height / 2;
    return { top: centerY - radius, bottom: centerY + radius, centerX: width / 2 };
  }

  // Угол закладки: визуальный центр совпадает с центром BOOKMARK_ZONE
  // (см. .rbt-circle-corner { transform: translate(50%, -50%) })
  const radius = CORNER_CIRCLE_SIZE / 2;
  const centerY = BOOKMARK_ZONE_SIZE / 2;
  return {
    top: centerY - radius,
    bottom: centerY + radius,
    centerX: width - BOOKMARK_ZONE_SIZE / 2,
  };
});

const placeBelow = computed(() => {
  const bounds = circleBounds.value;
  const height = overlayHeight.value;
  if (!bounds || height <= 0) return true;
  return height - bounds.bottom >= MIN_SPACE_BELOW;
});

const cardStyle = computed(() => {
  const bounds = circleBounds.value;
  const height = overlayHeight.value;
  if (!bounds || height <= 0) {
    return { bottom: "calc(var(--f7-safe-area-bottom) + 24px)" };
  }
  return placeBelow.value
    ? { top: `${bounds.bottom + CARD_MARGIN}px`, bottom: "auto" }
    : { top: "auto", bottom: `${height - bounds.top + CARD_MARGIN}px` };
});

const caretStyle = computed(() => {
  const bounds = circleBounds.value;
  const width = overlayWidth.value;
  if (!bounds || width <= 0) return {};
  const cardWidth = width - CARD_SIDE_INSET * 2;
  const minLeft = CARET_EDGE_PAD;
  const maxLeft = cardWidth - CARET_EDGE_PAD;
  const left = Math.min(maxLeft, Math.max(minLeft, bounds.centerX - CARD_SIDE_INSET));
  return { left: `${left}px` };
});

// Аппаратная кнопка "Назад" на Android должна закрывать тур, а не саму страницу чтения.
// device.onBackKey — единственный глобальный слот (см. src/js/viewsManager.ts), поэтому
// временно подменяем window.onBackPressed напрямую и восстанавливаем предыдущий обработчик
let previousOnBackPressed: (() => boolean) | undefined;

onMounted(() => {
  updateOverlaySize();
  window.addEventListener("resize", updateOverlaySize);
  window.addEventListener("orientationchange", updateOverlaySize);

  if (!isAndroid || typeof window === "undefined") return;
  previousOnBackPressed = window.onBackPressed;
  window.onBackPressed = () => {
    emit("close");
    return true;
  };
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateOverlaySize);
  window.removeEventListener("orientationchange", updateOverlaySize);

  if (!isAndroid || typeof window === "undefined") return;
  window.onBackPressed = previousOnBackPressed;
});
</script>

<style scoped lang="less">
.reading-basics-tutorial {
  position: fixed;
  top: var(--f7-safe-area-top);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 700;
}

.rbt-backdrop {
  position: absolute;
  inset: 0;
  background-color: transparent; //   rgba(69, 69, 69, 0.5)
}

.rbt-circle {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background-color: transparent;
  box-shadow: 0 0 0 9999px rgba(69, 69, 69, 0.5);
  animation: rbt-pulse 2.2s ease-in-out infinite;
}

.rbt-circle-corner {
  transform: translate(50%, -50%);
  animation: rbt-pulse-right 2.2s ease-in-out infinite;
}

@keyframes rbt-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@keyframes rbt-pulse-right {
  0%,
  100% {
    transform: translate(50%, -50%) scale(1);
  }
  50% {
    transform: translate(50%, -50%) scale(1.06);
  }
}

.rbt-card {
  position: absolute;
  left: 16px;
  right: 16px;
  background-color: var(--content-color-white-100);
  border-radius: 12px;
  padding: 12px 16px 16px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
}

.rbt-caret {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}

.rbt-card--caret-top .rbt-caret {
  top: -10px;
  border-bottom: 12px solid var(--content-color-white-100);
}

.rbt-card--caret-bottom .rbt-caret {
  bottom: -10px;
  border-top: 12px solid var(--content-color-white-100);
}

.rbt-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
}

.rbt-progress {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--content-color-black-40);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.rbt-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--content-color-black-primary);
  padding-right: 28px;
}

.rbt-text {
  margin: 0 0 16px;
  font-size: 16px;
  line-height: 1.4;
  color: var(--content-color-black-secondary);
}

.rbt-actions {
  display: flex;
  gap: 10px;
}

.rbt-button {
  flex: 1 0 0;
}

:global(.dark) {
  .rbt-card {
    background-color: var(--content-color-baige-10-no-opacity);
  }

  .rbt-card--caret-top .rbt-caret {
    border-bottom-color: var(--content-color-baige-10-no-opacity);
  }

  .rbt-card--caret-bottom .rbt-caret {
    border-top-color: var(--content-color-baige-10-no-opacity);
  }

  .rbt-progress {
    color: var(--content-color-baige-60);
  }

  .rbt-title {
    color: var(--content-color-baige-100);
  }

  .rbt-text {
    color: var(--content-color-baige-90);
  }
}
</style>
