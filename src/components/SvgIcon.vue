<template>
  <div
    :class="['icon', `color-${color}`, borderColor ? `border-color-${borderColor}` : '']"
    :style="{ width: size + 'px', height: size + 'px' }"
    v-html="svgIcon"
  ></div>
</template>
<script setup lang="ts">
type IconName =
  | "burger"
  | "pencil"
  | "favorite"
  | "favorite-fill"
  | "cancel"
  | "chain"
  | "share"
  | "reset"
  | "delete"
  | "search"
  | "settings"
  | "info"
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
  | "valaam-logo";

const {
  icon,
  size = 24,
  color = "white",
  borderColor,
} = defineProps<{
  icon: IconName;
  color?: string;
  size?: number;
  borderColor?: string;
}>();

import burgerIcon from "/icons/burger.svg?raw";
import pencilIcon from "/icons/pencil.svg?raw";
import favoriteIcon from "/icons/favorite.svg?raw";
import favoriteFillIcon from "/icons/favorite-fill.svg?raw";
import cancelIcon from "/icons/cancel.svg?raw";
import chainIcon from "/icons/chain.svg?raw";
import shareIcon from "/icons/share.svg?raw";
import resetIcon from "/icons/reset.svg?raw";
import deleteIcon from "/icons/delete.svg?raw";
import searchIcon from "/icons/search.svg?raw";
import settingsIcon from "/icons/settings.svg?raw";
import infoIcon from "/icons/info.svg?raw";
import homeIcon from "/icons/home.svg?raw";
import calendarIcon from "/icons/calendar.svg?raw";
import booksIcon from "/icons/books.svg?raw";
import molitvoslovIcon from "/icons/molitvoslov.svg?raw";
import alarmIcon from "/icons/alarm.svg?raw";
import notesIcon from "/icons/notes.svg?raw";
import prayIcon from "/icons/pray.svg?raw";
import aboutIcon from "/icons/about.svg?raw";
import ritesIcon from "/icons/rites.svg?raw";
import telegramIcon from "/icons/telegram.svg?raw";
import vkIcon from "/icons/vk.svg?raw";
import whatsappIcon from "/icons/whatsapp.svg?raw";
import odnoklassnikiIcon from "/icons/odnoklassniki.svg?raw";
import valaamLogoIcon from "/icons/valaam-logo.svg?raw";

let svgIcon = "";

switch (icon) {
  case "burger":
    svgIcon = burgerIcon;
    break;
  case "pencil":
    svgIcon = pencilIcon;
    break;
  case "favorite":
    svgIcon = favoriteIcon;
    break;
  case "favorite-fill":
    svgIcon = favoriteFillIcon;
    break;
  case "cancel":
    svgIcon = cancelIcon;
    break;
  case "chain":
    svgIcon = chainIcon;
    break;
  case "share":
    svgIcon = shareIcon;
    break;
  case "reset":
    svgIcon = resetIcon;
    break;
  case "delete":
    svgIcon = deleteIcon;
    break;
  case "search":
    svgIcon = searchIcon;
    break;
  case "settings":
    svgIcon = settingsIcon;
    break;
  case "info":
    svgIcon = infoIcon;
    break;
  case "home":
    svgIcon = homeIcon;
    break;
  case "calendar":
    svgIcon = calendarIcon;
    break;
  case "books":
    svgIcon = booksIcon;
    break;
  case "molitvoslov":
    svgIcon = molitvoslovIcon;
    break;
  case "alarm":
    svgIcon = alarmIcon;
    break;
  case "notes":
    svgIcon = notesIcon;
    break;
  case "pray":
    svgIcon = prayIcon;
    break;
  case "about":
    svgIcon = aboutIcon;
    break;
  case "rites":
    svgIcon = ritesIcon;
    break;
  case "telegram":
    svgIcon = telegramIcon;
    break;
  case "vk":
    svgIcon = vkIcon;
    break;
  case "whatsapp":
    svgIcon = whatsappIcon;
    break;
  case "odnoklassniki":
    svgIcon = odnoklassnikiIcon;
    break;
  case "valaam-logo":
    svgIcon = valaamLogoIcon;
    break;
  default:
    svgIcon = "";
    break;
}
</script>
<style scoped lang="less">
.icon {
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
}
</style>
