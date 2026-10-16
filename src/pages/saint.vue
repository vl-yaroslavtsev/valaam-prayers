<template>
  <f7-page name="saint">
    <f7-navbar title="Святой" back-link="Back" />
    <f7-block>
      <!-- Заглушка: страница святого / праздника / иконы ещё не сделана -->
      Страница святого {{ id }} в разработке.
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
defineProps<{
  id?: string;
}>();
</script>
