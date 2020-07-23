/**
 * Управляем режимом чтения
 */
import { Dom7 as $$ } from 'framework7';
import StateStore from '../js/state-store.js';
import settingsManager from '../js/settings-manager.js';
import db from '../js/data/db.js';
import { prayersBookId, prayersPath } from '../js/data/utils.js';

const READ_HISTORY_MAX_SIZE = 500;

let app;

class ReadMode {
	constructor(context) {
		this.context = context;
		this.historyPromise = db.read_history.get(this.context.id);
	}

	init() {
		let $page = this.$page = this.context.$el;
		let $content = this.$content = $page.find('.page-content');
		let $navbar = this.$navbar = $page.find('.navbar');
		let $toolbar = this.$toolbar = app.root.find('.views > .toolbar');
		let $progressbar = this.$progressbar = $page.find('.read-mode-toolbar');

		this.handler = {
			scroll: this.scrollHandler.bind(this),
			click: this.clickHandler.bind(this)
		};

		// if (settingsManager.get('hideStatusbar') &&
		// 		app.phonegap.statusbar.visible()) {
		// 	app.phonegap.statusbar.hide();
		// }

		app.navbar.hide($navbar, false, settingsManager.get('hideStatusbar'));
		app.toolbar.hide($progressbar, false);
		app.toolbar.hide($toolbar);
		//app.toolbar.show($progressbar, false);

		$content.on('scroll', this.handler.scroll);
		$content.on('click', this.handler.click);

		console.log('[read-mode-mixin] init before historyInit: $content.scrollHeight', this.$content[0].scrollHeight);

		this.historyInit();

		console.log('[read-mode-mixin] init after historyInit: $content.scrollHeight', this.$content[0].scrollHeight);

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
						(value - 1) * (app.height - this.lineHeight)
					);
				},
				changed: () => {
					this.rangeChanging = false;
				}
			}
		});

		$page[0].style.setProperty(
			'--f7-navbar-extra-height',
			`${$navbar.find('.navbar-extra')[0].offsetHeight}px`
		);

		// this.context.$update();
	}

	async historyInit() {
		let $content = this.$content;
		this.history = await this.historyPromise;

		if (!this.history) {
			this.history = {
				id: this.context.id,
				name: this.context.name,
				parent_id: this.context.parent,
				date: new Date(),
				book_id: prayersBookId(this.context.id),
				path: prayersPath(this.context.id),
				// scroll: $content.scrollTop() / $content[0].scrollHeight,
				// page: this.page,
				// pages: this.pages
			};
			await db.read_history.put(this.history);
			await this.historyLimit();
		}

		// else {
		// 	this.initScroll = true;
		// 	$content.scrollTop(
		// 		Math.round(this.history.scroll * $content[0].scrollHeight)
		// 	);
		// }
	}

	/**
	 * async historyUpdate - description
	 *
	 * @return {type}  description
	 */
	async historyUpdate() {
		let $content = this.$content;
		await this.historyPromise;
		if (!this.history) {
			return;
		}

		Object.assign(this.history, {
			scroll: $content.scrollTop() / $content[0].scrollHeight,
			date: new Date(),
			parent_id: this.context.parent,
			page: this.page,
			pages: this.pages,
		});
		await db.read_history.put(this.history);
	}


	/**
	 * Ограничиваем размер истории до READ_HISTORY_MAX_SIZE элементов
	 * @return {Promise}
	 */
	async historyLimit() {
		let count = await db.read_history.count();
		if (count <= READ_HISTORY_MAX_SIZE) {
			return;
		}
		let keys = await db.read_history.getAllKeysFromIndex('by-date');
		let keysToDelete = keys.slice(0, count - READ_HISTORY_MAX_SIZE);

		await Promise.all(
			keysToDelete.map((key) => db.read_history.delete(key))
		);
	}

	async update() {
		let $content = this.$content
		this.countPages();

		await this.historyPromise;
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

		let lineHeight = this.getLineHeight();
		let scrollTop = $content.scrollTop();
		//let newPage = Math.floor(scrollTop / (app.height - lineHeight)) + 1;
		let newPage = Math.round(scrollTop / (app.height - lineHeight)) + 1;

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

		delete this.lineHeight;
		let lineHeight = this.getLineHeight();
		let padding = 0;

		$content[0].style.setProperty(
			'--read-mode-padding-bottom',
			`0px`
		);

		//this.pages = Math.ceil($content[0].scrollHeight / (app.height - lineHeight)) - 1;
		//this.page = Math.floor($content.scrollTop() / (app.height - lineHeight)) + 1;
		if ($content[0].scrollHeight == app.height) {
			this.pages = 1;
			this.page = 1;
		} else {
			this.pages = Math.ceil($content[0].scrollHeight / (app.height - lineHeight));
			this.page = Math.round($content.scrollTop() / (app.height - lineHeight)) + 1;

			let padding = this.pages * (app.height - lineHeight) - $content[0].scrollHeight;
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
		let $content = this.$content;
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

		if (e.clientX > app.width / 3 &&
				e.clientX < app.width * 2 / 3 &&
				e.clientY > app.height / 4 &&
				e.clientY < app.height * 3 / 4 ) {
			clickCenter = true;
		}

		if (clickCenter) {
			app.navbar.show($navbar);
			app.toolbar.show($progressbar);
			return;
		}

		let lineHeight = this.getLineHeight();
		console.log('lineHeight', lineHeight);
		//if (e.clientX < app.width / 2 ) {
		if (e.clientY < app.height / 2 ) {
			$content.scrollTop(
				Math.round(Math.max($content.scrollTop() - app.height + lineHeight, 0)),
				200
			);
		} else {
			$content.scrollTop(
				Math.round(Math.min(
					$content.scrollTop() + app.height - lineHeight,
					$content[0].scrollHeight - app.height
				)),
				200
			);
		}
	}

	getLineHeight() {
		if (this.lineHeight) {
			return this.lineHeight;
		}

		let $content = this.$content;
		let $block = $content.find('.tab-active .block-strong.inset');
		if (!$block.length) {
			$block = $content.find('.block-strong.inset');
		}
		this.lineHeight = parseFloat(window.getComputedStyle($block[0]).lineHeight);
		return this.lineHeight;
	}

	destroy() {
		this.$content.off('scroll', this.handler.scroll);
		this.$content.off('click', this.handler.click);

		if (this.range) {
			this.range.destroy();
		}

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
	on: {
		pageInit(e, page) {
			if (!app) {
				app = page.app;
			}

			this.readMode.init();
			console.log('[read-mode-mixin] pageInit: $content.scrollHeight', this.readMode.$content[0].scrollHeight);
			console.log('[read-mode-mixin] pageInit: .navbar-extra.offsetHeight', this.readMode.$navbar.find('.navbar-extra')[0].offsetHeight);
		},

		pageBeforeIn(e, page) {
			this.readMode.update();
			console.log('[read-mode-mixin] pageBeforeIn: $content.scrollHeight', this.readMode.$content[0].scrollHeight);
			console.log('[read-mode-mixin] pageBeforeIn: .navbar-extra.offsetHeight', this.readMode.$navbar.find('.navbar-extra')[0].offsetHeight);

		},

		pageAfterIn(e, page) {
			console.log('[read-mode-mixin] pageAfterIn: $content.scrollHeight', this.readMode.$content[0].scrollHeight);
			console.log('[read-mode-mixin] pageAfterIn: .navbar-extra.offsetHeight', this.readMode.$navbar.find('.navbar-extra')[0].offsetHeight);
			app.toolbar.hide(this.readMode.$toolbar,false);
		},

		pageBeforeOut(e, page) {
			// if (!app.phonegap.statusbar.visible()) {
			// 	app.phonegap.statusbar.show();
			// }
		},

		pageBeforeRemove(e, page) {
			this.readMode.destroy();
		}
	}
}
