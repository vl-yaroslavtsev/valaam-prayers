<template>
  <div
    :class="['icon', `color-${color}`, borderColor ? `border-color-${borderColor}` : '']"
    :style="{ width: size + 'px', height: size + 'px' }"
    v-html="svgIcon"
  ></div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

type IconName =
  | "arrow-right-left"
  | "arrow-up-down"
  | "burger"
  | "pencil"
  | "favorite"
  | "favorite-filled"
  | "cancel"
  | "chain"
  | "share"
  | "reset"
  | "delete"
  | "search"
  | "settings"
  | "settings-2"
  | "info"
  | "language"
  | "menu"
  | "home"
  | "calendar"
  | "books"
  | "molitvoslov"
  | "alarm"
  | "notes"
  | "pray"
  | "about"
  | "rites"
  | "telegram"
  | "vk"
  | "whatsapp"
  | "odnoklassniki"
  | "valaam-logo"
  | "align-center"
  | "color-theme"
  | "double-arrow"
  | "fullscreen"
  | "letter-a"
  | "letter-b"
  | "letter-tt"
  | "line-height"
  | "sun"
  | "wrap-text";

type IconColor = 
  | "white"
  | "baige-5"
  | "baige-10"
  | "baige-30"
  | "baige-40"
  | "baige-60"
  | "baige-90"
  | "baige-100"
  | "black-primary"
  | "black-5"
  | "black-10"
  | "black-20"
  | "black-40"
  | "black-60"
  | "primary-accent-50";

type IconBorderColor = 
  | "black-primary"
  | "white"
  | "baige-30"
  | "black-20";

const {
  icon,
  size = 24,
  color = "white",
  borderColor,
} = defineProps<{
  icon: IconName;
  color?: IconColor;
  size?: number;
  borderColor?: IconBorderColor;
}>();

import arrowRightLeftIcon from "@/assets/icons/arrow-right-left.svg?raw";
import arrowUpDownIcon from "@/assets/icons/arrow-up-down.svg?raw";
import burgerIcon from "@/assets/icons/burger.svg?raw";
import pencilIcon from "@/assets/icons/pencil.svg?raw";
import favoriteIcon from "@/assets/icons/favorite.svg?raw";
import favoriteFilledIcon from "@/assets/icons/favorite-filled.svg?raw";
import cancelIcon from "@/assets/icons/cancel.svg?raw";
import chainIcon from "@/assets/icons/chain.svg?raw";
import shareIcon from "@/assets/icons/share.svg?raw";
import resetIcon from "@/assets/icons/reset.svg?raw";
import deleteIcon from "@/assets/icons/delete.svg?raw";
import searchIcon from "@/assets/icons/search.svg?raw";
import settingsIcon from "@/assets/icons/settings.svg?raw";
import settings2Icon from "@/assets/icons/settings-2.svg?raw";
import infoIcon from "@/assets/icons/info.svg?raw";
import homeIcon from "@/assets/icons/home.svg?raw";
import calendarIcon from "@/assets/icons/calendar.svg?raw";
import booksIcon from "@/assets/icons/books.svg?raw";
import molitvoslovIcon from "@/assets/icons/molitvoslov.svg?raw";
import alarmIcon from "@/assets/icons/alarm.svg?raw";
import notesIcon from "@/assets/icons/notes.svg?raw";
import prayIcon from "@/assets/icons/pray.svg?raw";
import aboutIcon from "@/assets/icons/about.svg?raw";
import ritesIcon from "@/assets/icons/rites.svg?raw";
import telegramIcon from "@/assets/icons/telegram.svg?raw";
import vkIcon from "@/assets/icons/vk.svg?raw";
import whatsappIcon from "@/assets/icons/whatsapp.svg?raw";
import odnoklassnikiIcon from "@/assets/icons/odnoklassniki.svg?raw";
import valaamLogoIcon from "@/assets/icons/valaam-logo.svg?raw";
import languageIcon from "@/assets/icons/language.svg?raw";
import menuIcon from "@/assets/icons/menu.svg?raw";
import alignCenterIcon from "@/assets/icons/align-center.svg?raw";
import colorThemeIcon from "@/assets/icons/color-theme.svg?raw";
import doubleArrowIcon from "@/assets/icons/double-arrow.svg?raw";
import fullscreenIcon from "@/assets/icons/fullscreen.svg?raw";
import letterAIcon from "@/assets/icons/letter-a.svg?raw";
import letterBIcon from "@/assets/icons/letter-b.svg?raw";
import letterTtIcon from "@/assets/icons/letter-tt.svg?raw";
import lineHeightIcon from "@/assets/icons/line-height.svg?raw";
import sunIcon from "@/assets/icons/sun.svg?raw";
import wrapTextIcon from "@/assets/icons/wrap-text.svg?raw";

// Используем computed для реактивности
const svgIcon = computed(() => {
  switch (icon) {
    case "arrow-right-left":
      return arrowRightLeftIcon;
    case "arrow-up-down":
      return arrowUpDownIcon;
    case "burger":
      return burgerIcon;
    case "pencil":
      return pencilIcon;
    case "favorite":
      return favoriteIcon;
    case "favorite-filled":
      return favoriteFilledIcon;
    case "cancel":
      return cancelIcon;
    case "chain":
      return chainIcon;
    case "share":
      return shareIcon;
    case "reset":
      return resetIcon;
    case "delete":
      return deleteIcon;
    case "search":
      return searchIcon;
    case "settings":
      return settingsIcon;
    case "settings-2":
      return settings2Icon;
    case "info":
      return infoIcon;
    case "home":
      return homeIcon;
    case "calendar":
      return calendarIcon;
    case "books":
      return booksIcon;
    case "molitvoslov":
      return molitvoslovIcon;
    case "alarm":
      return alarmIcon;
    case "notes":
      return notesIcon;
    case "pray":
      return prayIcon;
    case "about":
      return aboutIcon;
    case "rites":
      return ritesIcon;
    case "telegram":
      return telegramIcon;
    case "vk":
      return vkIcon;
    case "whatsapp":
      return whatsappIcon;
    case "odnoklassniki":
      return odnoklassnikiIcon;
    case "valaam-logo":
      return valaamLogoIcon;
    case "language":
      return languageIcon;
    case "menu":
      return menuIcon;
    case "align-center":
      return alignCenterIcon;
    case "color-theme":
      return colorThemeIcon;
    case "double-arrow":
      return doubleArrowIcon;
    case "fullscreen":
      return fullscreenIcon;
    case "letter-a":
      return letterAIcon;
    case "letter-b":
      return letterBIcon;
    case "letter-tt":
      return letterTtIcon;
    case "line-height":
      return lineHeightIcon;
    case "sun":
      return sunIcon;
    case "wrap-text":
      return wrapTextIcon;
    default:
      return "";
  }
});
</script>
<style scoped lang="less">
.icon {
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
