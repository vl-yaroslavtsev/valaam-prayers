<template>
  <f7-popover
    class="share-popover"
    v-model:opened="isOpened"
    @popover:open="onOpen"
  >
    <f7-block-title class="share-title">Поделиться</f7-block-title>
    <f7-list>
      <f7-list-item title="ВКонтакте" @click="shareToVK" link no-chevron>
        <template #media>
          <SvgIcon
            icon="vk"
            :size="32"
            :color="isDarkMode ? 'baige-100' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-30' : 'black-20'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Одноклассники" @click="shareToOK" link no-chevron>
        <template #media>
          <SvgIcon
            icon="odnoklassniki"
            :size="32"
            :color="isDarkMode ? 'baige-100' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-30' : 'black-20'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="WhatsApp" @click="shareToWhatsApp" link no-chevron>
        <template #media>
          <SvgIcon
            icon="whatsapp"
            :size="32"
            :color="isDarkMode ? 'baige-100' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-30' : 'black-20'"
          />
        </template>
      </f7-list-item>
      <f7-list-item title="Telegram" @click="shareToTelegram" link no-chevron>
        <template #media>
          <SvgIcon
            icon="telegram"
            :size="32"
            :color="isDarkMode ? 'baige-100' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-30' : 'black-20'"
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
        link no-chevron
      >
        <template #media>
          <SvgIcon
            icon="chain"
            :size="32"
            :color="isDarkMode ? 'baige-100' : 'black-primary'"
            :border-color="isDarkMode ? 'baige-30' : 'black-20'"
          />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-popover>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import { Dom7 as $$ } from "framework7";
import { f7 } from "framework7-vue";
import type { Popover } from "framework7/types";
import { useTheme } from "@/composables/useTheme";
import { useShare, type SharePayload } from "@/composables/useShare";

import SvgIcon from "@/components/SvgIcon.vue";

const isOpened = defineModel<boolean>({ default: false });
const shareItem = ref<SharePayload | null>(null);
const targetEl = ref<Element | null>(null);
const hasArrow = ref(true);
const { shareToVK: openVK, shareToOK: openOK, shareToWhatsApp: openWhatsApp, shareToTelegram: openTelegram, copyLink: copyShareLink } = useShare();

const open = (item: SharePayload, target?: Element, isArrow: boolean = true) => {
  shareItem.value = item;
  targetEl.value = target || null;
  hasArrow.value = isArrow;

  const reveal = () => {
    isOpened.value = true;
    nextTick(() => {
      if (!target) return;
      const el = document.querySelector(".share-popover") as HTMLElement | null;
      if (!el) return;
      f7.popover.open(el, target as unknown as HTMLElement);
    });
  };

  const el = document.querySelector(".share-popover") as HTMLElement | null;
  if (isOpened.value || el?.classList.contains("modal-in")) {
    isOpened.value = false;
    if (el) {
      f7.popover.close(el, false);
    }
    nextTick(reveal);
    return;
  }

  reveal();
};

const close = () => {
  shareItem.value = null;
  targetEl.value = null;
  isOpened.value = false;
  hasArrow.value = true;
};

defineExpose({
  open,
  close,
});

const { isDarkMode } = useTheme();

const onOpen = (popover: Popover.Popover) => {
  if (targetEl.value) {
    popover.$targetEl = $$(targetEl.value);
  }
  if (!hasArrow.value) {
    popover.el.classList.add('no-arrow');
  } else {
    popover.el.classList.remove('no-arrow');
  }
};

const shareToVK = () => {
  if (!shareItem.value) return;
  openVK(shareItem.value);
  close();
};

const shareToOK = () => {
  if (!shareItem.value) return;
  openOK(shareItem.value);
  close();
};

const shareToWhatsApp = () => {
  if (!shareItem.value) return;
  openWhatsApp(shareItem.value);
  close();
};

const shareToTelegram = () => {
  if (!shareItem.value) return;
  openTelegram(shareItem.value);
  close();
};

const copyLink = async () => {
  if (!shareItem.value) return;
  const copied = await copyShareLink(shareItem.value);
  if (copied) {
    close();
  }
};
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

  --f7-list-font-size: var(--mobile-main-text-regular-b3);

  --f7-block-title-font-size: var(--mobile-detail-regular-d1);
  --f7-block-title-line-height: var(--mobile-detail-regular-d1-line-height);

  --separator-color: var(--content-color-black-20);

  font-size: var(--mobile-detail-regular-d1);
  line-height: var(--mobile-detail-regular-d1-line-height);
  color: var(--content-color-baige-100);

  &.no-arrow {
    margin-top: -13px;

    :deep(.popover-arrow) {
      display: none;
    }
  }
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
    --separator-color: var(--content-color-baige-30);
  }
}
</style>
