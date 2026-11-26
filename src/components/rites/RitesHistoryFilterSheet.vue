<template>
  <f7-sheet
    v-model:opened="opened"
    class="history-filter-sheet"
    bottom
    backdrop
    swipe-to-close
    swipe-handler=".swipe-handler"
    @sheet:open="onOpen"
  >
    <div class="swipe-handler"></div>
    <div class="history-filter-sheet__header">
      <h2 class="history-filter-sheet__title">Фильтры</h2>
      <f7-link
        class="history-filter-sheet__close"
        icon-only
        aria-label="Закрыть"
        @click="opened = false"
      >
        <SvgIcon icon="cancel" :size="12" color="primary-accent-50" />
      </f7-link>
    </div>

    <div class="history-filter-sheet__fields">
      <RitesHistorySelect
        v-model="draftType"
        name="historyType"
        label="Требы"
        all-label="Все требы"
        variant="outlined"
        :options="typeOptions"
      />
      <RitesHistorySelect
        v-model="draftStatus"
        name="historyStatus"
        label="Статус"
        all-label="Статус любой"
        variant="outlined"
        :options="statusOptions"
      />
    </div>

    <div class="history-filter-sheet__footer">
      <f7-button fill large class="history-filter-sheet__apply" @click="apply">Применить</f7-button>
    </div>
  </f7-sheet>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RitesHistorySelect, {
  type HistorySelectOption,
} from "@/components/rites/RitesHistorySelect.vue";
import SvgIcon from "@/components/SvgIcon.vue";

defineProps<{
  typeOptions: HistorySelectOption[];
  statusOptions: HistorySelectOption[];
}>();

const opened = defineModel<boolean>("opened", { default: false });
const type = defineModel<string>("type", { default: "" });
const status = defineModel<string>("status", { default: "" });

// Выбор копится в черновике и попадает в страницу только по «Применить»
const draftType = ref(type.value);
const draftStatus = ref(status.value);

function onOpen(): void {
  draftType.value = type.value;
  draftStatus.value = status.value;
}

function apply(): void {
  type.value = draftType.value;
  status.value = draftStatus.value;
  opened.value = false;
}
</script>

<style lang="less">
.history-filter-sheet {
  --f7-sheet-height: auto;
  // Окно может оказаться вне страницы, поэтому переменные полей задаём здесь
  --rites-text: var(--content-color-black-primary);
  --rites-field-border: var(--content-color-black-20);
  --rites-field-bg: transparent;
  --history-close-bg: var(--brand-color-secondary-accent);

  color: var(--rites-text);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 40px 10px 0;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    line-height: 24px;
    font-weight: 700;
  }

  &__close.link {
    width: 32px;
    height: 32px;
    justify-content: center;
    border-radius: 50%;
    background: var(--history-close-bg);
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 30px 10px 40px;
  }

  &__footer {
    padding: 0 10px calc(10px + var(--f7-safe-area-bottom));
  }

  .history-filter-sheet__apply.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;

    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }
}

.dark .history-filter-sheet {
  --rites-text: var(--content-color-white-100);
  --rites-field-border: var(--content-color-baige-30);
  --history-close-bg: var(--brand-color-secondary-accent);

  .history-filter-sheet__close .icon {
    color: var(--brand-color-primary-accent-30);
  }
}
</style>
