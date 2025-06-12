/**
 * Обработка главный view приложения
 */
import { Dom7 as $$ } from "framework7";
import { f7 } from "framework7-vue";
import deviceAPI from "./device/device-api";

const viewsNames = [
  "home",
  "books",
  "prayers",
  "calendar",
  "rites",
] as const;

let backButtonAttempts = 0;

function viewsManager(): void {
  deviceAPI.onBackKey(handleBackKey);
  parseHash();
  $$(window).on("hashchange", parseHash);
}

function parseHash(): void {
  const [viewName, url] = document.location.hash.replace("#","").split(":");
  if (!viewName) {
    return;
  }

  if (!(viewsNames as readonly string[]).includes(viewName)) {
    return;
  }

  f7.tab.show("#view-" + viewName);

  const view = f7.view.get("#view-" + viewName);
  if (!view) {
    return;
  }
  if (url) {
    view.router.navigate(url);
  }

  document.location.hash = "";
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
