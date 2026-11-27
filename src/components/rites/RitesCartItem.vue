<template>
  <li
    class="rite-card"
    :class="{ 'rite-card--error': item.errors.length > 0 }"
    :data-rite-id="item.id"
  >
    <div class="rite-card__top">
      <label class="rite-card__select">
        <f7-checkbox
          :checked="item.checked"
          :aria-label="`Выбрать записку №${item.number}`"
          @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
        />
        <span class="rite-card__number">№{{ item.number }}</span>
      </label>

      <div class="rite-card__title">
        <template v-if="item.type">
          <span class="rite-card__type">{{ shortName }}</span>
          <RiteTypeChip :type="item.type" />
        </template>
      </div>

      <f7-button
        type="button"
        round
        class="rite-card__edit"
        :aria-label="`Редактировать записку №${item.number}`"
        @click="emit('edit')"
      >
        <SvgIcon icon="pencil" :size="24" :color="actionColor" />
      </f7-button>
    </div>

    <div v-if="namesText" class="rite-card__names">
      <span class="rite-card__names-text">{{ namesText }}</span>
    </div>

    <div class="rite-card__line"></div>

    <div class="rite-card__rows">
      <div class="rite-card__row rite-card__row--number">
        <span class="rite-card__label">Номер</span>
        <span class="rite-card__value">{{ item.number }}</span>
      </div>
      <div v-if="period" class="rite-card__row rite-card__row--period">
        <span class="rite-card__label">Период</span>
        <span class="rite-card__value">
          {{ period.from }}<template v-if="period.to">&nbsp;-<br class="rite-card__period-break" />
            {{ period.to }}</template>
        </span>
      </div>
    </div>

    <div class="rite-card__line"></div>

    <div class="rite-card__actions">
      <f7-button
        type="button"
        small
        class="rite-card__action rite-card__action--copy"
        :aria-label="`Дублировать записку №${item.number}`"
        @click="emit('copy')"
      >
        <span class="rite-card__action-text">Дублировать</span>
        <span class="rite-card__action-icon"><SvgIcon icon="copy" :size="24" :color="actionColor" /></span>
      </f7-button>
      <f7-button
        type="button"
        small
        class="rite-card__action rite-card__action--delete"
        :aria-label="`Удалить записку №${item.number}`"
        @click="emit('remove')"
      >
        <span class="rite-card__action-text">Удалить</span>
        <span class="rite-card__action-icon"><SvgIcon icon="delete" :size="24" :color="actionColor" /></span>
      </f7-button>
      <span class="rite-card__sum">{{ formatPrice(item.sum) }}&nbsp;₽</span>
    </div>

    <p v-if="item.errors.length > 0" class="rite-card__error" role="alert">
      {{ item.errors.map((error) => error.description).join(". ") }}
    </p>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import RiteTypeChip from "@/components/rites/RiteTypeChip.vue";
import { useTheme } from "@/composables/useTheme";
import { formatNames, formatPeriod, formatPrice, formatShortName } from "@/services/rites/ritesFormat";
import type { CartItem } from "@/stores/ritesCart";

const { item } = defineProps<{
  item: CartItem;
}>();

const emit = defineEmits<{
  toggle: [checked: boolean];
  edit: [];
  copy: [];
  remove: [];
}>();

const { isDarkMode } = useTheme();

const actionColor = computed(() => (isDarkMode.value ? "primary-accent-70" : "primary-accent-50"));
const period = computed(() => formatPeriod(item.period));
const namesText = computed(() => formatNames(item.names));
const shortName = computed(() => (item.type ? formatShortName(item.type.shortName) : ""));
</script>

