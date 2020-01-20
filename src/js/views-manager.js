/**
 * Обработка истории браузера
 */
import {Dom7 as $$} from 'framework7';

let app;

function init(appInstance) {
	app = appInstance;

	initViewTabs();
}

/**
 * Инициализируем табы - представления
 * @param  {{Framework7}} app
 */
function initViewTabs() {
	//location.hash = location.hash.split(':')[0] || '#view-valaam';
	location.hash = location.hash || '#view-valaam';

	app.root.find('.views.tabs').on('tab:show', (event) => {
		let id = event.target.id;
		if (!id || !id.startsWith('view-'))
			return;

		if (!location.hash.startsWith('#' + id)) {
			location.hash = '#' + id;
		}

		createView('#' + id, app);
	});

	$$(window).on('hashchange', () => {
		let hash = document.location.hash.split(':')[0] || '#view-valaam';
		app.tab.show(hash);
	});

	app.tab.show(location.hash.split(':')[0]);
}

/**
 * Создаем вью по запросу
 * @param  {string} id айдишник
 */
function createView(id, app) {
	const viewsIds = ['#view-valaam', '#view-prayers', '#view-calendar', '#view-rites'];
	let view;
	if (!viewsIds.includes(id)) return;

	//history.go(1 - history.length);

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
				url: '/prayers/842',
				on: {
					pageAfterIn(page) {
						let location = document.location.hash.split(':')[1];
						if (location) {
							page.view.router.navigate(location);
							document.location.hash = 'view-prayers';
						}
					}
				}
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

	app.emit('viewShown', view);
}

export default {init};
