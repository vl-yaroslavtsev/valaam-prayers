<template>
  <f7-popover
    class="prayers-text-more-popup no-arrow"
    :close-on-escape="true"
    v-model:opened="isOpened"
    @popover:open="onOpen"
  >
    <f7-list>
      <f7-list-item title="Поиск по тексту" link no-chevron @click.prevent="onSearch">
        <template #media>
          <SvgIcon icon="search" :color="rowIconColor" :size="24" />
        </template>
      </f7-list-item>
      <f7-list-item title="Режим обучания" link no-chevron @click.prevent="onTutorial">
        <template #media>
          <SvgIcon icon="question" :color="rowIconColor" :size="24" />
        </template>
      </f7-list-item>
    </f7-list>

    <f7-list>
      <f7-list-item class="share-heading" title="Поделиться">
        <template #media>
          <SvgIcon icon="share" :color="rowIconColor" :size="24" />
        </template>
      </f7-list-item>
    </f7-list>
    <f7-list class="share-list">
      <f7-list-item title="ВКонтакте" link no-chevron @click.prevent="onShare('vk')">
        <template #media>
          <SvgIcon
            icon="vk"
            :size="32"
            :color="shareIconColor"
            :border-color="shareIconBorderColor"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Одноклассники" link no-chevron @click.prevent="onShare('ok')">
        <template #media>
          <SvgIcon
            icon="odnoklassniki"
            :size="32"
            :color="shareIconColor"
            :border-color="shareIconBorderColor"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="WhatsApp" link no-chevron @click.prevent="onShare('whatsapp')">
        <template #media>
          <SvgIcon
            icon="whatsapp"
            :size="32"
            :color="shareIconColor"
            :border-color="shareIconBorderColor"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Telegram" link no-chevron @click.prevent="onShare('telegram')">
        <template #media>
          <SvgIcon
            icon="telegram"
            :size="32"
            :color="shareIconColor"
            :border-color="shareIconBorderColor"
          />
        </template>
      </f7-list-item>
      <f7-list-item
        class="footer-item"
        title="Скопировать ссылку"
        link
        no-chevron
        @click.prevent="onCopyLink"
      >
        <template #media>
          <SvgIcon
            icon="chain"
            :size="32"
            :color="shareIconColor"
            :border-color="shareIconBorderColor"
          />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-popover>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Dom7 as $$ } from "framework7";
import type { Popover } from "framework7/types";
import { useTheme } from "@/composables/useTheme";
import { useShare } from "@/composables/useShare";
import SvgIcon from "@/components/SvgIcon.vue";

const { title, itemUrl, targetEl = null } = defineProps<{
  title: string;
  itemUrl: string;
  targetEl?: HTMLElement | null;
}>();

const isOpened = defineModel<boolean>("isOpened", { default: false });

const emit = defineEmits<{
  "open-search": [];
  "start-tutorial": [];
}>();

const { isDarkMode } = useTheme();
const { shareToVK, shareToOK, shareToWhatsApp, shareToTelegram, copyLink } = useShare();

const rowIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));
const shareIconColor = computed(() => (isDarkMode.value ? "baige-60" : "black-60"));
const shareIconBorderColor = computed(() => (isDarkMode.value ? "baige-30" : "black-20"));

const sharePayload = () => ({
  title,
  url: itemUrl,
});

const onSearch = () => {
  isOpened.value = false;
  emit("open-search");
};

const onTutorial = () => {
  isOpened.value = false;
  emit("start-tutorial");
};

const onShare = (network: "vk" | "ok" | "whatsapp" | "telegram") => {
  const item = sharePayload();
  switch (network) {
    case "vk":
      shareToVK(item);
      break;
    case "ok":
      shareToOK(item);
      break;
    case "whatsapp":
      shareToWhatsApp(item);
      break;
    case "telegram":
      shareToTelegram(item);
      break;
  }
  isOpened.value = false;
};

const onCopyLink = async () => {
  const copied = await copyLink(sharePayload());
  if (copied) {
    isOpened.value = false;
  }
};

const onOpen = (popover: Popover.Popover) => {
  if (targetEl) {
    popover.$targetEl = $$(targetEl);
  }
};
</script>

<style scoped lang="less">
.prayers-text-more-popup {
  --f7-popover-width: 230px;
  --f7-list-margin-vertical: 0;
  --f7-list-item-padding-horizontal: 16px;
  --f7-block-padding-horizontal: 16px;
  --f7-list-item-min-height: 48px;
  --f7-list-item-media-margin: 8px;
  --f7-list-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-title-font-size: var(--mobile-main-text-regular-b3);
  --f7-list-item-title-line-height: var(--mobile-main-text-regular-b3-line-height);
  --f7-list-item-border-color: transparent;
  --separator-color: var(--content-color-black-20);

  padding-top: 8px;

  &.no-arrow {
    :deep(.popover-arrow) {
      display: none;
    }
  }
}

.footer-item {
  border-top: 1px solid var(--separator-color);
  margin-top: 10px;
  padding-top: 10px;
  margin-bottom: 16px;
}

.share-list {
  padding-left: 34px;
}

.share-heading {
  pointer-events: none;
}

.share-list,
.footer-item {
  --f7-list-item-title-text-color: var(--content-color-black-60);
}
</style>

<style lang="less">
.prayers-text-more-popup.popover {
  --f7-list-item-title-text-color: var(--content-color-black-primary);
  --f7-popover-bg-color: var(--content-color-baige-100);
  --f7-list-chevron-icon-area: 0;
  --f7-popover-width: 280px;

  .item-link .item-inner::before,
  .item-link .item-inner::after {
    display: none;
  }
}

.dark .prayers-text-more-popup.popover,
.prayers-text-more-popup.popover.dark {
  --f7-list-item-title-text-color: var(--content-color-white-100);
  --f7-popover-bg-color: var(--content-color-black-primary);
  --separator-color: var(--content-color-baige-30);

  .share-list,
  .footer-item {
    --f7-list-item-title-text-color: var(--content-color-baige-60);
  }
}
</style>
