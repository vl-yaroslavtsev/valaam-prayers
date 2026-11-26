/**
 * Обработка главный view приложения
 */
import { Dom7 as $$ } from "framework7";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import { rememberConfirmedEmailFromUrl } from "@/services/rites/ritesApi";
import { useCalendarStore } from "@/stores/calendar";
import { useSettingsStore } from "@/stores/settings";
import { device } from "./device";

const CALENDAR_DAY_URL_REGEXP = /^\/days\/(\d{8})\/?$/;

/** Извлекает код дня из диплинка вида `/days/20261031` (подпути вроде `/readings/...` не трогаем) */
export function parseCalendarDayUrl(url: string): string | null {
  return CALENDAR_DAY_URL_REGEXP.exec(url)?.[1] ?? null;
}

const viewsNames = [
  "home",
  "books",
  "prayers",
  "calendar",
  "rites",
] as const;

export type ViewName = (typeof viewsNames)[number];

let backButtonAttempts = 0;

function viewsManager(): void {
  device.onBackKey(handleBackKey);
  parseHash();
  $$(window).on("hashchange", parseHash);
}

function parseHash(): void {
  const [viewName, url] = document.location.hash.replace("#", "").split(":");
  if (!viewName) {
    return;
  }

  if (!(viewsNames as readonly string[]).includes(viewName)) {
    return;
  }

  // Письмо: #rites:/my?EMAIL=addr|hash. Сохраняем до открытия вкладки, иначе корзина запросит список без почты.
  if (viewName === "rites" && url) {
    rememberConfirmedEmailFromUrl(url);
  }

  // Диплинк на день (#calendar:/days/YYYYMMDD): открываем его прямо на корневой странице календаря
  // в режиме дня, а не пушим отдельную страницу day.vue поверх вкладки
  const calendarDayCode = viewName === "calendar" && url ? parseCalendarDayUrl(url) : null;
  if (calendarDayCode) {
    useSettingsStore().setCalendarView("day");
    useCalendarStore().setSelectedDayCode(calendarDayCode);
  }

  // До показа вкладки, иначе первая инициализация роутера допишет hash к стартовому URL.
  document.location.hash = "";

  f7.tab.show("#view-" + viewName);

  const view = f7.view.get("#view-" + viewName);
  if (!view || !url) {
    return;
  }

  if (calendarDayCode) {
    if (view.router.history.length > 1) {
      returnToRootWhenReady(view.router);
    }
    return;
  }

  navigateWhenReady(view.router, url);
}

/**
 * Возвращает роутер к корневой странице вкладки (если поверх календаря открыты святой/чтение).
 */
export function returnToRootWhenReady(router: Router.Router): void {
  const backToRoot = () => {
    if (router.history.length === 2) {
      router.back("", { animate: false });
    } else if (router.history.length > 2) {
      router.back(router.history[0], { force: true, animate: false });
    }
  };

  if (router.allowPageChange) {
    backToRoot();
    return;
  }

  router.once("pageAfterIn", backToRoot);
}

/**
 * Первое открытие вкладки (initRouterOnTabShow) грузит её стартовую страницу
 * и на это время запрещает другие переходы. navigate в этот момент отбрасывается,
 * поэтому ждём pageAfterIn — к нему allowPageChange уже снова true.
 */
export function navigateWhenReady(router: Router.Router, url: string): void {
  if (router.allowPageChange) {
    router.navigate(url);
    return;
  }

  router.once("pageAfterIn", () => {
    router.navigate(url);
  });
}

/**
 * Переключает активную вкладку на viewName и открывает в ней url,
 * если в этом view уже не открыт тот же путь.
 */
export function openViewUrl(viewName: ViewName, url: string): void {
  const selector = `#view-${viewName}`;
  f7.tab.show(selector);

  const view = f7.view.get(selector);
  if (!view || view.router.currentRoute?.path === url) {
    return;
  }

  navigateWhenReady(view.router, url);
}

/**
 * Обработка системной кнопки назад
 */
function handleBackKey() {
  console.log("handleBackKey: start of function");

  if ($$(".actions-modal.modal-in").length) {
    f7.actions.close(".actions-modal.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".dialog.modal-in").length) {
    f7.dialog.close(".dialog.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".sheet-modal.modal-in").length) {
    f7.sheet.close(".sheet-modal.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".popover.modal-in").length) {
    f7.popover.close(".popover.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".popup.modal-in").length) {
    if ($$(".popup.modal-in>.view").length) {
      const currentView = f7.views.get(".popup.modal-in>.view");
      if (
        currentView &&
        currentView.router &&
        currentView.router.history.length > 1
      ) {
        currentView.router.back();
        //e.preventDefault();
        return true;
      }
    }

    f7.popup.close(".popup.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".login-screen.modal-in").length) {
    f7.loginScreen.close(".login-screen.modal-in");
    //e.preventDefault();
    return true;
  }

  if ($$(".searchbar-enabled").length) {
    f7.searchbar.disable(".searchbar-enabled");
    //e.preventDefault();
    return true;
  }

  const currentView = f7.views.current;

  console.log("handleBackKey:", currentView);

  const pageReadMode = currentView.$el.find(".page-current.read-mode");
  if (pageReadMode.length) {
    let navbar = pageReadMode.find(".navbar:not(.navbar-hidden)");
    if (navbar.length) {
      f7.navbar.hide(navbar[0] as HTMLElement);
    }

    let toolbar = pageReadMode.find(".toolbar:not(.toolbar-hidden)");
    if (toolbar.length) {
      f7.toolbar.hide(toolbar[0] as HTMLElement);
    }

    if (navbar.length || toolbar.length) {
      return true;
    }
  }

  if (currentView.router && currentView.router.history.length > 1) {
    currentView.router.back();

    console.log("handleBackKey: currentView.router.back()");
    //e.preventDefault();
    return true;
  }

  if (
    currentView.$el.hasClass("tab") &&
    currentView.$el.attr("id") != "view-home"
  ) {
    f7.tab.show("#view-home");

    console.log("handleBackKey: f7.tab.show('#view-home')");
    // e.preventDefault();
    return true;
  }

  if ($$(".panel.panel-in").length) {
    f7.panel.close(".panel.panel-in");
    // e.preventDefault();
    return true;
  }

  if (!backButtonAttempts) {
    f7.toast.show({
      text: "Нажмите ещё раз для выхода",
      closeTimeout: 3000,
      destroyOnClose: true,
      on: {
        closed() {
          backButtonAttempts = 0;
        },
      },
    });
    console.log("handleBackKey: f7.tab.show('f7.toast.show');");
    backButtonAttempts++;

    return true;
  } else if (backButtonAttempts >= 1) {
    //navigator.app.exitApp();
    //app.phonegap.terminate();
    console.log("handleBackKey: backButtonAttempts");
    return false;
  }

  console.log("handleBackKey: end of function");

  return false;
}

export default viewsManager;
