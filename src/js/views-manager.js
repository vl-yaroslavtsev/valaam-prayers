/**
 * Обработка истории браузера
 */
import {Dom7 as $$} from 'framework7';

let app;
const viewsIds = ['#view-valaam', '#view-prayers', '#view-calendar', '#view-rites'];

function init(appInstance) {
	app = appInstance;
	initViewTabs();
}

/**
 * Разбираем хэш.
 * Если он в виде #view-valaam:/url , грузим url во #view-valaam
 */
function parseHash() {
	let [viewId, url] = document.location.hash.split(':');
	if (!viewsIds.includes(viewId) || !url) return;

	let panel = app.panel.get('.panel-left');
	if (panel) {
		panel.close(false);
	} else {
		app.once('panelOpen', (panel) => {
			panel.close(false);
		});
	}

	app.tab.show(viewId);

	let view = app.views.get(viewId);
	view.router.navigate(url);
	document.location.hash = '';
}

/**
 * Инициализируем табы - представления
 * @param  {{Framework7}} app
 */
function initViewTabs() {
	app.root.find('.views.tabs').on('tab:show', (event) => {
		let id = event.target.id;
		if (!id || !id.startsWith('view-'))
		 	return;
		createView('#' + id, app);
	});

	parseHash();
	$$(window).on('hashchange', parseHash);
}

/**
 * Создаем вью по запросу
 * @param  {string} id айдишник
 */
function createView(id, app) {
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
		case '#view-valaam':
			view = app.views.create('#view-valaam', {
				name: 'Валаамский монастырь',
				url: '/prayers/1736',
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
}

export default {init};
