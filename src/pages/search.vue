<template>
  <f7-page
    name="search"
    class="search-page"
    infinite
    :infinite-distance="200"
    :infinite-preloader="false"
    @infinite="loadMore()"
    @page:afterin="onPageAfterIn"
  >
    <f7-navbar class="search-navbar">
      <div :class="['search-field', { 'is-filled': hasText, 'has-submit': showSubmit }]">
        <f7-searchbar
          ref="searchbarRef"
          inline
          custom-search
          :backdrop="false"
          :disable-button="false"
          :clear-button="false"
          placeholder="Введите фразу для поиска"
          v-model:value="query"
          @submit="onSubmit"
        >
          <template #input-wrap-start>
            <SvgIcon v-if="!hasText" class="search-field__lead" icon="search" :size="24" color="baige-60" />
          </template>
          <template #input-wrap-end>
            <div class="search-field__actions">
              <button type="button" class="search-field__button" aria-label="Очистить" @click="onClear">
                <SvgIcon icon="cancel" :size="18" color="baige-60" />
              </button>
              <button v-if="showSubmit" type="submit" class="search-field__button" aria-label="Найти">
                <SvgIcon icon="search" :size="24" color="baige-90" />
              </button>
            </div>
          </template>
        </f7-searchbar>
      </div>
    </f7-navbar>

    <div v-if="state === 'loading'" class="search-state">
      <f7-preloader />
    </div>

    <div v-else-if="state === 'error'" class="search-state">
      <p>Не удалось выполнить поиск</p>
      <f7-button small outline @click="retry">Повторить</f7-button>
    </div>

    <template v-else-if="state === 'done'">
      <p v-if="source === 'local'" class="search-notice">
        Нет связи с сервером, поиск только по названиям.
        <a href="#" @click.prevent="retry">Повторить</a>
      </p>

      <div v-if="items.length === 0" class="search-state">
        <p>Ничего не найдено</p>
      </div>

      <div v-else class="search-results">
        <SearchResultCard v-for="item in items" :key="`${item.type}-${item.id}-${item.href}`" :item="item" />
      </div>

      <div v-if="isLoadingMore" class="search-more">
        <f7-preloader />
      </div>
      <div v-else-if="loadMoreFailed" class="search-more">
        <p>Не удалось загрузить ещё</p>
        <f7-button small outline @click="loadMore(true)">Повторить</f7-button>
      </div>
    </template>
  </f7-page>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef, type ComponentPublicInstance } from "vue";
import type { Router } from "framework7/types";

import SvgIcon from "@/components/SvgIcon.vue";
import SearchResultCard from "@/components/search/SearchResultCard.vue";
import { useSearch } from "@/composables/useSearch";
import { buildLocalSearchIndex } from "@/services/search/localSearch";
import { usePrayersStore } from "@/stores/prayers";
import { useSaintsStore } from "@/stores/saints";

const { f7router } = defineProps<{
  f7router: Router.Router;
}>();

const prayersStore = usePrayersStore();
const saintsStore = useSaintsStore();

// Индекс строится лениво: только когда реально понадобился локальный поиск.
const localIndex = computed(() =>
  buildLocalSearchIndex({
    elements: prayersStore.elements,
    sections: prayersStore.sections,
    saints: saintsStore.saints,
  })
);

const { query, state, items, source, isDirty, isLoadingMore, loadMoreFailed, submit, retry, clear, loadMore } =
  useSearch(() => localIndex.value);

const hasText = computed(() => query.value.length > 0);
// Лупа справа нужна, пока введённый текст ещё не отправлен (в макете после выдачи остаётся только крестик)
const showSubmit = computed(() => query.value.trim().length > 0 && isDirty.value);

const searchbarRef = useTemplateRef<ComponentPublicInstance>("searchbarRef");

const focusInput = () => {
  const input = searchbarRef.value?.$el?.querySelector("input") as HTMLInputElement | null;
  input?.focus({ preventScroll: true });
};

// Клавиатуру открываем только на пустом экране: при возврате к результатам она не нужна
const onPageAfterIn = () => {
  if (state.value === "idle" && !hasText.value) focusInput();
};

const onSubmit = (event: Event) => {
  event.preventDefault();
  (document.activeElement as HTMLElement | null)?.blur();
  void submit();
};

// Крестик очищает поле; на пустом поле закрывает экран поиска
const onClear = async () => {
  if (!hasText.value) {
    f7router.back();
    return;
  }
  clear();
  await nextTick();
  focusInput();
};
</script>

<style scoped lang="less">
.search-page {
  // Высота панели из макета: 8 + поле 60 + 8 (строки статус-бара добавляет safe-area)
  --f7-navbar-height: 76px;
}

// Панель поиска в макете тёмная в обеих темах
.search-navbar {
  --f7-navbar-bg-color: var(--content-color-black-primary);
  --f7-navbar-bg-color-rgb: 31, 27, 26;
  --f7-navbar-border-color: var(--content-color-baige-10);
}

.search-field {
  --search-border-color: var(--content-color-baige-30);

  flex: 1;
  min-width: 0;
  padding: 0 10px;

  &.is-filled {
    --search-border-color: var(--content-color-baige-90);
  }

  &:focus-within {
    --search-border-color: var(--brand-color-primary-accent-50);
  }

  :deep(.searchbar) {
    --f7-searchbar-input-border-width: 1px;
    --f7-searchbar-input-border-color: var(--search-border-color);
    --f7-searchbar-input-border-radius: 10px;
    --f7-searchbar-inline-input-border-radius: 10px;
    --f7-searchbar-input-bg-color: transparent;
    --f7-searchbar-input-text-color: var(--content-color-baige-90);
    --f7-searchbar-inline-input-height: 60px;
    --f7-searchbar-input-height: 60px;
    --f7-searchbar-inline-input-padding-horizontal: 15px;
    // слева место под лупу (24 + 6), справа под крестик (48 - 15)
    --f7-searchbar-input-extra-padding-left: 30px;
    --f7-searchbar-input-extra-padding-right: 33px;

    width: 100%;
  }

  &.is-filled :deep(.searchbar) {
    --f7-searchbar-input-extra-padding-left: 0px;
  }

  // и под лупу справа
  &.has-submit :deep(.searchbar) {
    --f7-searchbar-input-extra-padding-right: 81px;
  }

  :deep(.searchbar-icon) {
    display: none;
  }
}

.search-field__lead {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-field__actions {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
}

.search-field__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  background: none;
  -webkit-tap-highlight-color: transparent;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0 40px;
}

.search-state,
.search-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 15px 0;
  text-align: center;
  color: var(--content-color-black-40);
}

.search-more {
  padding-bottom: 40px;
  padding-top: 0;
}

.search-notice {
  margin: 16px 15px 0;
  font-size: var(--mobile-detail-regular-d1);
  line-height: var(--mobile-detail-regular-d1-line-height);
  color: var(--content-color-black-60);

  a {
    color: var(--brand-color-primary-accent-50);
  }
}

:global(.dark .search-state),
:global(.dark .search-more) {
  color: var(--content-color-baige-40);
}

:global(.dark .search-notice) {
  color: var(--content-color-baige-60);
}
</style>
