import type { NavbarIconKey } from "@/components/PrayersTextNavbar.vue";

export interface NavHintCopy {
  toolbar: {
    title: string;
    text: string;
    linkLabel: string;
  };
  action: {
    title: string;
    text: string;
  };
}

export const TOP_MENU_HINT_COPY: Record<NavbarIconKey, { title: string; text: string }> = {
  menu: {
    title: "Содержание и закладки",
    text: "Открывает список глав и ваши закладки для этого текста.",
  },
  language: {
    title: "Смена языка",
    text: "Переключает язык текста молитвы.",
  },
  favorite: {
    title: "Добавить в Избранное",
    text: "Добавляет молитву в Избранное для быстрого доступа.",
  },
  settings: {
    title: "Настройки текста",
    text: "Изменяет размер шрифта, межстрочный интервал и тему чтения.",
  },
  more: {
    title: "Ещё",
    text: "Поиск по тексту, поделиться материалом и повторное обучение.",
  },
};

export const RESET_PROGRESS_HINT = {
  title: "Читать сначала",
  text: "Удобно, если вы дочитали молитвы до конца и хотите, чтобы завтра они открылись с первой страницы.",
};

export const CHAPTER_NAV_HINT_COPY: NavHintCopy = {
  toolbar: {
    title: "Листание по главам",
    text: "Стрелками можно переходить от главы к главе. В центре показано, какая глава сейчас открыта и сколько глав всего. Эту панель можно скрыть в {link}.",
    linkLabel: "настройках",
  },
  action: {
    title: "Содержание",
    text: "Открывает список глав, чтобы сразу перейти к нужной.",
  },
};

export const BOOKMARK_NAV_HINT_COPY: NavHintCopy = {
  toolbar: {
    title: "Листание по закладкам",
    text: "Стрелками можно переходить от закладки к закладке. В центре показано, какая закладка сейчас открыта и сколько закладок всего. Эту панель можно скрыть в {link}.",
    linkLabel: "настройках",
  },
  action: {
    title: "Закладки",
    text: "Открывает список ваших закладок, чтобы сразу перейти к нужной.",
  },
};
