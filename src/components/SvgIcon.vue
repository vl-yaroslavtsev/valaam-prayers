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

import burgerIcon from "@/assets/icons/burger.svg?raw";
import pencilIcon from "@/assets/icons/pencil.svg?raw";
import favoriteIcon from "@/assets/icons/favorite.svg?raw";
import favoriteFillIcon from "@/assets/icons/favorite-fill.svg?raw";
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
  case "settings-2":
    svgIcon = settings2Icon;
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
  case "language":
    svgIcon = languageIcon;
    break;
  case "menu":
    svgIcon = menuIcon;
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

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
