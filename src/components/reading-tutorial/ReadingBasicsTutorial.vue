<template>
  <div class="reading-basics-tutorial">
    <div class="rbt-backdrop"></div>

    <template v-if="step === 0">
      <div class="rbt-circle rbt-circle-edge" :style="primaryCircleStyle">
        <SvgIcon icon="cursor-hand" :size="40" />
      </div>
      <div class="rbt-circle rbt-circle-edge" :style="secondaryCircleStyle">
        <SvgIcon icon="cursor-hand" :size="40" />
      </div>
      <div class="rbt-circle rbt-circle-center" :style="centerCircleStyle">
        <SvgIcon icon="cursor-hand" :size="40" />
      </div>
    </template>

    <template v-else>
      <div class="rbt-circle rbt-circle-corner" :style="cornerCircleStyle">
        <SvgIcon icon="cursor-hand" :size="34" />
      </div>
    </template>

    <div class="rbt-card">
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
import { computed, onBeforeUnmount, onMounted } from "vue";
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

const primaryCircleStyle = computed(() => {
  const style = { width: `${EDGE_CIRCLE_SIZE}px`, height: `${EDGE_CIRCLE_SIZE}px` };
  return isHorizontal.value
    ? { ...style, left: `${edgeCenterPercent}%`, top: "50%" }
    : { ...style, left: "50%", top: `${edgeCenterPercent}%` };
});

const secondaryCircleStyle = computed(() => {
  const style = { width: `${EDGE_CIRCLE_SIZE}px`, height: `${EDGE_CIRCLE_SIZE}px` };
  const position = `${100 - edgeCenterPercent}%`;
  return isHorizontal.value
    ? { ...style, left: position, top: "50%" }
    : { ...style, left: "50%", top: position };
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
    title: "Как переключать страницы",
    text: isHorizontal.value
      ? "Коснитесь левого края экрана — вернуться на страницу назад, правого — перейти вперёд. Коснитесь в центре, чтобы показать или скрыть меню."
      : "Коснитесь верхнего края экрана — прокрутить страницу вверх, нижнего — вниз. Коснитесь в центре, чтобы показать или скрыть меню.",
  },
  {
    title: "Добавление закладки",
    text: "Коснитесь правого верхнего угла экрана, чтобы добавить закладку на этой странице. Позже вы сможете быстро вернуться к ней из списка закладок.",
  },
]);

const currentContent = computed(
  () => stepsContent.value[step] ?? stepsContent.value[0]
);

// Аппаратная кнопка "Назад" на Android должна закрывать тур, а не саму страницу чтения.
// device.onBackKey — единственный глобальный слот (см. src/js/viewsManager.ts), поэтому
// временно подменяем window.onBackPressed напрямую и восстанавливаем предыдущий обработчик
let previousOnBackPressed: (() => boolean) | undefined;

onMounted(() => {
  if (!isAndroid || typeof window === "undefined") return;
  previousOnBackPressed = window.onBackPressed;
  window.onBackPressed = () => {
    emit("close");
    return true;
  };
});

onBeforeUnmount(() => {
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
  background-color: rgba(69, 69, 69, 0.5);
}

.rbt-circle {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--content-color-white-100);
  animation: rbt-pulse 2.2s ease-in-out infinite;
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

.rbt-card {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(var(--f7-safe-area-bottom) + 24px);
  background-color: var(--content-color-white-100);
  border-radius: 12px;
  padding: 12px 16px 16px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
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
  font-size: 15px;
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
