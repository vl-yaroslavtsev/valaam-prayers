<template>
  <f7-page name="rites-history" @page:beforein="onPageBeforeIn" @page:afterin="onPageShown">
    <f7-navbar large transparent>
      <f7-nav-left :back-link="!isFirstPage">
        <f7-link v-if="isFirstPage" panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>История записок</f7-nav-title>
      <f7-nav-title-large>История записок</f7-nav-title-large>
    </f7-navbar>

    <f7-block>
      <f7-button outline large @click="f7router.navigate('/rites/')">Корзина записок</f7-button>
    </f7-block>

    <f7-block v-if="isLoading && items.length === 0" class="text-align-center">
      <f7-preloader />
    </f7-block>

    <f7-block v-else-if="error" class="text-align-center">
      <p>{{ error }}</p>
      <f7-button outline large @click="load(1)">Повторить</f7-button>
    </f7-block>

    <f7-block v-else-if="items.length === 0" class="text-align-center">
      <p>У Вас пока нет поданных записок.</p>
    </f7-block>

    <f7-list v-else media-list strong-ios outline-ios>
      <f7-list-item
        v-for="item in items"
        :key="item.id"
        :title="`№ ${item.number}`"
        :after="`${formatPrice(item.sum)} ₽`"
        :subtitle="item.type?.name"
        :text="describe(item)"
      />
    </f7-list>

    <f7-block v-if="hasMore && items.length > 0">
      <f7-button
        outline
        large
        :disabled="isLoading"
        :preloader="isLoading"
        :loading="isLoading"
        @click="load(page + 1)"
      >
        Показать ещё
      </f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { ref } from "vue";
import BurgerIcon from "@/assets/icons/burger.svg?raw";
import { loadHistoryRites, type Rite } from "@/services/rites/ritesApi";
import { formatNames, formatPeriod, formatPrice } from "@/services/rites/ritesFormat";

const { f7router } = defineProps<{
  f7router: Router.Router;
}>();

// Корневая страница вкладки открывает левую панель, открытая из корзины — кнопку «Назад»
const isFirstPage = ref(true);
const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

const items = ref<Rite[]>([]);
const page = ref(1);
const hasMore = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function load(pageNumber: number): Promise<void> {
  if (isLoading.value) return;
  isLoading.value = true;
  error.value = null;
  try {
    const result = await loadHistoryRites(pageNumber);
    items.value = pageNumber === 1 ? result.items : [...items.value, ...result.items];
    page.value = pageNumber;
    hasMore.value = result.hasMore;
  } catch (ex) {
    console.error("Не удалось загрузить историю записок:", ex);
    error.value = "Не удалось загрузить историю записок";
  } finally {
    isLoading.value = false;
  }
}

function describe(item: Rite): string {
  const period = formatPeriod(item.period);
  const dates = period ? (period.to ? `${period.from} – ${period.to}` : period.from) : "";
  return [item.status?.name, dates, formatNames(item.names)].filter(Boolean).join(" · ");
}

function onPageShown(): void {
  void load(1);
}
</script>
