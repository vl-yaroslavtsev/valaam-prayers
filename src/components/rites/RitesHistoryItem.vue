<template>
  <li class="history-item" :data-rite-id="item.id">
    <div class="history-item__head">
      <div class="history-item__title">
        <template v-if="item.type">
          <span class="history-item__type">{{ shortName }}</span>
          <RiteTypeChip :type="item.type" />
        </template>
      </div>
      <div v-if="namesText" class="history-item__names">{{ namesText }}</div>
      <span class="history-item__sum">{{ formatPrice(item.sum) }}&nbsp;₽</span>
    </div>

    <div class="history-item__body">
      <div class="history-item__details">
        <div class="history-item__detail">
          <span class="history-item__label">Записка</span>
          <span class="history-item__value">
            №{{ item.number }}<template v-if="item.datePayment"> от {{ item.datePayment.value }} г.</template>
          </span>
        </div>
        <div v-if="item.status" class="history-item__detail">
          <span class="history-item__label">Статус</span>
          <span class="history-item__value" :style="color ? { color } : undefined">
            {{ item.status.name }}
          </span>
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
        tonal
        large
        class="history-item__button"
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
import RiteTypeChip from "@/components/rites/RiteTypeChip.vue";
import { useTheme } from "@/composables/useTheme";
import type { Rite } from "@/services/rites/ritesApi";
import {
  formatNames,
  formatPeriodLong,
  formatPrice,
  formatShortName,
  statusColor,
} from "@/services/rites/ritesFormat";

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
const shortName = computed(() => (item.type ? formatShortName(item.type.shortName) : ""));
</script>

<style lang="less">
// Мобильная карточка: треба и чип, имена, сумма, ниже записка, статус, период и кнопка.
// На планшете сумма встаёт справа от требы, а записка, статус и период — в три колонки.
.history-item {
  --history-label: rgba(0, 0, 0, 0.5);
  --history-value: #000;
  --history-divider: var(--content-color-black-20);

  overflow: hidden;
  border-radius: 16px;
  background: var(--rites-card-bg);
  list-style: none;
  color: var(--rites-text);

  &__head {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-bottom: 1px solid var(--history-divider);
  }

  &__title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__type,
  &__sum {
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
    color: var(--rites-text);
  }

  &__type {
    min-width: 0;
    overflow-wrap: break-word;
  }

  &__names {
    margin-top: 8px;
    font-size: 20px; // 16px;
    line-height: 24px; // 20 px;
    color: var(--history-value);
    overflow-wrap: break-word;
  }

  &__sum {
    margin-top: 20px; //12px;
    white-space: nowrap;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 30px;
    padding: 16px;
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

  &__value {
    font-size: 16px;
    line-height: 20px;
    color: var(--history-value);
  }

  .history-item__button.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;

    padding: 0 30px;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .history-item__button.button-outline {
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;
  }
}

.dark .history-item {
  --history-label: var(--content-color-baige-40);
  --history-value: var(--content-color-white-100);
  --history-divider: var(--content-color-baige-30);
}

@media (min-width: 744px) {
  .history-item {
    &__head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: 20px;
      row-gap: 8px;
      align-items: center;
    }

    &__title {
      grid-column: 1;
      grid-row: 1;
    }

    &__sum {
      grid-column: 2;
      grid-row: 1;
      margin-top: 0;
      justify-self: end;
    }

    &__names {
      grid-column: 1 / -1;
      grid-row: 2;
      margin-top: 0;
    }

    &__details {
      flex-direction: row;
      gap: 20px;
    }

    &__detail {
      flex: 1 1 0;
    }

    .history-item__button.button {
      font-size: 14px; // 12px;
      line-height: 18px;
      letter-spacing: 1.38px;
    }
  }
}
</style>
