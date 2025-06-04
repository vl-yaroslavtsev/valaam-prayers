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
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M19.6425 4.35749C19.1266 3.84371 18.4267 3.55743 17.6987 3.56236C16.9706 3.56729 16.2746 3.86302 15.7657 4.38374L4.89075 15.2587L3.5625 20.4375L8.74125 19.1092L19.6163 8.23424C20.137 7.72534 20.4327 7.02943 20.4376 6.30134C20.4426 5.57325 20.1563 4.8734 19.6425 4.35749Z"
      stroke="white"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M15.4551 4.69511L19.3056 8.54561"
      stroke="white"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M13.8838 6.26542L17.7343 10.1159"
      stroke="white"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M4.8916 15.2586L8.74585 19.1053"
      stroke="white"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
<script setup lang="ts">
const { size = 24, color = "white" } = defineProps({
  color: String,
  size: Number,
});
</script>
