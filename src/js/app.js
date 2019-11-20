import 'framework7/css/framework7.css';

import 'framework7/components/dialog.css';
import 'framework7/components/popup.css';
import 'framework7/components/popover.css';
import 'framework7/components/toast.css';
import 'framework7/components/preloader.css';
import 'framework7/components/tabs.css';
import 'framework7/components/form.css';
import 'framework7/components/input.css';
import 'framework7/components/radio.css';
import 'framework7/components/toggle.css';
import 'framework7/components/range.css';
import 'framework7/components/stepper.css';
import 'framework7/components/smart-select.css';
import 'framework7/components/calendar.css';
import 'framework7/components/infinite-scroll.css';
import 'framework7/components/lazy.css';
import 'framework7/components/searchbar.css';
import 'framework7/components/swiper.css';
import 'framework7/components/photo-browser.css';
import 'framework7/components/autocomplete.css';
import 'framework7/components/elevation.css';
import 'framework7/components/typography.css';

import '../css/icons.css';
import '../css/app.css';
import '../css/vm.css';

import Framework7, {Dom7 as $$} from 'framework7';
// Import additional components
import Dialog	      from 'framework7/components/dialog/dialog.js';
import Popup	      from 'framework7/components/popup/popup.js';
import Popover 			from 'framework7/components/popover/popover';
import Toast        from 'framework7/components/toast/toast.js';
import Preloader    from 'framework7/components/preloader/preloader.js';
import Tabs	        from 'framework7/components/tabs/tabs.js';
import Form	        from 'framework7/components/form/form.js';
import Input        from 'framework7/components/input/input.js';
import Radio				from 'framework7/components/radio/radio.js';
import Toggle       from 'framework7/components/toggle/toggle.js';
import Range 				from 'framework7/components/range/range';
import Stepper 			from 'framework7/components/stepper/stepper';
import SmartSelect  from 'framework7/components/smart-select/smart-select.js';
import Calendar     from 'framework7/components/calendar/calendar.js';
import InfiniteScroll	from 'framework7/components/infinite-scroll/infinite-scroll.js';
import Lazy         from 'framework7/components/lazy/lazy.js';
import Searchbar    from 'framework7/components/searchbar/searchbar.js';
import Swiper	      from 'framework7/components/swiper/swiper.js';
import PhotoBrowser from 'framework7/components/photo-browser/photo-browser.js';
import Autocomplete from 'framework7/components/autocomplete/autocomplete.js';
import Elevation 		from 'framework7/components/elevation/elevation';
import Typography	  from 'framework7/components/typography/typography.js';

// Install F7 Components using .use() method on Framework7 class:
Framework7.use([
	Autocomplete,
	Calendar,
	Dialog,
	Elevation,
	Form,
	InfiniteScroll,
	Input,
	Lazy,
	PhotoBrowser,
	Popover,
	Popup,
	Preloader,
	Radio,
	Range,
	Searchbar,
	SmartSelect,
	Stepper,
	Swiper,
	Tabs,
	Toast,
	Toggle,
	Typography
]);

import './data-sources.js';

import routes from './routes.js';
import * as OfflinePlugin from 'offline-plugin/runtime';

import {DataManager} from './data-manager.js';
import reloadManager from './reload-manager.js';
import favoriteManager from './favorite-manager.js';
import settingsManager from './settings-manager.js';
import imageLazyDb from '../js/image-lazy-db.js';

