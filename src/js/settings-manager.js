/**
 * Управляет настройками, которые были сохранены на странице
 * Настройки
 */
import {Dom7 as $$} from 'framework7';

let app;

function init(appInstance) {
	app = appInstance;
	setDefault();
	apply();
}

function setDefault() {
	let settings = app.methods.storageGet('settings') || {};

	if (!('hideStatusbar' in settings)) {
		settings.hideStatusbar = false;
	}

	save(settings);
}

function get(key) {
	let settings = app.methods.storageGet('settings') || {};

	return settings[key];
}

function save(item = {}) {
	let settings = app.methods.storageGet('settings') || {};

	Object.assign(settings, item);
	app.methods.storageSet('settings', settings);
}

function apply(state) {
	if (state) {
		save(state);
	}

	let settings = app.methods.storageGet('settings') || {};

	applyTheme(settings);
	applyStyles(settings);

  if (settings['hideStatusbar']) {
    app.phonegap.statusbar.hide();
  } else {
    app.phonegap.statusbar.show();
  }
}

function applyTheme({colorTheme}) {
	let currentView = app.views.current,
		$page,
    isWhitePage,
    $html = $$('html');

  if (!colorTheme) {
    return;
  }

	if (currentView) {
		$page = $$(currentView.router.currentPageEl);
		isWhitePage = $page.hasClass('page-white');
	}

  for (let className of $$('html')[0].classList.values()) {
    if (/^text-theme-/i.test(className)) {
      $html.removeClass(className);
    }
  }
  $html.addClass(`text-theme-${colorTheme}`);

	if (colorTheme == 'dark') {
		$html.addClass('theme-dark');
		//document.querySelector('meta[name="theme-color"]').content = '#202020';
		//document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = 'black';
		app.phonegap.statusbar.styleLightContent();
	} else {
		$html.removeClass('theme-dark');
    // isWhitePage ?
    //   app.phonegap.statusbar.styleDefault() :
		app.phonegap.statusbar.styleLightContent();
	}
}

function applyStyles({
	slFontFamily,
	slFontSize,
	slLineHeight,
	slFontWeight,
	csFontFamily,
	csFontSize,
	csLineHeight,
	csFontWeight,
  textAlign,
  noPadding
}) {
	let isThemeDark = $$('html').hasClass('theme-dark');
	let style = $$('#app-settings-style');
	if (style.length) {
		style.remove();
	}

	let styleHTML = `
	<style id="app-settings-style">
		.md .text-content {
			${slFontFamily ? 'font-family: "' + slFontFamily + '" !important;' : ''}
			${slFontSize ? 'font-size: ' + slFontSize + 'px !important;' : ''}
			${slLineHeight ? 'line-height: ' + slLineHeight + ' !important;' : ''}
			${slFontWeight ? 'font-weight: ' + slFontWeight + ' !important;' : ''}
			${textAlign ? 'text-align: ' + textAlign + ' !important;' : ''}
      ${noPadding ? '--f7-block-padding-horizontal:5px;': ''}
		}
		.md .churchslavonic {
			${csFontFamily ? 'font-family: "' + csFontFamily + '" !important;' : ''}
		}
		.md .churchslavonic,
		.md .churchslavonic-ereader {
			${csFontSize ? 'font-size: ' + csFontSize + 'px !important;' : ''}
			${csLineHeight ? 'line-height: ' + csLineHeight + ' !important;' : ''}
			${csFontWeight ? 'font-weight: ' + csFontWeight + ' !important;' : ''}
			${textAlign ? 'text-align: ' + textAlign + ' !important;' : ''}
      ${noPadding ? '--f7-block-padding-horizontal:5px;': ''}
		}
	</style>
	`;
	$$('head').append(styleHTML);
}

export default {init, get, save, apply};
