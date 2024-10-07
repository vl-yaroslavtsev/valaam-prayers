/**
 * Обработка главный view приложения
 */
import {Dom7 as $$} from 'framework7';
import {f7} from 'framework7-vue';
import deviceAPI from './device/device-api';
// import { isMobile, animate } from './utils/utils.js';

const viewsIds = [
	'#view-main',
  '#view-books',
	'#view-prayers',
	'#view-calendar',
	'#view-rites'
];

// Количественно последовательных нажатий кнопки Назад
let backButtonAttempts = 0;

function viewsManager() {
	//f7 = appInstance;
	//initViewTabs();

	deviceAPI.onBackKey(() => {
		f7.dialog.alert(`onBackKey`);
		handleBackKey();
	});

  parseHash();
  $$(window).on('hashchange', parseHash);

	// f7.on('pageInit', (page) => {
	// 	handleScrollbar(page.$el);
	// 	handleNavbarCollapse(page.$el);
	// });
}

/**
 * Разбираем хэш.
 * Например, если он в виде #view-main:/url , грузим url во #view-main
 */
function parseHash() {
  const [viewId, url] = document.location.hash.split(':');
	const view = f7.views.get(viewId);

	if (!view) {
		// view = createView(viewId);
    return;
	}

	if (!viewsIds.includes(viewId)) return;

	f7.tab.show(viewId);
  if (url) {
    view.router.navigate(url);
  }
	document.location.hash = '';
}

/**
 * Инициализируем табы - представления
 */
// function initViewTabs() {
	// app.root.find('.views.tabs').on('tab:show', (event) => {
	// 	let id = event.target.id;
	// 	if (!id || !id.startsWith('view-'))
	// 	 	return;
	// 	createView('#' + id);
	// });

	// app.on('pageBeforeIn', (page) => updateStatusbar(page.$el));
	// app.on('pageTabShow', (page) => updateStatusbar($$(page)));

	// app.root.on('mouseup', 'a[data-view-tab]', function(event) {
	// 	let $target = $$(this);
	// 	app.tab.show($target.data('view'));
	// });


	// app.root.on('click', 'a.tab-link[href="#view-main"]', function(event) {
	// 	let view = app.views.get('#view-main');
	// 	if (view) { // Перезгружаем историю меню
	// 		view.router.navigate(view.router.history[0], {reloadAll: true});
	// 	}
	// });


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

// 	f7.tab.show('#view-main');

// 	parseHash();
// 	$$(window).on('hashchange', parseHash);
// }

/**
 * Создаем вью по запросу
 * @param  {string} id айдишник
 */
// function createView(id) {
// 	let view;
// 	if (!viewsIds.includes(id)) return;

// 	if (id == '#view-calendar') {
// 		app.methods.storageSet('calendar-date');
// 		app.emit('calendarClearDate');
// 	}

// 	if (view = app.views.get(id)) {
// 		app.emit('viewShown', view);
// 		return;
// 	}

// 	switch (id) {
// 		case '#view-main':
// 			view = app.views.create('#view-main', {
// 				url: '/menu'
// 			});
// 			break;

// 		case '#view-prayers':
// 			view = app.views.create('#view-prayers', {
// 				name: 'Полный молитвослов',
// 				url: '/prayers/842'
// 			});
// 			break;

// 		case '#view-calendar':
// 			view = app.views.create('#view-calendar', {
// 				name: 'Календарь',
// 				url: '/calendar'
// 			});
// 			break;

// 		case '#view-books':
// 			view = app.views.create('#view-books', {
// 				name: 'Книги',
// 				url: '/prayers/976',
// 			});
// 			break;

// 		case '#view-rites':
// 			view = app.views.create('#view-rites', {
// 				name: 'Поминовения',
// 				url: '/rites'
// 			});
// 			break;

// 		default:
// 			break;
// 	}

// 	app.emit('viewShown', view);
// 	return view;
// }

/**
 * Показываем/скрываем скроллбар
 * @param  {Dom7} $page страница
 */
// function handleScrollbar($page) {
// 	let timer, lastScroll, cancel;
// 	if ($page.hasClass('read-mode')) {
// 		return;
// 	}
// 	const $content = $page.find('.page-content');
// 	const scrollbarShownAlpha = getComputedStyle($page[0]).getPropertyValue('--scrollbar-thumb-shown-alpha');
// 	$content.on('scroll', () => {
// 		lastScroll = performance.now();

// 		if (timer) {
// 			return;
// 		}

// 		if (cancel) {
// 			cancel();
// 		}

// 		const style = $page[0].style;
// 		style.setProperty('--scrollbar-thumb-alpha', scrollbarShownAlpha);

// 		timer = setTimeout( function hide() {
// 			const diff = Math.round(performance.now() - lastScroll);
// 			if (diff < 800) {
// 				 timer = setTimeout( hide, 800 - diff);
// 				 return;
// 			}

