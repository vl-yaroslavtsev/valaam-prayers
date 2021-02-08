/**
 * Управляем режимом чтения
 */
import { Dom7 as $$ } from 'framework7';
import StateStore from '../js/state-store.js';
import settingsManager from '../js/settings-manager.js';
import db from '../js/data/db.js';
import { prayersBookId, prayersPath } from '../js/data/utils.js';
import { mapState, mapActions, mapGetters } from '../js/store/store.js';


let app;
let store;

class ReadMode extends StateStore {
	constructor(context) {
		super({
			id: 'read-mode',
			tutorialShown: false
		});
		app = context.$app;
		store = app.store;

		this.context = context;

		console.log('ReadMode() this.context.id', this.context.id);
		this.history = store.getters['readHistory/item'](this.context.id);
	}

	init() {
		let $page = this.$page = this.context.$el;
		let $content = this.$content = $page.find('.page-content');
		let $navbar = this.$navbar = $page.find('.navbar');
		let $toolbar = this.$toolbar = app.root.find('.views > .toolbar');
		let $progressbar = this.$progressbar = $page.find('.read-mode-toolbar');

		this.handler = {
			scroll: this.scrollHandler.bind(this),
			click: this.clickHandler.bind(this),
			settingsChanged: this.settingsChangedHandler.bind(this),
			pageLoaded: this.pageLoadedHandler.bind(this),
			keyDown: this.keyDownHandler.bind(this)
		};

		app.navbar.hide($navbar, false, settingsManager.get('hideStatusbar'));
		app.toolbar.hide($progressbar, false);
		app.toolbar.hide($toolbar, false);

		$content.on('scroll', this.handler.scroll);
		$content.on('click', this.handler.click);
		app.on('settingsTextChanged', this.handler.settingsChanged);
		app.on('pageLoaded', this.handler.pageLoaded);
		app.on('onKeyDown', this.handler.keyDown);

		this.range = app.range.create({
			el: $page.find('.read-mode-range')[0],
			min: 1,
			// max: this.pages,
			// value: this.page,
			on: {
				change: (range, value) => {
					if (this.page === value) {
						return;
					}
					this.rangeChanging = true;
					$content.scrollTop(
						(value - 1) * (app.height - this.textTopOffset)
					);
				},
				changed: () => {
					this.rangeChanging = false;
				}
			}
		});

		// TODO: ограничить по времени и добавить в настройки
		app.phonegap.keepScreenOn(true);

		// TODO: добавить в настройки
		app.phonegap.keyInterception(true);
	}

	/**
	 * После получения данных подготавливаем отображение
	*/
	prepare() {
		let $page = this.$page;
		let $navbar = this.$navbar;

		$page[0].style.setProperty(
			'--f7-navbar-extra-height',
			`${$navbar.find('.navbar-extra')[0].offsetHeight}px`
		);

		this.historyInit();

		this.update();
	}

	async setHistory() {
		await store.dispatch('readHistory/setItem', this.history);
	}

	async historyInit() {
		let $content = this.$content;

		if (!this.history) {
			this.history = {
				id: this.context.id,
				name: this.context.name,
				parent_id: this.context.parent,
				date: new Date(),
				book_id: prayersBookId({prayerId: this.context.id}),
				path: prayersPath(this.context.id),
				// scroll: $content.scrollTop() / $content[0].scrollHeight,
				// page: this.page,
				// pages: this.pages
			};
			this.setHistory();
		}
	}

	/**
	 * async historyUpdate - description
	 *
	 * @return {type}  description
	 */
	historyUpdate() {
		let $content = this.$content;

		if (!this.history) {
			return;
		}

		if (this.historyUpdateTimer) {
			clearTimeout(this.historyUpdateTimer);
			this.historyUpdateTimer = null;
		}

		this.historyUpdateTimer = setTimeout(() => {
			let scroll = $content.scrollTop() / $content[0].scrollHeight;

			Object.assign(this.history, {
				scroll,
				progress: (this.page == this.pages) ? '100' : Math.round(scroll * 100).toString(),
				date: new Date(),
				parent_id: this.context.parent,
				page: this.page,
				pages: this.pages,
			});

			this.setHistory();
		}, 300);
	}

