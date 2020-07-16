/**
 * Обработка главный view приложения
 */
import {Dom7 as $$} from 'framework7';
import settingsManager from './settings-manager.js';
import { isMobile } from './utils/utils.js';

let app;
const menuView = '#view-menu';
const viewsIds = ['#view-books', '#view-prayers', '#view-calendar', '#view-rites'];
// Количественно последовательных нажатий кнопки Назад
let backButtonAttempts = 0;

function init(appInstance) {
	app = appInstance;
	initViewTabs();

	// let view = app.views.get(menuView);
	// view.on('pageBeforeOut', (page) => {
	// 	if (page.router.history.length <= 1) {
	// 		app.panel.get('.panel-left').close();
	// 	}
	// });

	// document.addEventListener("backbutton", (e) => {
	// 	return handleBackButton(e);
	// }, false);

	app.on('onBackPressed', () => {
		return handleBackButton();
	});
}

/**
 * Разбираем хэш.
 * Если он в виде #view-valaam:/url , грузим url во #view-valaam
 */
function parseHash() {
	let [viewId, url] = document.location.hash.split(':');
	if (!viewId || !url) return;

	let panel = app.panel.get('.panel-left');
	let view = app.views.get(viewId);

	if (!view) {
		view = createView(viewId);
	}

	if (viewId === menuView) {
		if (panel) {
			panel.open(false);
		}
		view.router.navigate(url);
		document.location.hash = '';
		return;
	}

	if (!viewsIds.includes(viewId)) return;

	if (panel) {
		panel.close(false);
	} else {
		app.once('panelOpen', (panel) => {
			panel.close(false);
		});
	}

	app.tab.show(viewId);
	view.router.navigate(url);
	document.location.hash = '';
}

/**
 * Инициализируем табы - представления
 */
function initViewTabs() {
	app.root.find('.views.tabs').on('tab:show', (event) => {
		let id = event.target.id;
		if (!id || !id.startsWith('view-'))
		 	return;
		createView('#' + id);
	});

	app.on('pageBeforeIn', (page) => {
		let isWhite = page.$el.hasClass('page-white');
		let isDarkMode = $$('html').hasClass('theme-dark');
		console.log('pageBeforeIn: isWhite', isWhite, ', isDarkMode: ', isDarkMode);
		if (isWhite && !isDarkMode) {
			app.phonegap.statusbar.styleDefault();
			console.log('app.phonegap.statusbar.styleDefault()');
		} else {
			app.phonegap.statusbar.styleLightContent();
			console.log('app.phonegap.statusbar.styleLightContent()');
		}
	});

	app.on('navbarShow', (navbarEl) => {
		//let $el = app.$(navbarEl);
		//$el.transitionEnd(() => {
			// if (settingsManager.get('hideStatusbar')) {
			// 	app.phonegap.statusbar.show();
			// }
		//});
	});

	app.on('navbarHide', (navbarEl) => {
		// if (settingsManager.get('hideStatusbar')) {
		// 	let $el = app.$(navbarEl);
		// 	$el.addClass('navbar-hidden-statusbar');
		// 	app.phonegap.statusbar.hide();
    // }
	});

	app.on('popupOpened', (popup) => {
		//console.log('popupOpen', popup);
		let $el = popup.$el;
		let isTablet = !isMobile();
		let isDarkMode = $$('html').hasClass('theme-dark') ||
						 $el.find('.photo-browser-dark').length;

		if (isTablet && !$el.hasClass('popup-tablet-fullscreen')) {
			return;
		}

		if (isDarkMode) {
			app.phonegap.statusbar.styleLightContent();
		} else {
			app.phonegap.statusbar.styleDefault();
		}

	});

	app.on('popupClose', (popup) => {
		app.phonegap.statusbar.styleLightContent();
	});

	parseHash();
	$$(window).on('hashchange', parseHash);
}

/**
 * Создаем вью по запросу
 * @param  {string} id айдишник
 */
function createView(id) {
	let view;
	if (!viewsIds.includes(id)) return;

	if (id == '#view-calendar') {
		app.methods.storageSet('calendar-date');
		app.emit('calendarClearDate');
	}

	if (view = app.views.get(id)) {
		app.emit('viewShown', view);
		return;
	}

	switch (id) {
		case '#view-prayers':
			view = app.views.create('#view-prayers', {
				name: 'Полный молитвослов',
				url: '/prayers/842'
			});
			break;

		case '#view-calendar':
			view = app.views.create('#view-calendar', {
				name: 'Календарь',
				url: '/calendar'
			});
			break;

		case '#view-books':
			view = app.views.create('#view-books', {
				name: 'Книги',
				url: '/prayers/976',
			});
			break;

		case '#view-rites':
			view = app.views.create('#view-rites', {
				name: 'Поминовения',
				url: '/rites'
			});
			break;

		default:
			break;
	}

	app.emit('viewShown', view);
	return view;
}

/**
 * Обработка системной кнопки назад
 */
function handleBackButton() {
	if ($$('.actions-modal.modal-in').length) {
		app.actions.close('.actions-modal.modal-in');
		//e.preventDefault();
		return false;
	}
	if ($$('.dialog.modal-in').length) {
		app.dialog.close('.dialog.modal-in');
		//e.preventDefault();
		return false;
	}
	if ($$('.sheet-modal.modal-in').length) {
		app.sheet.close('.sheet-modal.modal-in');
		//e.preventDefault();
		return false;
	}
	if ($$('.popover.modal-in').length) {
		app.popover.close('.popover.modal-in');
		//e.preventDefault();
		return false;
	}
	if ($$('.popup.modal-in').length) {
		if ($$('.popup.modal-in>.view').length) {
			const currentView = app.views.get('.popup.modal-in>.view');
			if (currentView && currentView.router && currentView.router.history.length > 1) {
				currentView.router.back();
				//e.preventDefault();
				return false;
			}
		}

		app.popup.close('.popup.modal-in');
		//e.preventDefault();
		return false;
	}

	if ($$('.login-screen.modal-in').length) {
		app.loginScreen.close('.login-screen.modal-in');
		//e.preventDefault();
		return false;
	}

	if ($$('.searchbar-enabled').length) {
		app.searchbar.disable();
		//e.preventDefault();
		return false;
	}

	const currentView = app.views.current;
	if (currentView && currentView.router && currentView.router.history.length > 1) {
		currentView.router.back();
		//e.preventDefault();
		return false;
	}

	if (currentView.$el.hasClass('tab')) {
		app.panel.get('.panel-left').open();
		//e.preventDefault();
		return false;
	}

	// if ($$$('.panel.panel-in').length) {
		// app.panel.close('.panel.panel-in');
		// e.preventDefault();
		// return false;
	// }

	if (!backButtonAttempts) {
		let toast = app.toast.show({
			text: 'Нажмите ещё раз для выхода',
			closeTimeout: 2000,
			destroyOnClose: true,
			on: {
				closed() {
					backButtonAttempts = 0;
				}
			}
		});
	} else if (backButtonAttempts >= 1) {
		//navigator.app.exitApp();
		app.phonegap.terminate();
	}

	backButtonAttempts++;
	return true;
}

export default {init};