// Framework7 App main instance
const app = new Framework7({
	root: '#app',
	id: 'ru.valaam.prayers',
	name: 'Валаам',
	theme: navigator.userAgent.match(/Debug/) !== null ? 'auto' : 'md',
	// theme: 'ios',

	panel: {
		swipe: 'left',
		swipeOnlyClose: true
	},

	on: {
		init() {
			this.dataManager = new DataManager();
			reloadManager.init(this);
			favoriteManager.init(this);
			imageLazyDb.init(this);
			imageLazyDb.attach(this.root);
			settingsManager.init(this);

			if (window['webkit']) {
				this.once('canApplePay', (result) => {
					this.data.canApplePay = result;
				});

				// noinspection JSUnresolvedVariable
				window.webkit.messageHandlers.canApplePay.postMessage(null);
			}

			initViewTabs(this);

			this.root.on('click', '.page-current img[data-srcorig]', (e) => {
				imgFullscreen(e.target);
			});
		},
		pageBeforeRemove(page) {
			imageLazyDb.detach(page.$el);
		}
	},

	data() {
		return {
			canApplePay: false,
			debug: navigator.userAgent.match(/Debug/) !== null
		};
	},

	// App root methods
	methods: {
		hyphenate(text) {
			let RusL = "[абвгдеёжзийклмнопрстуфхцчшщъыьэюя]";
			let RusV = "[аеёиоуыэюя]";
			let RusC = "[бвгджзклмнпрстфхцчшщ]";
			let RusX = "[йъь]";
			let Hyphen = "\xAD";

			// алгоpитм П.Хpистова в модификации Дымченко и Ваpсанофьева
			// return text
			// 	.replace(new RegExp("(" + RusX + ")(" + RusL + RusL + ")", "ig"), "$1" + Hyphen + "$2")
			// 	.replace(new RegExp("(" + RusV + ")(" + RusV + RusL + ")", "ig"), "$1" + Hyphen + "$2")
			// 	.replace(new RegExp("(" + RusV + RusC + ")(" + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
			// 	.replace(new RegExp("(" + RusC + RusV + ")(" + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
			// 	.replace(new RegExp("(" + RusV + RusC + ")(" + RusC + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
			// 	.replace(new RegExp("(" + RusV + RusC + RusC + ")(" + RusC + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
			// 	;

			// алгоpитм Д.Котерова
			return text
				.replace(new RegExp("(" + RusX + ")(" + RusL + RusL + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusV + RusC + RusC + ")(" + RusC + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusV + RusC + RusC + ")(" + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusV + RusC + ")(" + RusC + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusC + RusV + ")(" + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusV + RusC + ")(" + RusC + RusV + ")", "ig"), "$1" + Hyphen + "$2")
				.replace(new RegExp("(" + RusC + RusV + ")(" + RusV + RusL + ")", "ig"), "$1" + Hyphen + "$2")
				;
		},
		plural(value, data) {
			let idx, digit = value % 10;
			value = value % 100;

			if((value > 10 && value < 20) || digit === 0 || digit > 4)
				idx = 2;
			else if(digit === 1)
				idx = 0;
			else idx = 1;

			return data ? data[idx] : idx;
		},
		showLoadError(msg) {
			this.methods.showMessage(msg || 'Ошибка загрузки данных', 'bg-color-red');
		},
		showMessage(msg, bgcolor, timeout) {
			this.toast.create({
				text: msg || 'Ошибка',
				position: 'top',
				closeTimeout: timeout || 5000,
				destroyOnClose: true,
				cssClass: bgcolor
			}).open();
		},
		storageGet(key) {
			key = this.id + '_' + key;

			try {
				return JSON.parse(localStorage.getItem(key));
			}
			catch (e) {
				return null;
			}
		},
		storageSet(key, item) {
			key = this.id + '_' + key;

			if(item === undefined)
				localStorage.removeItem(key);
			else localStorage.setItem(key, JSON.stringify(item));
		},
		/**
		 * Загружаем данные из менеджера данных
		 * @param  {string}  source Источник данных
		 * @param  {*}       args   Доп. параметры
		 * @return {Promise}
		 */
		async load(source, ...args) {
			let app = this;

			app.preloader.show();
			try {
				return await app.dataManager.get(source, ...args);
			} catch (err) {
				app.methods.showLoadError();
				throw err;
			} finally {
				app.preloader.hide();
			}
		}
	},

	dialog: {
		buttonOk: 'Да',
		buttonCancel: 'Отмена'
	},

	// App routes
	routes: routes
});

// Необходимо для библиотеки Ивайло.
globalThis.app = app;