// 			cancel = animate({
// 				draw(progress) {
// 					const val = parseFloat(scrollbarShownAlpha) * (1 - progress);
// 					style.setProperty('--scrollbar-thumb-alpha', `${val.toFixed(3)}`);
// 				},
// 				duration: 800,
// 				end() {
// 					cancel = null;
// 				}
// 			});

// 			timer = null;
// 		}, 800);
// 	});
// }


/**
 * Показываем/скрываем navbar c классом navbar-collapse
 * @param  {Dom7} $page страница
 */
// function handleNavbarCollapse($page) {
// 	const $navbar = $page.find('.navbar');

// 	if (!$navbar.hasClass('navbar-collapse')) {
// 		return;
// 	}

// 	const height = getTitleHeight();
// 	const $content = $page.find('.page-content');
// 	let prevOpacity = 0;

// 	$content.on('scroll', (e) => {
// 		requestAnimationFrame((time) => {
// 			let opacity = $content[0].scrollTop / height;
// 			if (opacity > 1) {
// 				opacity = 1;
// 			}
// 			if (opacity === prevOpacity) {
// 				return;
// 			}

// 			$navbar[0].style.setProperty('--navbar-opacity', opacity.toFixed(3));
// 			prevOpacity = opacity;
// 		});
// 	});

// 	function getTitleHeight() {
// 		return isMobile() ? 55 : 78;
// 	}
// }

/**
 * Обработка системной кнопки назад
 */
function handleBackKey() {
  console.log("handleBackKey: start of function");

	if ($$('.actions-modal.modal-in').length) {
		f7.actions.close('.actions-modal.modal-in');
		//e.preventDefault();
		return true;
	}
	if ($$('.dialog.modal-in').length) {
		f7.dialog.close('.dialog.modal-in');
		//e.preventDefault();
		return true;
	}
	if ($$('.sheet-modal.modal-in').length) {
		f7.sheet.close('.sheet-modal.modal-in');
		//e.preventDefault();
		return true;
	}
	if ($$('.popover.modal-in').length) {
		f7.popover.close('.popover.modal-in');
		//e.preventDefault();
		return true;
	}
	if ($$('.popup.modal-in').length) {
		if ($$('.popup.modal-in>.view').length) {
			const currentView = f7.views.get('.popup.modal-in>.view');
			if (currentView && currentView.router && currentView.router.history.length > 1) {
				currentView.router.back();
				//e.preventDefault();
				return true;
			}
		}

		f7.popup.close('.popup.modal-in');
		//e.preventDefault();
		return true;
	}

	if ($$('.login-screen.modal-in').length) {
		f7.loginScreen.close('.login-screen.modal-in');
		//e.preventDefault();
		return true;
	}

	if ($$('.searchbar-enabled').length) {
		f7.searchbar.disable();
		//e.preventDefault();
		return true;
	}

	const currentView = f7.views.current;

  console.log("handleBackKey:", currentView);

	const pageReadMode = currentView.$el.find('.page-current.read-mode');
	if (pageReadMode.length) {
		let navbar = pageReadMode.find('.navbar:not(.navbar-hidden)');
		if (navbar.length) {
			f7.navbar.hide(navbar);
		}

		let toolbar = pageReadMode.find('.toolbar:not(.toolbar-hidden)');
		if (toolbar.length) {
			f7.toolbar.hide(toolbar);
		}

		if (navbar.length || toolbar.length) {
			return true;
		}
	}

	if (currentView.router &&
		  currentView.router.history.length > 1) {
		currentView.router.back();

    console.log("handleBackKey: currentView.router.back()");
		//e.preventDefault();
		return true;
	}

	if (currentView.$el.hasClass('tab') &&
			currentView.$el.attr('id') != 'view-main') {
		f7.tab.show('#view-main');

    console.log("handleBackKey: f7.tab.show('#view-main')");
		// e.preventDefault();
		return true;
	}

	if ($$('.panel.panel-in').length) {
		f7.panel.close('.panel.panel-in');
		// e.preventDefault();
		return true;
	}

	if (!backButtonAttempts) {
		let toast = f7.toast.show({
			text: 'Нажмите ещё раз для выхода',
			closeTimeout: 2000,
			destroyOnClose: true,
			on: {
				closed() {
					backButtonAttempts = 0;
				}
			}
		});
    console.log("handleBackKey: f7.tab.show('f7.toast.show');");

    return true;
	} else if (backButtonAttempts >= 1) {
		//navigator.app.exitApp();
		//app.phonegap.terminate();
    console.log("handleBackKey: backButtonAttempts");

    return false;
	}

	backButtonAttempts++;
  console.log("handleBackKey: end of function");

	return false;
}

/**
 * Обновляем статусбар страницы (темный или светлый)
 * @param  {Dom7} $page
 */
// function updateStatusbar($page) {
// 	let isWhite = $page.hasClass('page-white') ||
// 							  $page.hasClass('smart-select-page');
// 	let isDarkMode = $$('html').hasClass('theme-dark');
// 	if (isWhite && !isDarkMode) {
// 		app.phonegap.statusbar.styleDefault();
// 	} else {
// 		app.phonegap.statusbar.styleLightContent();
// 	}
// }

export default viewsManager;