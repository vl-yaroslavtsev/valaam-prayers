<template>
  <f7-sheet
    v-model:opened="opened"
    class="rite-info-sheet"
    bottom
    backdrop
    swipe-to-close
    swipe-handler=".swipe-handler"
  >
    <div class="swipe-handler"></div>
    <div class="rite-info-sheet__body">
      <h2 class="rite-info-sheet__title">{{ type?.typeName }}</h2>

      <template v-if="prices.length">
        <p class="rite-info-sheet__subtitle">Рекомендуемое пожертвование за 1 имя:</p>
        <ul class="rite-info-sheet__prices">
          <li v-for="item in prices" :key="item.name">
            {{ item.name }} - {{ formatPrice(item.price) }}&nbsp;руб.
          </li>
        </ul>
      </template>

      <template v-if="type">
        <h3 class="rite-info-sheet__type">{{ type.shortName }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="rite-info-sheet__description" v-html="description"></div>
      </template>
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { buildPriceList, prepareDescription } from "@/services/rites/riteForm";
import { RITES_API_URL, type RiteType } from "@/services/rites/ritesApi";
import { formatPrice } from "@/services/rites/ritesFormat";

const { types, type } = defineProps<{
  types: RiteType[];
  /** Выбранный тип: по нему показываем вид записки и описание */
  type: RiteType | null;
}>();

const opened = defineModel<boolean>("opened", { default: false });

const prices = computed(() => (type ? buildPriceList(types, type.type) : []));
// Ссылки в описании относительные: ведём их на тот же сайт, откуда данные
const description = computed(() =>
  type ? prepareDescription(type.description, new URL(RITES_API_URL).origin) : "",
);
</script>

<style lang="less">
.rite-info-sheet {
  // Две трети экрана
  --f7-sheet-height: 66.67%;

  // Внутренняя область листа не прокручивается сама
  &__body {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    padding: 40px 20px calc(24px + var(--f7-safe-area-bottom));
    font-size: 14px;
    line-height: 18px;
  }

  &__title {
    margin: 0 0 16px;
    font-family: var(--font3), serif;
    font-size: 26px;
    line-height: 32px;
    font-weight: 400;
  }

  &__subtitle {
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 20px;
    font-weight: 700;
  }

  &__prices {
    margin: 0 0 24px;
    padding: 0;
    list-style: none;

    li {
      padding: 4px 0;
    }
  }

  &__type {
    margin: 0 0 8px;
    font-family: var(--font3), serif;
    font-size: 18px;
    line-height: 24px;
    font-weight: 400;
  }

  &__description a {
    color: var(--brand-color-primary-accent-50);
    text-decoration: underline;
  }
}
</style>
