import 'framework7/css/framework7.css';

import 'framework7/components/dialog.css';
import 'framework7/components/popup.css';
import 'framework7/components/popover.css';
import 'framework7/components/toast.css';
import 'framework7/components/preloader.css';
import 'framework7/components/progressbar.css';
import 'framework7/components/virtual-list.css';
import 'framework7/components/tabs.css';
import 'framework7/components/panel.css';
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
import 'framework7/components/skeleton.css';
import 'framework7/components/elevation.css';
import 'framework7/components/typography.css';

import '../css/app.css';

import Framework7, {Dom7 as $$} from 'framework7';
// Import additional components
import Dialog	    from 'framework7/components/dialog/dialog.js';
import Popup	    from 'framework7/components/popup/popup.js';
import Popover 		from 'framework7/components/popover/popover';
import Toast        from 'framework7/components/toast/toast.js';
import Preloader    from 'framework7/components/preloader/preloader.js';
import Progressbar  from 'framework7/components/progressbar/progressbar.js';
import VirtualList  from 'framework7/components/virtual-list/virtual-list.js';
import Tabs	        from 'framework7/components/tabs/tabs.js';
import Panel 		from 'framework7/components/panel/panel.js';
import Form	        from 'framework7/components/form/form.js';
import Input        from 'framework7/components/input/input.js';
import Radio		from 'framework7/components/radio/radio.js';
import Toggle       from 'framework7/components/toggle/toggle.js';
import Range 		from 'framework7/components/range/range.js';
import Stepper 		from 'framework7/components/stepper/stepper.js';
import SmartSelect  from 'framework7/components/smart-select/smart-select.js';
import Calendar     from 'framework7/components/calendar/calendar.js';
import InfiniteScroll from 'framework7/components/infinite-scroll/infinite-scroll.js';
import Lazy         from 'framework7/components/lazy/lazy.js';
import Searchbar    from 'framework7/components/searchbar/searchbar.js';
import Swiper	    from 'framework7/components/swiper/swiper.js';
import PhotoBrowser from 'framework7/components/photo-browser/photo-browser.js';
import Autocomplete from 'framework7/components/autocomplete/autocomplete.js';
import Skeleton 	from 'framework7/components/skeleton/skeleton.js';
import Elevation    from 'framework7/components/elevation/elevation.js';
import Typography	from 'framework7/components/typography/typography.js';

import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

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
	Panel,
	PhotoBrowser,
	Popover,
	Popup,
	Preloader,
	Progressbar,
	Radio,
	Range,
	Searchbar,
	Skeleton,
	SmartSelect,
	Stepper,
	Swiper,
	Tabs,
	Toast,
	Toggle,
	Typography,
	VirtualList,

	Framework7PhoneGap
]);

import routes from './routes.js';
import * as OfflinePlugin from 'offline-plugin/runtime';

import dataManager from './data/manager.js';
import downloadManager from './download/manager.js';
import favoriteManager from './favorite-manager.js';
import settingsManager from './settings-manager.js';

import viewsManager   from './views-manager.js';
import imageLazyDb from './image-lazy-db.js';
import {init as dateUtilsInit} from './utils/date-utils.js';

