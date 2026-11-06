<template>
  <li class="history-item" :data-rite-id="item.id">
    <div class="history-item__head">
      <div class="history-item__title">
        <div class="history-item__title-row">
          <span class="history-item__number">Записка №{{ item.number }}</span>
          <span
            v-if="item.type"
            class="history-item__chip"
            :class="item.type.type ? `history-item__chip--${item.type.type}` : ''"
          >
            {{ item.type.typeName }}
          </span>
        </div>
        <div class="history-item__meta">
          <span v-if="item.type" v-html="item.type.shortName"></span>
          <span v-if="item.datePayment">от {{ item.datePayment.value }} г.</span>
        </div>
      </div>
      <span class="history-item__sum">{{ formatPrice(item.sum) }}&nbsp;₽</span>
    </div>

    <div class="history-item__body">
      <div class="history-item__details">
        <div v-if="item.status" class="history-item__detail history-item__detail--status">
          <span class="history-item__label">Статус</span>
          <span class="history-item__value" :style="color ? { color } : undefined">
            {{ item.status.name }}
          </span>
        </div>
        <div class="history-item__detail">
          <span class="history-item__label">Имена</span>
          <span class="history-item__value">{{ namesText }}</span>
        </div>
        <div v-if="period" class="history-item__detail">
          <span class="history-item__label">
            {{ period.to ? "Период поминовения" : "Дата поминовения" }}
          </span>
          <span class="history-item__value">
            {{ period.from }}<template v-if="period.to"> — {{ period.to }}</template>
          </span>
        </div>
      </div>

      <f7-button
        v-if="item.canChange"
        outline
        large
        class="history-item__button"
        :aria-label="`Редактировать записку №${item.number}`"
        @click="emit('edit')"
      >
        Редактировать
      </f7-button>
      <f7-button
        v-else
        fill
        large
        class="history-item__button history-item__button--fill"
        :aria-label="`Подать ещё раз записку №${item.number}`"
        @click="emit('copy')"
      >
        Подать ещё раз
      </f7-button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { Rite } from "@/services/rites/ritesApi";
import { formatNames, formatPeriodLong, formatPrice, statusColor } from "@/services/rites/ritesFormat";

const { item } = defineProps<{
  item: Rite;
}>();

const emit = defineEmits<{
  edit: [];
  copy: [];
}>();

const { isDarkMode } = useTheme();

const color = computed(() => statusColor(item.status, isDarkMode.value));
const period = computed(() => formatPeriodLong(item.period));
const namesText = computed(() => formatNames(item.names));
</script>

<style lang="less">
// Мобильная карточка: шапка (номер, чип, тип, дата, сумма), ниже статус, имена, период и кнопка.
// На планшете сумма уходит вправо, а статус, имена и период встают в три колонки.
.history-item {
  --history-chip-health-color: var(--red-r-100);
  --history-chip-health-bg: rgba(235, 87, 87, 0.1);
  --history-chip-health-border: rgba(235, 87, 87, 0.04);
  --history-chip-repose-color: var(--content-color-black-primary);
  --history-chip-repose-bg: var(--content-color-black-5);
  --history-chip-repose-border: var(--content-color-black-5);
  --history-label: rgba(0, 0, 0, 0.5);
  --history-value: #000;
  --history-meta: var(--content-color-black-60);
  --history-divider: var(--content-color-black-20);

  overflow: hidden;
  border-radius: 16px;
  background: var(--rites-card-bg);
  list-style: none;
  color: var(--rites-text);

  &__head {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 25px;
    border-bottom: 1px solid var(--history-divider);
  }

  &__title {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  &__number,
  &__sum {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    color: var(--rites-text);
    white-space: nowrap;
  }

  &__chip {
    padding: 5px 8px 6px;
    border: 1px solid var(--history-chip-repose-border);
    border-radius: 30px;
    background: var(--history-chip-repose-bg);
    font-size: 12px;
    line-height: 18px;
    color: var(--history-chip-repose-color);
    white-space: nowrap;

    &--health {
      border-color: var(--history-chip-health-border);
      background: var(--history-chip-health-bg);
      color: var(--history-chip-health-color);
    }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    line-height: 18px;
    color: var(--history-meta);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 30px;
    padding: 20px 25px;
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__label {
    font-size: 16px;
    line-height: 20px;
    color: var(--history-label);
  }

  &__detail--status &__label {
    font-size: 14px;
    line-height: 18px;
  }

  &__value {
    font-size: 16px;
    line-height: 20px;
    color: var(--history-value);
  }

  &__detail--status &__value {
    color: var(--rites-text);
  }

  // Кнопки как в корзине: контур или заливка по макету
  .history-item__button.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;

    padding: 0 30px;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .history-item__button--fill.button {
    --f7-button-bg-color: var(--rites-pay-bg);
    --f7-button-fill-bg-color: var(--rites-pay-bg);
    --f7-button-fill-text-color: var(--rites-pay-text);

    border: 1px solid var(--rites-pay-border);
  }
}

.dark .history-item {
  --history-chip-health-color: #ff9191;
  --history-chip-health-bg: rgba(255, 145, 145, 0.1);
  --history-chip-health-border: rgba(255, 145, 145, 0.04);
  --history-chip-repose-color: var(--content-color-white-100);
  --history-chip-repose-bg: var(--content-color-baige-5);
  --history-chip-repose-border: var(--content-color-baige-5);
  --history-label: var(--content-color-baige-40);
  --history-value: var(--content-color-white-100);
  --history-meta: var(--content-color-baige-60);
  --history-divider: var(--content-color-baige-30);
}

@media (min-width: 744px) {
  .history-item {
    &__head {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }

    &__details {
      flex-direction: row;
      gap: 20px;
    }

    &__detail {
      flex: 1 1 0;
    }

    .history-item__button.button {
      font-size: 12px;
      line-height: 18px;
      letter-spacing: 1.38px;
    }
  }
}
</style>
