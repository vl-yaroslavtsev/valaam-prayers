/**
 * Управляет настройками, которые были сохранены на странице
 * Настройки
 */

let app;

function init(appInstance) {
	app = appInstance;
	apply();
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
	if (themeDark) {
		document.querySelector('html').classList.add('theme-dark');
		document.querySelector('meta[name="theme-color"]').content = '#202020';
		document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = 'black';

	} else {
		document.querySelector('html').classList.remove('theme-dark');
		document.querySelector('meta[name="theme-color"]').content = '#3878a8';
		document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = 'default';
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
	let isThemeDark = document.querySelector('html')
			.classList.contains('theme-dark');
	let style = document.querySelector('#app-settings-style');
	if (style) {
		style.remove();
	}
	style = document.createElement('style');
	style.id = 'app-settings-style';
	style.innerHTML = `
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
	`;
	document.head.appendChild(style);
}

export default {init, save, apply};