// Framework7 App main instance
const app = new Framework7({
	root: '#root',
	id: 'ru.valaam.prayers',
	name: 'Валаамский молитвослов',
	theme: navigator.userAgent.match(/Debug/) !== null ? 'auto' : 'md',
	disabled: false,
	// theme: 'ios',

	statusbar: {
		// androidTextColor: 'white',
		androidOverlaysWebView: true,
	},

	panel: {
		swipe: 'left',
		swipeOnlyClose: true
	},

	on: {
		// эти функции не должны быть асинхронными - сбивается порядок выполнения - потом концов не найдёте
		async init() {

			if (!checkSupport(this)) {
				this.disabled = true;
				return;
			}

			try {
				await dataManager.init();
			} catch(ex) {
				this.methods.showLoadError(`
					Ошибка при инициализации данных: [${ex.name}]: ${ex.message}
				`, 30000);
			}

			downloadManager.init(this);
			favoriteManager.init(this);
			imageLazyDb.init(this);
			settingsManager.init(this);
			dateUtilsInit(this);

			viewsManager.init(this);

			this.root.on('click', '.page-current img[data-srcorig]', (e) => {
				imgFullscreen(e.target);
			});

			this.phonegap.canApplePay().then((result) => {
				this.data.canApplePay = result;
			});

			this.phonegap.statusbar.show();
			this.phonegap.hideSplash();
			this.phonegap.networkIndicator(false);
			this.phonegap.appInit();
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
		showMessage(msg, {css, timeout = 5000, position = 'bottom'} = {}) {
			this.toast.show({
				text: msg,
				position,
				closeTimeout: timeout,
				destroyOnClose: true,
				cssClass: css
			});
		},
		showError(msg, timeout) {
			this.methods.showMessage(msg, {
				css: 'bg-color-red',
				timeout,
				position: 'top'
			});
		},
		showLoadError(msg, timeout) {
			this.methods.showError(msg ||	'Ошибка загрузки данных');
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
				return await dataManager.get(source, ...args);
			} catch (err) {
				let msg;
				if (err.message === 'Network error') {
					msg = 'Ошибка загрузки данных.<br>Проверьте подключение к сети Интернет';
				}
				app.methods.showLoadError(msg);
				throw err;
			} finally {
				app.preloader.hide();
			}
		},
		skeletonWord(min = 5, max = 20) {
			let length = min + Math.round(Math.random() * (max - min));
			return new Array(length).fill('_').join('');
		},
		skeletonWordLen(min = 5, max = 20) {
			return min + Math.round(Math.random() * (max - min));
		},
		scrollToEl($el, $page) {
			$page = $page || $$(this.views.current.router.currentPageEl);
			let $pageContent = $page.find('.page-content');
			let scrollTop = $pageContent.scrollTop();
			scrollTop = scrollTop +
				$el.offset().top -
				parseInt($el.styles().marginTop) -
				$page.find('.navbar').height();
				$pageContent.scrollTop(scrollTop, 500);
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
if (typeof globalThis !== 'undefined') {
 	globalThis['app'] = app;
} else {
	window['app'] = app;
}

// Окончание загрузки: window.load и загружена главная старинца
let promiseLoaded = Promise.all([
	new Promise((resolve, reject) => {
		window.addEventListener('load', resolve);
	}),
	new Promise((resolve, reject) => {
		app.on('mainPageLoaded', resolve);
	}),
])

promiseLoaded.then(() => {
	// Для iOS10 не работает нативно оффлайн версия
	if (app.device.ios &&
			parseInt(app.device.osVersion) === 10) {
		offlinePluginInstall();
	}
	//downloadManager.preload();
});


window.addEventListener('beforeinstallprompt', (e) => {
  // Stash the event so it can be triggered later.
  //console.log('beforeinstallprompt', e);
  //let deferredPrompt = e;
  //deferredPrompt.prompt();
});

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
			popupCloseLinkText: '<i class="icon material-icons">close</i>',
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

function checkSupport(app) {
	let isIOsWebview = !!window.webkit;
	let supported = ('CSS' in window && CSS.supports('color', 'var(--color-var)'));
	let msg = '';

	if (supported) {
		return true;
	}

	if (app.device.androidChrome) {
		msg = `Для корректной работы молитвослова и календаря,
		пожалуйста, обновите приложение<br>
		<a href="https://play.google.com/store/apps/details?id=com.android.chrome&hl=ru"
		 	 target="_blank"
			 class="external">Google Chrome</a> или <br>
		<a href="https://play.google.com/store/apps/details?id=com.google.android.webview&hl=ru"
	 		 target="_blank"
	 		 class="external">Android System WebView</a><br><br>
		Если это не помогает, можно установить "Молитвослов" как отдельное приложение.<br>
		Для этого, пожалуйста:<br>
		<ol>
			<li>
			В <b>Google Chrome</b> перейдите по
			ссылке <a href="https://valaam.ru/prayers.f7/">https://valaam.ru/prayers.f7/</a>
			</li>
			<li>
			Согласитесь на предложение установить "Молитвослов" на главный экран
			</li>
			<li>
			Если этого предложения не возникло, нажмите на три точки
			в верхнем правом углу браузера и выберите "Добавить на главный экран"
			</li>
			<li>
			Теперь у Вас есть отдельное приложение "Молитвослов" 
			(вместе с календарём, информацией о Валааме и возможностью подать поминовение).
			</li>
		</ol>
		Ваше Вебвью: ${navigator.userAgent}
		`;
	} else {
		msg = `Данный браузер не поддерживается.<br>
		Пожалуйста, установите последнюю версию современного браузера
		Chrome, Safari, Opera, Firefox или Yandex Browser<br><br>
		Ваш браузер: ${navigator.userAgent}
		`;
	}

	let $app = document.querySelector('#root');
	$app.innerHTML = msg;
	$app.style.padding = '10px';
	$app.style.color = 'black';
	$app.style.background = 'white';

	return false;
}

function offlinePluginInstall() {
	if (app.disabled) {
		return;
	}

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
			let toast = app.toast.create({
				text: `
					Молитвослов обновился. <a onclick="window.location.reload();">Перезагрузить</a>
				`,
				closeButton: true,
				closeButtonText: '<i class="icon material-icons">close</i>',
				destroyOnClose: true,
				closeTimeout: 10 * 1000
			});
			toast.open();
		}
	});
}