	async update() {
		let $content = this.$content
		this.countPages();

		if (this.history.scroll) {
			this.initScroll = true;
			$content.scrollTop(
				Math.round(this.history.scroll * $content[0].scrollHeight)
			);
		}

		this.historyUpdate();

		this.range.max = this.pages;
		this.range.setValue(this.page);

		this.context.$update();
	}


	/**
	 * Обработчик скролла
	 * @this {F7Component}
	 * @param  {Event} e
	 */
	scrollHandler(e) {
		let $content = this.$content;
		let $navbar = this.$navbar;
		let $progressbar = this.$progressbar;

		let textTopOffset = this.getTextTopOffset();
		let scrollTop = $content.scrollTop();
		//let newPage = Math.floor(scrollTop / (app.height - textTopOffset)) + 1;
		let newPage = Math.round(scrollTop / (app.height - textTopOffset)) + 1;

		this.toggleBars(scrollTop);

		if (this.page === newPage) {
			this.historyUpdate();
			return;
		}

		this.page = newPage;
		this.historyUpdate();
		if (this.range) {
			this.range.setValue(this.page);
		}

		this.context.$update();
	}

	/**
	 * Показываем или скрываем верхнее и нижнее меню
	 * @param  {integer} scrollTop  Прокрутка страницы
	 */
	toggleBars(scrollTop) {
		if (this.initScroll) {
			this.initScroll = false;
			return;
		}

		app.navbar.hide(this.$navbar);

		if (scrollTop > this.prevScrollTop &&
			  this.$content[0].scrollHeight - (scrollTop + app.height) < 50) {
			app.toolbar.show(this.$progressbar);

		} else if (!this.rangeChanging) {
			app.toolbar.hide(this.$progressbar);
		}

		this.prevScrollTop = scrollTop;
	}

	countPages() {
		let $content = this.$content;

		delete this.textTopOffset;
		let textTopOffset = this.getTextTopOffset();
		let padding = 0;

		$content[0].style.setProperty(
			'--read-mode-padding-bottom',
			`0px`
		);

		//this.pages = Math.ceil($content[0].scrollHeight / (app.height - textTopOffset)) - 1;
		//this.page = Math.floor($content.scrollTop() / (app.height - textTopOffset)) + 1;
		if ($content[0].scrollHeight == app.height) {
			this.pages = 1;
			this.page = 1;
		} else {
			this.pages = Math.ceil($content[0].scrollHeight / (app.height - textTopOffset));
			this.page = Math.round($content.scrollTop() / (app.height - textTopOffset)) + 1;

			let padding = this.pages * (app.height - textTopOffset) - $content[0].scrollHeight;
			$content[0].style.setProperty(
				'--read-mode-padding-bottom',
				`${padding}px`
			);
		}
	}

	/**
	 * Обработчик клика
	 * @this {F7Component}
	 */
	clickHandler(e) {
		let $navbar = this.$navbar;
		let $progressbar = this.$progressbar;
		let clickCenter = false;
		let barShown = !$progressbar.hasClass('toolbar-hidden');

		if (["A", "BUTTON", "IMG"].includes(e.target.tagName)) {
			return;
		}

		if (barShown) {
			app.navbar.hide($navbar);
			app.toolbar.hide($progressbar);
			return;
		}

		if (e.clientX > app.width * 0.25 &&
				e.clientX < app.width * 0.75 &&
				e.clientY > app.height * 0.25 &&
				e.clientY < app.height * 0.75 ) {
			clickCenter = true;
		}

		if (clickCenter) {
			app.navbar.show($navbar);
			app.toolbar.show($progressbar);
			return;
		}

		//if (e.clientX < app.width * 0.5 ) {
		if (e.clientY < app.height * 0.5) {
			this.scrollPageUp();
		} else {
			this.scrollPageDown();
		}
	}

