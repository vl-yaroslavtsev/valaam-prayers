<template>
  <f7-sheet
    v-model:opened="opened"
    class="rite-info-sheet"
    :class="type?.type ? `rite-type-${type.type}` : undefined"
    bottom
    backdrop
    backdrop-el=".rite-popup .rite-sheet-backdrop"
    swipe-to-close
    swipe-handler=".swipe-handler"
  >
    <div class="swipe-handler"></div>
    <div class="rite-info-sheet__body">
      <template v-if="prices.length">
        <h2 class="rite-info-sheet__title">Рекомендуемое<br> пожертвование за 1 имя:</h2>
        <ul class="rite-info-sheet__prices">
          <li>Молебен, панихида, разовое - <b>10 руб.</b></li>
          <li>Проскомидия (1 год) - <b>2000 руб.</b></li>
          <li>Проскомидия (40 дней) - <b>500 руб.</b></li>
          <li>Неусыпаемая Псалтырь (1 год) - <b>2000 руб.</b></li>
          <li>Пожертвование добровольное. Сумму можно изменить.</li>
        </ul>
      </template>

      <h2 class="rite-info-sheet__title">Как правильно заполнить</h2>
      <p>Поминаются только <b>крещёные православные</b>.<br> Самоубийц писать нельзя.</p>
      <p>Имена пишутся в родительном падеже (Олега, Владимира, Наталии, Елены) без пробелов и знаков препинания.</p>
      <p>Пометка пишется в поле ниже: <br>младенца, воина, иерея, и т.д.</p>
      <p>При возникновении вопросов пишите нам на 
        <a class="external" 
           href="mailto:rites@valaam.ru" 
           target="_blank">rites@valaam.ru</a>
      </p>

      <template v-if="type">
        <h2 class="rite-info-sheet__title">{{ type.shortName }}</h2>
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

console.log(type);

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
  // Лист светлый, как бланк записки: и в тёмной теме текст тёмный
  color: var(--content-color-black-primary);

  // Внутренняя область листа не прокручивается сама
  &__body {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    padding: 40px 20px calc(24px + var(--f7-safe-area-bottom));
    font-size: 16px;
    line-height: 20px;

    a {
      color: var(--brand-color-primary-accent-50);
      text-decoration: underline;
    }
  }

  &__title {
    margin: 0 0 16px;
    font-family: var(--font3), serif;
    font-size: 26px;
    line-height: 30px;
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
}
</style>
