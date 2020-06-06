/**
 * Управляем режимом чтения
 */
import { Dom7 as $$ } from 'framework7';
import StateStore from './state-store.js';
import settingsManager from './settings-manager.js';

let inited = false;
let app;
let manager;
/**
 * Инициализация
 * @param  {Framework7} appInstance
 */
async function init (appInstance) {
	if (inited) return;
	app = appInstance;

	manager = new StateStore({
		id: 'read-manager',
		active: false,
	});

	await manager.statePromise;

	app.on('pageInit', (page) => {
		if (!page.el.f7Component) return;
		attach(page.el.f7Component);
	});

	app.on('pageBeforeRemove', (page) => {
		if (!page.el.f7Component) return;
		detach(page.el.f7Component);
	});

	inited = true;
}

function attach(context) {
	console.log('read-manager', 'attach', context);
	if (!context.$el.hasClass('read-mode')) return;

	context.readMode = new ReadMode(context);
}

function detach({readMode}) {
	if (!readMode) return;

	if (!app.phonegap.statusbar.visible()) {
		app.phonegap.statusbar.show();
	}

	console.log('read-manager', 'detach');
	readMode.destroy();
}

export {init, attach, detach}

class ReadMode {
	constructor(context) {
		console.log('read-manager', 'attach', context);

		this.context = context;

		this.active = manager.state.active;
		this.$page = context.$el;
		this.$content = this.$page.find('.page-content');
		this.$navbar = this.$page.find('.navbar');
		this.$toolbar = app.root.find('.views > .toolbar');
		this.$progressbar = this.$page.find('.read-mode-toolbar');

		this.handler = {
			scroll: this.scrollHandler.bind(this),
			click: this.clickHandler.bind(this)
		};

		this.$content.on('scroll', this.handler.scroll);
		this.$content.on('click', this.handler.click);

		context.$update(() => {
			this.init();
		});
	}

	init() {
		let $page = this.$page;
		let $content = this.$content;
		let $navbar = this.$navbar;
		let $toolbar = this.$toolbar;
		let $progressbar = this.$progressbar;

		this.page = Math.floor($content.scrollTop() / app.height) + 1;
		this.pages = Math.ceil($content[0].scrollHeight / app.height) - 1;

		this.range = app.range.create({
			el: $page.find('.read-mode-range')[0],
			min: 1,
			max: this.pages,
			value: this.page,
			on: {
				change: (range, value) => {
					if (this.page === value) {
						return;
					}
					$content.scrollTop(
						(value - 1) * app.height
					);
				}
			}
		});

		app.navbar.hide($navbar, true, settingsManager.get('hideStatusbar'));
		app.toolbar.hide($progressbar);
		app.toolbar.hide($toolbar);

		if (settingsManager.get('hideStatusbar') &&
	 			app.phonegap.statusbar.visible()) {
			app.phonegap.statusbar.hide();
		}

		this.context.$update();
	}

	update() {
		let $content = this.$content;
		if (!this.active) return;

		this.page = Math.floor($content.scrollTop() / app.height) + 1;
		this.pages = Math.ceil($content[0].scrollHeight / app.height) - 1;

		this.range.max = this.pages;

		this.context.$update();
	}

	/**
	 * Обработчик скролла
	 * @this {F7Component}
	 */
	scrollHandler(e) {
		let $content = this.$content;
		let $navbar = this.$navbar;
		let $toolbar = this.$toolbar;

		this.page = Math.floor(this.$content.scrollTop() / app.height) + 1;
		if (this.range) {
			this.range.setValue(this.page);
		}

		this.context.$update();
		app.navbar.hide($navbar);
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
		let $bar = this.active ? this.$progressbar : this.$toolbar;
		let barShown = !$bar.hasClass('toolbar-hidden');

		if (["A", "BUTTON", "IMG"].includes(e.target.tagName)) {
			return;
		}

		if (barShown) {
			app.navbar.hide($navbar);
			app.toolbar.hide($bar);
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
			app.toolbar.show($bar);
			return;
		}

		let lineHeight = this.getLineHight();
		//if (e.clientX < app.width / 2 ) {
		if (e.clientY < app.height / 2 ) {
			$content.scrollTop(
				Math.max($content.scrollTop() - app.height + lineHeight, 0),
				200
			);
		} else {
			$content.scrollTop(
				Math.min(
					$content.scrollTop() + app.height - lineHeight,
					$content[0].scrollHeight - app.height
				),
				200
			);
		}
	}

	getLineHight() {
		let $content = this.$content;
		let $block = $content.find('.tab-active .block-strong.inset');
		if (!$block.length) {
			$block = $content.find('.block-strong.inset');
		}
		return parseFloat(window.getComputedStyle($block[0]).lineHeight);
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
