<template>
  <li
    class="rite-card"
    :class="{ 'rite-card--error': item.errors.length > 0 }"
    :data-rite-id="item.id"
  >
    <div class="rite-card__head">
      <label class="rite-card__select">
        <f7-checkbox
          :checked="item.checked"
          :aria-label="`Выбрать записку №${item.number}`"
          @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
        />
        <span class="rite-card__number">№{{ item.number }}</span>
      </label>

      <div class="rite-card__price">
        <span class="rite-card__sum">{{ formatPrice(item.sum) }}&nbsp;₽</span>
        <f7-link
          class="rite-card__edit"
          icon-only
          :aria-label="`Редактировать записку №${item.number}`"
          @click="emit('edit')"
        >
          <SvgIcon icon="pencil" :size="24" :color="actionColor" />
        </f7-link>
      </div>
    </div>

    <div class="rite-card__line rite-card__line--head"></div>

    <div class="rite-card__details">
      <div class="rite-card__rows">
        <div v-if="item.type" class="rite-card__row rite-card__row--type">
          <span class="rite-card__label">Поминовение</span>
          <span class="rite-card__value">{{ item.type.name }}</span>
        </div>
        <div v-if="period" class="rite-card__row rite-card__row--period">
          <span class="rite-card__label">Период</span>
          <span class="rite-card__value">
            {{ period.from }}<template v-if="period.to">&nbsp;-<br class="rite-card__period-break" />
              {{ period.to }}</template>
          </span>
        </div>
        <div class="rite-card__row rite-card__row--names">
          <span class="rite-card__label">Имена</span>
          <span class="rite-card__value">{{ namesText }}</span>
        </div>
      </div>

      <div class="rite-card__line"></div>

      <div class="rite-card__actions">
        <f7-link
          class="rite-card__action rite-card__action--copy"
          :aria-label="`Дублировать записку №${item.number}`"
          @click="emit('copy')"
        >
          <span class="rite-card__action-text">Дублировать</span>
          <span class="rite-card__action-icon"><SvgIcon icon="copy" :size="24" :color="actionColor" /></span>
        </f7-link>
        <f7-link
          class="rite-card__action rite-card__action--delete"
          :aria-label="`Удалить записку №${item.number}`"
          @click="emit('remove')"
        >
          <span class="rite-card__action-text">Удалить</span>
          <span class="rite-card__action-icon"><SvgIcon icon="delete" :size="24" :color="actionColor" /></span>
        </f7-link>
      </div>
    </div>

    <p v-if="item.errors.length > 0" class="rite-card__error" role="alert">
      {{ item.errors.map((error) => error.description).join(". ") }}
    </p>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { formatNames, formatPeriod, formatPrice } from "@/services/rites/ritesFormat";
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
</script>

<style lang="less">
// Мобильная карточка: шапка (выбор, номер, сумма, правка), строки с подписями, действия-ссылки.
// На планшете та же разметка собирается в одну строку таблицы.
.rite-card {
  --rite-card-padding: 10px;

  position: relative;
  padding: var(--rite-card-padding);
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--rites-card-bg);
  list-style: none;
  color: var(--rites-text);

  &--error {
    border-color: var(--red-r-100);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__select {
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
  }

  &__number {
    font-size: var(--mobile-main-text-bold-b3);
    line-height: 20px;
    font-weight: 700;
    white-space: nowrap;
  }

  &__price {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__sum {
    font-size: var(--mobile-main-text-bold-b3);
    line-height: 20px;
    font-weight: 700;
    white-space: nowrap;
  }

  &__edit.link,
  &__action-icon {
    width: 24px;
    height: 24px;
  }

  &__edit.link {
    justify-content: center;
  }

  &__line {
    height: 1px;
    margin-top: 14px;
    background: var(--rites-divider);

    &--head {
      margin-bottom: 14px;
    }
  }

  &__details {
    padding: 0 0 4px 40px;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__row {
    display: flex;
    gap: 6px;
    font-size: 14px;
    line-height: 16px;
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
    gap: 27px;
    margin-top: 14px;
  }

  &__action.link {
    height: auto;
    padding: 0;
    justify-content: flex-start;
    color: var(--rites-accent);
    font-size: 14px;
    line-height: 18px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
  }

  &__action-icon {
    display: none;
  }

  &__error {
    margin: 10px 0 0;
    font-size: 12px;
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

    // Блоки мобильной карточки растворяются: их содержимое становится ячейками одной строки
    &__head,
    &__price,
    &__details,
    &__rows,
    &__actions {
      display: contents;
    }

    &__line {
      display: none;
    }

    &__select {
      grid-column: 1 / 3;
      gap: 10px;
    }

    &__number,
    &__sum {
      font-size: 14px;
      line-height: 18px;
      font-weight: 400;
    }

    &__row {
      position: relative;
      align-self: stretch;
      align-items: center;
      font-size: 14px;
      line-height: 18px;

      // Разделитель между колонками
      &::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: -5px;
        width: 1px;
        background: var(--rites-divider);
      }

      &--period::before {
        display: none;
      }
    }

    &__label {
      display: none;
    }

    &__value {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      color: var(--rites-text);
    }

    &__row--type {
      grid-column: 3;
      grid-row: 1;
      margin-right: 20px;

      .rite-card__value {
        font-weight: 700;
      }
    }

    &__row--period {
      grid-column: 4;
      grid-row: 1;
    }

    &__row--names {
      grid-column: 5;
      grid-row: 1;
      padding-left: 10px;
    }

    &__period-break {
      display: inline;
    }

    &__sum {
      position: relative;
      grid-column: 6;
      grid-row: 1;
      align-self: stretch;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-weight: 700;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: -5px;
        width: 1px;
        background: var(--rites-divider);
      }
    }

    &__edit.link {
      position: relative;
      grid-column: 7;
      grid-row: 1;
      margin-left: 11px;

      // Разделитель между суммой и иконками на всю высоту строки
      &::before {
        content: "";
        position: absolute;
        top: -12px;
        bottom: -12px;
        left: -10.5px;
        width: 1px;
        background: var(--rites-divider);
      }
    }

    &__action {
      &--copy.link {
        grid-column: 8;
        grid-row: 1;
        margin-left: 6px;
      }

      &--delete.link {
        grid-column: 9;
        grid-row: 1;
        margin-left: 6px;
      }
    }

    &__action-text {
      display: none;
    }

    &__action-icon {
      display: flex;
    }

    &__error {
      grid-column: 1 / -1;
      margin-top: 4px;
    }
  }
}
</style>
