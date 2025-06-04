<template>
  <svg
    :class="['icon', `color-${color}`]"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.16406 6.9989H19.834M8.59849 6.9989V5.75513C8.59849 4.65056 9.49392 3.75513 10.5985 3.75513H13.4003C14.5048 3.75513 15.4003 4.65056 15.4003 5.75513V6.9989M5.99791 7.05398V18.2451C5.99791 19.3497 6.89334 20.2451 7.99791 20.2451H15.9775C17.0821 20.2451 17.9775 19.3497 17.9775 18.2451V7.05398M10.285 11.3634V15.9474M13.7137 11.3634V15.9474"
      stroke="#A16D4F"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
<script setup lang="ts">
const { size = 24, color = "primary-acccent-50" } = defineProps({
  color: String,
  size: Number,
});
</script>