<style scoped lang="less">
// Мобильная карточка: треба и чип, под ними имена, затем номер, период и действия с суммой.
// На планшете те же узлы собираются в строку таблицы: номер остаётся у чекбокса, сумма уходит в свою колонку.
.rite-card {
  --rite-card-padding: 16px;

  position: relative;
  padding: var(--rite-card-padding);
  border: 1px solid transparent;
  border-radius: 16px;
  background: var(--rites-card-bg);
  list-style: none;
  color: var(--rites-text);

  &--error {
    border-color: var(--red-r-100);
  }

  &__top {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    column-gap: 16px;
    align-items: start;
  }

  &__select {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  &__number {
    display: none;
  }

  &__title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: center;
    gap: 8px;
    min-width: 0;
  }

  &__type {
    min-width: 0;
    font-size: var(--mobile-main-text-bold-b3);
    line-height: 20px;
    font-weight: 700;
    overflow-wrap: break-word;
  }

  &__names {
    margin: 8px 0 0 40px;
    font-size: 20px; //16px;
    line-height: 24px; //18px;
    color: var(--rites-text);
  }

  &__names-text {
    overflow-wrap: break-word;
  }

  &__line {
    height: 1px;
    margin: 14px 0 14px 40px;
    background: var(--rites-divider);
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-left: 40px;
  }

  &__row {
    display: flex;
    gap: 6px;
    font-size: 16px;//14px;
    line-height: 18px;//16px;
  }

  &__label {
    flex: 0 0 100px;
    color: var(--rites-muted);
  }

  &__value {
    flex: 1;
    min-width: 0;
    color: var(--rites-text-secondary);
  }

  &__period-break {
    display: none;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -6px 0 -6px 32px;
  }

  &__sum {
    margin-left: auto;
    font-size: var(--mobile-main-text-bold-b3);
    line-height: 20px;
    font-weight: 700;
    white-space: nowrap;
  }

  &__edit.button {
    --f7-button-height: 36px;
    --f7-button-min-width: 36px;
    --f7-button-padding-horizontal: 0;

    width: 36px;
    margin: -6px;
    flex-shrink: 0;
  }

  &__action.button {
    --f7-button-small-height: 36px;
    --f7-button-small-font-size: 16px; // 14px;
    --f7-button-small-font-weight: 400;
    --f7-button-padding-horizontal: 8px;
    --f7-button-text-color: var(--rites-accent);

    width: auto;
    flex-shrink: 0;
  }

  &__action-icon {
    display: none;
    width: 24px;
    height: 24px;
  }

  &__error {
    margin: 10px 0 0;
    font-size: 14px; // 12px;
    line-height: 16px;
    color: var(--red-r-100);
  }
}

@media (min-width: 744px) {
  .rite-card {
    --rite-card-padding: 12px 14px;

    display: grid;
    grid-template-columns: var(--rites-grid-columns);
    align-items: center;
    column-gap: 10px;
    font-size: 14px;
    line-height: 18px;

    &__top,
    &__rows,
    &__actions {
      display: contents;
    }

    &__line,
    &__row--number {
      display: none;
    }

    &__select {
      grid-column: 1 / 3;
      grid-row: 1;
      gap: 10px;
    }

    &__number {
      display: inline;
      font-size: 14px;
      line-height: 18px;
      font-weight: 400;
      white-space: nowrap;
    }

    &__title,
    &__names,
    &__row--period,
    &__sum {
      position: relative;
      align-self: stretch;
      grid-row: 1;
    }

    &__title {
      grid-column: 3;
      margin-right: 10px;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: -10px;
        width: 1px;
        background: var(--rites-divider);
      }
    }

    &__type {
      font-size: 16px; // 14px;
      line-height: 20px; // 18px;
    }

    &__names {
      grid-column: 4;
      display: flex;
      align-items: center;
      margin: 0;
      font-size: 18px; // 14px;
      line-height: 22px; // 18px;
    }

    &__names-text {
      display: -webkit-box;
      min-width: 0;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
    }

    &__row--period {
      grid-column: 5;
      display: flex;
      align-items: center;
      margin: 0;
      padding-left: 10px;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 1px;
        background: var(--rites-divider);
      }
    }

    &__label {
      display: none;
    }

    &__value {
      color: var(--rites-text);
    }

    &__period-break {
      display: inline;
    }

    &__sum {
      grid-column: 6;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin: 0;
      font-size: 14px;
      line-height: 18px;
      padding-right: 10px;
      padding-left: 10px;

      &::before,
      &::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--rites-divider);
      }

      &::before {
        left: 0;
      }

      &::after {
        right: 0;
      }
    }

    &__edit.button,
    &__action.button {
      --f7-button-height: 32px;
      --f7-button-small-height: 32px;
      --f7-button-min-width: 32px;
      --f7-button-padding-horizontal: 0;
      --f7-button-border-radius: 50%;

      width: 32px;
      margin: -4px;
      justify-self: center;
      grid-row: 1;
    }

    &__edit.button {
      grid-column: 7;
    }

    &__action {
      &--copy.button {
        grid-column: 8;
      }

      &--delete.button {
        grid-column: 9;
      }
    }

    &__action-text {
      display: none;
    }

    &__action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &__error {
      grid-column: 1 / -1;
      grid-row: 2;
      margin-top: 4px;
    }
  }

  .button .rite-card__action-icon {
    margin: 0;
  }
}
</style>
