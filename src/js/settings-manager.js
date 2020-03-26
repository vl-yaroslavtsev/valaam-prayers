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
		settings.hideStatusbar = true;
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
	//console.log('[settingsManager]: apply');
	if (state) {
		save(state);
	}

	let settings = app.methods.storageGet('settings') || {};

	applyTheme(settings);
	applyStyles(settings);
}

function applyTheme({themeDark}) {
	let currentView = app.views.current,
		$page, isWhitePage;
	
	if (currentView) {
		$page = $$(currentView.router.currentPageEl);
		isWhitePage = $page.hasClass('page-white');
	}
	
	if (themeDark) {
		$$('html').addClass('theme-dark');
		//document.querySelector('meta[name="theme-color"]').content = '#202020';
		//document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = 'black';
		app.statusbar.setTextColor('white');

	} else {
		$$('html').removeClass('theme-dark');
		//document.querySelector('meta[name="theme-color"]').content = '#3878a8';
		//document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = 'default';
		app.statusbar.setTextColor(isWhitePage ? 'black' : 'white');
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
	bgImage,
	bgColor
}) {
	let isThemeDark = $$('html').hasClass('theme-dark');
	let style = $$('#app-settings-style');
	if (style.length) {
		style.remove();
	}
	
	let styleHTML = `
	<style id="app-settings-style">
		.md .view:not(#view-valaam) .text-content {
			${slFontFamily ? 'font-family: "' + slFontFamily + '" !important;' : ''}
			${slFontSize ? 'font-size: ' + slFontSize + 'px !important;' : ''}
			${slLineHeight ? 'line-height: ' + slLineHeight + ' !important;' : ''}
			${slFontWeight ? 'font-weight: ' + slFontWeight + ' !important;' : ''}
			${!isThemeDark && bgImage ? 'background-image: ' + bgImage + ' !important;' : ''}
			${!isThemeDark && bgColor ? 'background-color: ' + bgColor + ' !important;' : ''}
		}

		.md .churchslavonic {
			${csFontFamily ? 'font-family: "' + csFontFamily + '" !important;' : ''}
		}

		.md .churchslavonic,
		.md .churchslavonic-ereader {
			${csFontSize ? 'font-size: ' + csFontSize + 'px !important;' : ''}
			${csLineHeight ? 'line-height: ' + csLineHeight + ' !important;' : ''}
			${csFontWeight ? 'font-weight: ' + csFontWeight + ' !important;' : ''}
			${!isThemeDark && bgImage ? 'background-image: ' + bgImage + ' !important;' : ''}
			${!isThemeDark && bgColor ? 'background-color: ' + bgColor + ' !important;' : ''}
		}
	</style>
	`;
	$$('head').append(styleHTML);
}

export default {init, get, save, apply};
