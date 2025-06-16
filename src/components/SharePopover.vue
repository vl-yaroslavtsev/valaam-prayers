<template>
  <f7-popover
    class="share-popover"
    v-model:opened="isOpened"
    @popover:open="onOpen"
  >
    <f7-block-title class="share-title">Поделиться</f7-block-title>
    <f7-list>
      <f7-list-item title="ВКонтакте" @click="shareToVK">
        <template #media>
          <SvgIcon
            icon="vk"
            :size="32"
            :color="isDarkMode ? 'baige-1000' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-300' : 'black-200'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Одноклассники" @click="shareToOK">
        <template #media>
          <SvgIcon
            icon="odnoklassniki"
            :size="32"
            :color="isDarkMode ? 'baige-1000' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-300' : 'black-200'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="WhatsApp" @click="shareToWhatsApp">
        <template #media>
          <SvgIcon
            icon="whatsapp"
            :size="32"
            :color="isDarkMode ? 'baige-1000' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-300' : 'black-200'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Telegram" @click="shareToTelegram">
        <template #media>
          <SvgIcon
            icon="telegram"
            :size="32"
            :color="isDarkMode ? 'baige-1000' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-300' : 'black-200'"
          />
        </template>
      </f7-list-item>
    </f7-list>
    <div class="separator"></div>
    <f7-list>
      <f7-list-item
        class="footer-item"
        title="Скопировать ссылку"
        @click="copyLink"
      >
        <template #media>
          <SvgIcon
            icon="chain"
            :size="32"
            :color="isDarkMode ? 'baige-1000' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-300' : 'black-200'"
          />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-popover>
</template>

<script setup lang="ts">
import { onUnmounted } from "vue";
import { Dom7 as $$ } from "framework7";
import { Popover, Toast } from "framework7/types";
import { f7 } from "framework7-vue";
import { useTheme } from "@/composables/useTheme";

import SvgIcon from "@/components/SvgIcon.vue";

interface ShareItem {
  title: string;
  url: string;
}

const { item, targetEl } = defineProps<{
  item?: ShareItem;
  targetEl?: Element;
}>();

const baseUrl = "https://molitvoslov.valaam.ru/app/";

const getShareUrl = (url: string) => {
  return `${baseUrl}#view-prayers:${url}`;
};

const { isDarkMode } = useTheme();

const isOpened = defineModel<boolean>();

const onOpen = (popover: Popover.Popover) => {
  if (targetEl) {
    popover.$targetEl = $$(targetEl);
  }
};

const shareToVK = () => {
  if (!item) return;
  const shareUrl = getShareUrl(item.url);
  const url = `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(item.title)}`;
  window.open(url, "_blank");
  isOpened.value = false;
};

const shareToOK = () => {
  if (!item) return;
  const shareUrl = getShareUrl(item.url);
  const url = `https://connect.ok.ru/offer?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(item.title)}`;
  window.open(url, "_blank");
  isOpened.value = false;
};

const shareToWhatsApp = () => {
  if (!item) return;
  const shareUrl = getShareUrl(item.url);
  const text = `${item.title} ${shareUrl}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  isOpened.value = false;
};

const shareToTelegram = () => {
  if (!item) return;
  const shareUrl = getShareUrl(item.url);
  const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(item.title)}`;
  window.open(url, "_blank");
  isOpened.value = false;
};

let toast: Toast.Toast | null = null;

const copyLink = async () => {
  if (!item) return;
  try {
    const shareUrl = getShareUrl(item.url);
    await navigator.clipboard.writeText(shareUrl);
    showToast("Ссылка скопирована");
    isOpened.value = false;
  } catch (err) {
    console.error("Ошибка копирования:", err);
  }
};

const showToast = (text: string) => {
  if (!toast) {
    toast = f7.toast.create({
      text,
      closeTimeout: 2000,
    });
  }
  toast.open();
};

onUnmounted(() => {
  if (toast) {
    toast.destroy();
  }
});
</script>

<style scoped lang="less">
.share-popover {
  --f7-popover-width: 230px;
  --f7-block-margin-vertical: 20px;
  --f7-block-title-margin-bottom: 12px;
  --f7-list-item-padding-horizontal: 24px;
  --f7-block-padding-horizontal: 24px;
  --f7-list-item-min-height: 40px;
  --f7-list-item-media-margin: 8px;

  --f7-block-title-font-size: var(--mobile-detail-regular-d1);
  --f7-block-title-line-height: var(--mobile-detail-regular-d1-line-height);

  --separator-color: var(--content-color-black-200);

  font-size: var(--mobile-detail-regular-d1);
  line-height: var(--mobile-detail-regular-d1-line-height);
  color: var(--content-color-baige-1000);
}

.share-title {
  font-weight: 700;
}

.separator {
  border-top: 1px solid var(--separator-color);
  height: 0;
  margin: 6px var(--f7-block-padding-horizontal);
}

.footer-item {
  margin-bottom: 16px;
}

.dark {
  .share-popover {
    --separator-color: var(--content-color-baige-300);
  }
}
</style>
