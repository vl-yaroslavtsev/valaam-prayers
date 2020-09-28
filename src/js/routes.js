
import Framework7, { Request } from 'framework7';
import './t7-helpers.js';

import Calendar from '../pages/calendar.f7.html';
import CalendarHolidays from '../pages/calendar-holidays.f7.html';

import Days from '../pages/days.f7.html';
import DayInstructions from '../pages/day-instructions.f7.html';
import DayThoughts from'../pages/day-thoughts.f7.html';
import DayReaders from '../pages/day-readers.f7.html';
import DayParabel from '../pages/day-parabel.f7.html';
import DayPrayers from '../pages/day-prayers.f7.html';

import Index from '../pages/index.f7.html';

import Favorites from '../pages/favorites.f7.html';

import Saints from '../pages/saints.f7.html';
import SaintLives from '../pages/saint-lives.f7.html';

import Search from '../pages/search.f7.html';

import Settings from '../pages/settings.f7.html';
import SettingsDownload from '../pages/settings-download.f7.html';
import SettingsDownloadItem from '../pages/settings-download-item.f7.html';
import SettingsText from '../pages/settings-text.f7.html';

import Prayers from '../pages/prayers.f7.html';
import PrayersText from '../pages/prayers-text.f7.html';

import ReadModeTutorial from '../pages/read-mode-tutorial.f7.html';

import Rites from '../pages/rites.f7.html';
import RitesName from '../pages/rites-name.f7.html';
import RitesStatus from '../pages/rites-status.f7.html';

import MainMenu from '../pages/main-menu.f7.html';

import NotFound from '../pages/404.f7.html';

import dataManager from './data/manager.js';

Framework7.registerComponent('download-list-item', SettingsDownloadItem);
Framework7.registerComponent('read-mode-tutorial', ReadModeTutorial);

export default [
	{
		path: '/',
		component: Index
	},
	{
		path: '/calendar',
		component: Calendar,
		//beforeEnter: requireData('calendar'),
		routes: [
			{
				path: 'holidays/:year/:type',
				component: CalendarHolidays
			}
		]
	},
	{
		path: '/days/:id',
		routes: [
			{
				path: 'instructions',
				async(routeTo, routeFrom, resolve, reject) {
					let context = Object.assign({}, routeFrom.context, {id: 'bu-' + routeFrom.context.id});
					resolve({component: DayInstructions}, {context});
				},
				options: {
					transition: 'f7-push',
			 	}
			},
			{
				path: 'thoughts',
				//component: DayThoughts,
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: DayThoughts}, {context: routeFrom.context});
				},
				options: {
					transition: 'f7-push',
			 	}
			},
			{
				path: 'parabel',
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: DayParabel}, {context: routeFrom.context});
				},
				options: {
					transition: 'f7-push',
			 	}
			},
			{
				path: 'readers/:readerId',
				//component: DayReaders,
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: DayReaders}, {context: routeFrom.context});
				},
				options: {
					transition: 'f7-push',
			 	}
			},
			{
				path: 'prayers/:prayerId',
				//component: DayPrayers
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: DayPrayers}, {context: routeFrom.context});
				},
				options: {
					transition: 'f7-push',
			 	}
			}
		],
		async async(routeTo, routeFrom, resolve, reject) {
			// App instance
			let app = this.app;
			// Days Code from request
			let daysCode = routeTo.params.id;
			let to = Days;

			if(routeTo.query.mode === 'search' && routeTo.query.action) {
				let componentMap = {
					'instructions' : DayInstructions,
					'thoughts' : DayThoughts,
					'readers' : DayReaders,
					'prayers' : DayPrayers
				};

				to = componentMap[routeTo.query.action] || to;
			}

			try {
				let day = await app.methods.load('day', daysCode);
				resolve({
					component: to
				}, {
					context: {
						id: daysCode,
						day,
						action: routeTo.query.action,
						actionId: routeTo.query.actionId
					}
				});
			} catch (ex) {
				reject();
			}
		},
		beforeEnter: requireData('prayers')
	},
	{
		path: '/saints/:id',
		routes: [
			{
				path: 'lives',
				//component: SaintLives,
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: SaintLives}, {context: routeFrom.context});
				},
				options: {
					transition: 'f7-push',
			 	}
			},
		],
		async async(routeTo, routeFrom, resolve, reject) {
			let app = this.app;
			let id = routeTo.params.id;

			try {
				let saint = await app.methods.load('saint', id);
				resolve({component: Saints}, {context: {id, saint}});
			} catch (ex) {
				reject();
			}
		},
		beforeEnter: requireData('prayers')
	},
	{
		path: '/rites',
		component: Rites//,
		//beforeEnter: requireData(['ritesConfig','valaamGid'])
	},
	{
		path: '/rites-name/:idx',
		component: RitesName,
		beforeEnter: requireData('ritesConfig')
	},
	{
		path: '/rites-status',
		async async(routeTo, routeFrom, resolve, reject) {
			let app = this.app;

			app.preloader.show();
			try {
				let {data} = await Request.promise.json(
					`https://valaam.ru/phonegap/rites/${routeTo.query.id}`
				);
				app.preloader.hide();
				resolve({component: RitesStatus}, {context: data});
			} catch (ex) {
				app.methods.showLoadError();
				app.preloader.hide();
				reject();
			}
		},
		beforeEnter: requireData('ritesConfig')
	},
	{
		path: '/prayers/:sectionId',
		component: Prayers//,
		//beforeEnter: requireData('prayers')
	},
	{
		path: '/prayers/text/:id',
		//component: PrayersText,
		async(routeTo, routeFrom, resolve, reject) {
			let id = routeTo.params.id;
			resolve({component: PrayersText}, {context: {id}});
		},
		options: {
			//transition: 'f7-push',
	 	}
	},
	{
		path: '/search',
		component: Search
	},
	{
		path: '/favorites',
		component: Favorites,
		beforeEnter: requireData('prayers')
	},
	{
		path: '/settings',
		component: Settings
	},
	{
		path: '/settings/download',
		component: SettingsDownload
	},
	{
		path: '/settings/text',
		popup: {
			component: SettingsText
		}
	},
	{
		path: '/menu',
		component: MainMenu
	},
	// Default route (404 page). MUST BE THE LAST
	// {
	// 	path: '(.*)',
	// 	component: NotFound
	// }
];

/**
 * Загружаем необходмые данные перед загрузкой маршрута
 * @param  {string} source источник данных
 * @return {Function}
 */
function requireData(source) {
	return async function (routeTo, routeFrom, resolve, reject) {
		let app = this.app;
		let params = source;

		if(!Array.isArray(params)) {
			params = [source];
		}

		try {
			app.preloader.show();
			await Promise.all(params.map((source) => dataManager.get(source)));
			app.preloader.hide();
			resolve();
		} catch(ex) {
			app.preloader.hide();
			app.methods.showLoadError();
			reject();
		}
	};
}