window.addEventListener('load', function() {
	OfflinePlugin.install({
		onInstalled: function() {
			console.log('OfflinePlugin onInstalled');

			// Уродливый хак для Эппл!!!
			// iOS WebView использует AppCache
			// Когда заходим в приложение первый раз, отключаем инет не
			// перезагружая приложение, шрифты не подгружаются из app кэша.
			// Грузим их принудильно
			if (!navigator.serviceWorker) {
				let div1 = document.createElement('div');
				div1.innerHTML = 'Тест для шрифта';
				div1.style.fontFamily = 'Triodion';
				app.root[0].append(div1);

				let div2 = document.createElement('div');
				div2.innerHTML = 'Тест для шрифта';
				div2.style.fontFamily = 'Ponomar';
				app.root[0].append(div2);

				setTimeout(() => {
					div1.remove();
					div2.remove();
				}, 1000)
			}
		},

		onUpdateReady: function() {
			console.log('OfflinePlugin onUpdateReady');
			OfflinePlugin.applyUpdate();
		},

		onUpdated: function() {
			console.log('OfflinePlugin onUpdated');
			app.dialog.confirm(
				'Доступно обновление молитвослова. Перезагрузить?',
				'Молитвослов',
				() => {
					window.location.reload();
				});
		}
	});
	//reloadManager.testFitures();
	reloadManager.preload();
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Stash the event so it can be triggered later.
  console.log('beforeinstallprompt', e);
  let deferredPrompt = e;
  deferredPrompt.prompt();
});

/**
 * Инициализируем табы - представления
 * @param  {{Framework7}} app
 */
function initViewTabs(app) {
	//location.hash = location.hash.split(':')[0] || '#view-valaam';
	location.hash = location.hash || '#view-valaam';

	app.root.find('.views.tabs').on('tab:show', (event) => {
		let id = event.target.id;
		if (!id || !id.startsWith('view-'))
			return;
		createView('#' + id, app);
		if (!location.hash.startsWith('#' + id)) {
			location.hash = '#' + id;
		}
	});

	$$(window).on('hashchange', () => {
		let hash = document.location.hash.split(':')[0] || '#view-valaam';
		app.tab.show(hash);
	});

	// $$(window).on('popstate', (event) => {
	// 	let state = event.state;
	// 	console.log('popstate', state);
	// 	let currentView = app.views.current;
	// 	let history = currentView.history;
	//
	// 	if (!state || !history.length) return;
	//
	// 	if (state.url === history[history.length - 1]) {
	// 		currentView.router.back();
	// 	}
	// });

	app.tab.show(location.hash.split(':')[0]);
}

/**
 * Создаем вью по запросу
 * @param  {string} id айдишник
 */
function createView(id, app) {
	const viewsIds = ['#view-valaam', '#view-prayers', '#view-calendar', '#view-rites'];

	if (app.views.get(id)) {
		//console.log(`Вью ${id} уже создана`);
		return;
	}

	if (!viewsIds.includes(id)) return;

	switch (id) {
		case '#view-valaam':
			app.views.create('#view-valaam', {
				name: 'Валаам',
				url: '/prayers/1736',
			});
			break;

		case '#view-prayers':
			app.views.create('#view-prayers', {
				name: 'Молитвослов',
				url: '/prayers/842',
			});
			break;

		case '#view-calendar':
			app.views.create('#view-calendar', {
				name: 'Календарь',
				url: '/calendar'
			});
			break;

		case '#view-rites':
			app.views.create('#view-rites', {
				name: 'Поминовения',
				url: '/rites',
				on: {
					pageAfterIn(page) {
						let location = document.location.hash.split(':')[1];
						if (page.name === 'rites' && location) {
							page.view.router.navigate(location);
							document.location.hash = 'view-rites';
						}
					}
				}
			});
			break;

		default:
			break;
	}
}

/**
 * Раскрываем фото на полный экран,
 * если у него есть атрибут data-srcorig
 * @param {HTMLImageElement} el
 */
function imgFullscreen(el) {
	let $el = $$(el);
	let browser = $el.data('photoBrowser');
	let src = $el.attr('data-srcorig');

	if (!src) return;

	if (!browser) {
		browser = app.photoBrowser.create({
			photos : [
				{
					url: src,
					caption: $el.attr('title')
				}
			],
			type: 'standalone',
			toolbar: false,
			exposition: false,
			theme: 'dark',
			routableModals: false,
			swiper: {
				zoom: {
					enabled: true,
					maxRatio: 10,
					minRatio: 1
				}
			}
		});

		$el.data('photoBrowser', browser);
	}
	browser.open();
}