	scrollPageUp() {
		let $content = this.$content;
		let textTopOffset = this.getTextTopOffset();

		$content.scrollTop(
			Math.round(Math.max($content.scrollTop() - app.height + textTopOffset, 0)),
			200
		);
	}

	scrollPageDown() {
		let $content = this.$content;
		let textTopOffset = this.getTextTopOffset();

		$content.scrollTop(
			Math.round(Math.min(
				$content.scrollTop() + app.height - textTopOffset,
				$content[0].scrollHeight - app.height
			)),
			200
		);
	}

	settingsChangedHandler() {
		this.update();
	}

	async pageLoadedHandler() {
		this.prepare();

		await this.statePromise;
		if (!this.state.tutorialShown) {
			this.showTutorial();
			this.setState({tutorialShown: true});
		}
	}

	keyDownHandler(key) {
		switch (key) {
			case 28:
				this.scrollPageUp();
				break;
			case 29:
				this.scrollPageDown();
				break;
		}
	}

	/**
	 * Смещение текста относительно верха экрана.
	 * Включает safe-area-top + выстота строки
	 */
	getTextTopOffset() {
		if (this.textTopOffset) {
			return this.textTopOffset;
		}

		let $content = this.$content;
		let $block = $content.find('.tab-active > .block-strong.inset');
		if (!$block.length) {
			$block = $content.find('.block-strong.inset');
		}
		let computedStyle = window.getComputedStyle($block[0]);
		let lineHeight = parseInt(computedStyle.lineHeight);
		let safeAreaTop = parseInt(computedStyle.getPropertyValue('--f7-safe-area-top'));

		this.textTopOffset = lineHeight + safeAreaTop;
		return this.textTopOffset;
	}

	showTutorial() {
		let tutorial = this.$page.find('.read-mode-tutorial')[0].f7Component;
		if (!tutorial) {
			return;
		}
		app.navbar.hide(this.$navbar);
		app.toolbar.hide(this.$progressbar);

		tutorial.full();
	}

	destroy() {
		this.$content.off('scroll', this.handler.scroll);
		this.$content.off('click', this.handler.click);
		app.off('settingsTextChanged', this.handler.settingsChanged);
		app.off('pageLoaded', this.handler.pageLoaded);

		if (this.range) {
			this.range.destroy();
		}

		app.phonegap.keepScreenOn(false);
		app.phonegap.keyInterception(false);

		this.range = null;
		this.$page = null;
		this.$content = null;
		this.$navbar = null;
		this.$toolbar = null;
		this.$progressbar = null;
		this.context = null;
	}
}

export default {
	data()  {
		this.readMode = new ReadMode(this);
	},
	methods: {
		tutorial() {
			this.readMode.showTutorial();
		}
	},
	on: {
		pageInit(e, page) {
			if (!app) {
				app = page.app;
			}

			this.readMode.init();
		},

		pageBeforeIn(e, page) {
		},

		pageAfterIn(e, page) {
		},

		pageBeforeOut(e, page) {
		},

		pageBeforeRemove(e, page) {
			this.readMode.destroy();
		}
	}

	/**
	 Разбиваем на слова на сервере:
	 str.split(/(?=<.+?>)|(?<=<.+?>)/i).map(el => !el.startsWith('<') && !el.endsWith('>') ? '<span class="word">' + el.split(/(?=\s+\S)/i).join(`</span><span class="word">`) + '</span>' : el).join('');
	 При прокручивании вниз проверяем, есть ли внизу экрана слово:
	 let el = document.elementFromPoint(50, Math.round(app.height - lineHeight * 0.8));
	 if ($$(el).is('span.word')) {
		 прокручиваем к этому слову
		 $pageContent.scrollTop($pageContent.scrollTop() + el.getBoundingClientRect().top
	 } else {
		 прокручиваем на высоту экрана
	 }
	 */
}
