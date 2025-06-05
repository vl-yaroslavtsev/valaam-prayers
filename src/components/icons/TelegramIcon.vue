<template>
  <svg
    :class="['icon', `color-${color}`, `border-color-${borderColor}`]"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="-0.5"
      y="0.5"
      width="31"
      height="31"
      rx="15.5"
      transform="matrix(-1 0 0 1 31 0)"
      stroke="#F1F1F1"
    />
    <path
      d="M20.8776 22.1552L23.4441 10.2784L23.4431 10.2774C23.67 9.2371 23.0587 8.82198 22.3586 9.06967L7.28286 14.7792C6.24882 15.1755 6.26799 15.7393 7.10632 15.9988L10.965 17.1818L19.9183 11.6466C20.3349 11.3741 20.7203 11.5287 20.4045 11.8011L13.1602 18.229L12.8828 22.1364C13.2863 22.1364 13.4629 21.963 13.6707 21.7589L15.5562 19.9756L19.4653 22.8051C20.1775 23.2014 20.688 22.9974 20.8776 22.1552Z"
      fill="#F1F1F1"
    />
  </svg>
</template>
<script setup lang="ts">
const {
  size = 32,
  color = "white",
  borderColor = "white",
} = defineProps({
  color: String,
  size: Number,
  borderColor: String,
});
</script>
