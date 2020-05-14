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
	let $blocks = context.$el.find('.page-content .block-strong.inset');
	if (!$blocks.length) return;

	context.readMode = new ReadMode(context);
}

function detach({readMode}) {
	if (!readMode) return;

	if (!app.phonegap.statusbar.visible()) {
		app.phonegap.statusbar.show();
	}
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
			this.setActive(this.active);
		});
	}

	setActive(active) {
		let $page = this.$page;
		let $content = this.$content;
		let $navbar = this.$navbar;
		let $toolbar = this.$toolbar;
		let $progressbar = this.$progressbar;

		if (active) {
			$page.addClass('read-mode');

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

			this.active = true;
		} else {
			if (this.range) {
				this.range.$el.find('.range-bar, .range-knob-wrap').remove();
				this.range.destroy();
				this.range = null;
			}
			app.toolbar.hide($progressbar);
			app.toolbar.show($toolbar);
			$page.removeClass('read-mode');

			if (!app.phonegap.statusbar.visible()) {
				app.phonegap.statusbar.show();
			}
			this.active = false;
		}

		this.context.$update();
		manager.setState({active});
	}

	toggle() {
		this.setActive(!this.active);
	}

	/**
	 * Обработчик скролла
	 * @this {F7Component}
	 */
	scrollHandler(e) {
		let $content = this.$content;
		let $navbar = this.$navbar;
		let $toolbar = this.$toolbar;

		if (!this.active) {
			if (!$content.hasClass('hide-navbar-on-scroll')) {
				return;
			}

			if ($content.scrollTop() > $content[0].scrollHeight - app.height - $toolbar.height() ||
					$content.scrollTop() < $navbar.height()) {
				app.toolbar.show($toolbar);
			} else {
				app.toolbar.hide($toolbar);
			}
			return;
		}

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
			if (
				!this.active &&
				(
					!$content.hasClass('hide-navbar-on-scroll') ||
					$content.scrollTop() > $content[0].scrollHeight - app.height - $bar.height() ||
					$content.scrollTop() < $navbar.height()
				)
			) {
				return;
			}
			app.navbar.hide($navbar);
			app.toolbar.hide($bar);
			return;
		} else if (!this.active) {
			app.navbar.show($navbar);
			app.toolbar.show($bar);
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
		if (e.clientX < app.width / 2 ) {
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
