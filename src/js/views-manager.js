/**
 * Обработка главный view приложения
 */
import {Dom7 as $$} from 'framework7';
import settingsManager from './settings-manager.js';
import { isMobile } from './utils/utils.js';

let app;
const viewsIds = [
	'#view-main',
  '#view-books',
	'#view-prayers',
	'#view-calendar',
	'#view-rites'
];
// Количественно последовательных нажатий кнопки Назад
let backButtonAttempts = 0;

function init(appInstance) {
	app = appInstance;
	initViewTabs();

	app.on('onBackPressed', () => {
		return handleBackButton();
	});

	app.on('pageInit', (page) => {
		handleScrollbar(page.$el);
	});
}

/**
 * Разбираем хэш.
 * Если он в виде #view-valaam:/url , грузим url во #view-valaam
 */
function parseHash() {
	let [viewId, url] = document.location.hash.split(':');
	if (!viewId || !url) return;

	let view = app.views.get(viewId);

	if (!view) {
		view = createView(viewId);
	}

	if (!viewsIds.includes(viewId)) return;

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

	app.on('pageBeforeIn', (page) => updateStatusbar(page.$el));
	app.on('pageTabShow', (page) => updateStatusbar($$(page)));

	app.root.on('mouseup', 'a[data-view-tab]', function(event) {
		let $target = $$(this);
		app.tab.show($target.data('view'));
	});


	app.root.on('click', 'a.tab-link[href="#view-main"]', function(event) {
		let view = app.views.get('#view-main');
		if (view) { // Перезгружаем историю меню
			view.router.navigate(view.router.history[0], {reloadAll: true});
		}
	});


	// app.on('popupOpened', (popup) => {
	// 	let $el = popup.$el;
	// 	let isTablet = !isMobile();
	// 	let isDarkMode = $$('html').hasClass('theme-dark') ||
	// 					 				 $el.find('.photo-browser-dark').length;
	//
	// 	if (isTablet && !$el.hasClass('popup-tablet-fullscreen')) {
	// 		return;
	// 	}
	//
	// 	if (isDarkMode) {
	// 		app.phonegap.statusbar.styleLightContent();
	// 	} else {
	// 		app.phonegap.statusbar.styleDefault();
	// 	}
	// });
	//
	// app.on('popupClose', (popup) => {
	// 	app.phonegap.statusbar.styleLightContent();
	// });

	app.tab.show('#view-main');

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
		case '#view-main':
			view = app.views.create('#view-main', {
				url: '/menu'
			});
			break;

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
 * Показываем/скрываем скроллбар
 * @param  {Dom7} $page страница
 */
function handleScrollbar($page) {
	let timer;
	if ($page.hasClass('read-mode')) {
		return;
	}
	let $content = $page.find('.page-content');

	$page.addClass('scrollbar-hidden');
	$content.on('scroll', () => {
		if (timer) {
			clearTimeout(timer);
		} else {
			$page.removeClass('scrollbar-hidden');
		}
		timer = setTimeout(() => {
			$page.addClass('scrollbar-hidden');
			timer = null;
		}, 800);
	});
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

	const pageReadMode = currentView.$el.find('.page-current.read-mode');
	if (pageReadMode.length) {
		let navbar = pageReadMode.find('.navbar:not(.navbar-hidden)');
		if (navbar.length) {
			app.navbar.hide(navbar);
		}

		let toolbar = pageReadMode.find('.toolbar:not(.toolbar-hidden)');
		if (toolbar.length) {
			app.toolbar.hide(toolbar);
		}

		if (navbar.length || toolbar.length) {
			return false;
		}
	}

	if (currentView.router &&
		  currentView.router.history.length > 1) {
		currentView.router.back();
		//e.preventDefault();
		return false;
	}

	if (currentView.$el.hasClass('tab') &&
			currentView.$el.attr('id') != 'view-main') {
		app.tab.show('#view-main');
		// e.preventDefault();
		return false;
	}

	if ($$('.panel.panel-in').length) {
		app.panel.close('.panel.panel-in');
		// e.preventDefault();
		return false;
	}

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

/**
 * Обновляем статусбар страницы (темный или светлый)
 * @param  {Dom7} $page
 */
function updateStatusbar($page) {
	let isWhite = $page.hasClass('page-white') ||
							  $page.hasClass('smart-select-page');
	let isDarkMode = $$('html').hasClass('theme-dark');
	if (isWhite && !isDarkMode) {
		app.phonegap.statusbar.styleDefault();
	} else {
		app.phonegap.statusbar.styleLightContent();
	}
}

export default {init};
