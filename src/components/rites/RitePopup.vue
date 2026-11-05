<template>
  <f7-popup v-model:opened="opened" class="rite-popup" :tablet-fullscreen="true">
    <f7-page>
      <f7-navbar>
        <f7-nav-left>
          <f7-link icon="icon-back" aria-label="Закрыть" @click="opened = false" />
        </f7-nav-left>
        <f7-nav-title>{{ title }}</f7-nav-title>
      </f7-navbar>

      <!-- Форма записки (имена, поминовение, даты, сумма) реализуется отдельной задачей.
           Готовая форма вызывает emit("saved", rite): корзина добавит или обновит записку. -->
      <f7-block strong inset>
        <p>Форма записки появится здесь.</p>
      </f7-block>
    </f7-page>
  </f7-popup>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Rite } from "@/services/rites/ritesApi";

export type RitePopupMode = "create" | "edit" | "copy";

const { mode, item = null } = defineProps<{
  mode: RitePopupMode;
  /** Записка для редактирования или дублирования */
  item?: Rite | null;
}>();

const opened = defineModel<boolean>("opened", { default: false });

defineEmits<{
  /** Записка сохранена на сервере: для create и copy это новая, для edit обновлённая */
  saved: [rite: Rite];
}>();

const title = computed(() => {
  switch (mode) {
    case "edit":
      return item ? `Записка №${item.number}` : "Редактирование записки";
    case "copy":
      return "Дублирование записки";
    default:
      return "Подать записку";
  }
});
</script>
