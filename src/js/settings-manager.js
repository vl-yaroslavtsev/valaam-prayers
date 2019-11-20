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

function apply() {
	console.log('[settingsManager]: apply');
	applyStyles();
}

function applyStyles() {
	let {
		slFontFamily,
		slFontSize,
		slLineHeight,
		csFontFamily,
		csFontSize,
		csLineHeight
	} = app.methods.storageGet('settings') || {};

	let style = document.querySelector('#app-settings-style');
	if (style) {
		style.remove();
	}
	style = document.createElement('style');
	style.id = 'app-settings-style';
	style.innerHTML = `
		.md .text-content {
			${slFontFamily ? 'font-family: "' + slFontFamily + '" !important;' : ''}
			${slFontSize ? 'font-size: ' + slFontSize + 'px !important;' : ''}
			${slLineHeight ? 'line-height: ' + slLineHeight + ' !important;' : ''}
		}

		.md .churchslavonic {
			${csFontFamily ? 'font-family: "' + csFontFamily + '" !important;' : ''}
		}

		.md .churchslavonic,
		.md .churchslavonic-ereader {
			${csFontSize ? 'font-size: ' + csFontSize + 'px !important;' : ''}
			${csLineHeight ? 'line-height: ' + csLineHeight + ' !important;' : ''}
		}
	`;
	document.head.appendChild(style);
}

export default {init, save, apply};
