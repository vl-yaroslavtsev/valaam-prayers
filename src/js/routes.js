
import { Request } from 'framework7';
import './t7-helpers.js';

import Calendar from '../pages/calendar.f7.html';
import CalendarHolidays from '../pages/calendar-holidays.f7.html';
import CalendarFasting from '../pages/calendar-fasting.f7.html';

import Days from '../pages/days.f7.html';
import DayInstructions from '../pages/day-instructions.f7.html';
import DayThoughts from'../pages/day-thoughts.f7.html';
import DayReaders from '../pages/day-readers.f7.html';
import DayPrayers from '../pages/day-prayers.f7.html';

import Index from '../pages/index.f7.html';

import Favorites from '../pages/favorites.f7.html';

import Saints from '../pages/saints.f7.html';
import SaintLives from '../pages/saint-lives.f7.html';

import Search from '../pages/search.f7.html';

import Settings from '../pages/settings.f7.html';
import SettingsFonts from '../pages/settings-fonts.f7.html';

import Prayers from '../pages/prayers.f7.html';
import PrayersText from '../pages/prayers-text.f7.html';

import Rites from '../pages/rites.f7.html';
import RitesName from '../pages/rites-name.f7.html';
import RitesStatus from '../pages/rites-status.f7.html';

import NotFound from '../pages/404.f7.html';

export default [
	{
		path: '/',
		component: Index
	},
	{
		path: '/calendar',
		component: Calendar,
		beforeEnter: requireData('calendar'),
		routes: [
			{
				path: 'holidays',
				component: CalendarHolidays
			},
			{
				path: 'fasting',
				component: CalendarFasting
			}
		]
	},
	{
		path: '/days/:id',
		routes: [
			{
				path: 'instructions',
				component: DayInstructions
			},
			{
				path: 'thoughts',
				component: DayThoughts
			},
			{
				path: 'readers/:readerId',
				component: DayReaders
			},
			{
				path: 'prayers/:prayerId',
				component: DayPrayers
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
						action: routeTo.query.action,
						actionId: routeTo.query.actionId
					}
				});
			} catch (ex) {
				reject();
			}
		}
	},
	{
		path: '/saints/:saintId',
		routes: [
			{
				path: 'lives',
				//component: SaintLives,
				async(routeTo, routeFrom, resolve, reject) {
					resolve({component: SaintLives}, {context: routeFrom.context});
				}
			},
		],
		async async(routeTo, routeFrom, resolve, reject) {
			let app = this.app;
			let id = routeTo.params.saintId;

			try {
				let saint = await app.methods.load('saint', id);
				resolve({component: Saints}, {context: {saint}});
			} catch (ex) {
				reject();
			}
		},
		beforeEnter: requireData('prayers')
	},
	{
		path: '/rites',
		component: Rites,
		beforeEnter: requireData(['ritesConfig','valaamGid'])
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
				let data = await Request.promise.json(
					`https://valaam.ru/phonegap/rites/${routeTo.query.id}`
				);
				resolve({component: RitesStatus}, {context: data});
			} catch (ex) {
				app.methods.showLoadError();
				reject();
			} finally {
				app.preloader.hide();
			}
		},
		beforeEnter: requireData('ritesConfig')
	},
	{
		path: '/prayers/:sectionId',
		component: Prayers,
		beforeEnter: requireData('prayers')
	},
	{
		path: '/prayers/text/:prayerId',
		async async(routeTo, routeFrom, resolve, reject) {
			let app = this.app;
			let id = routeTo.params.prayerId;

			try {
				let prayer = await app.methods.load('prayer', id);
				resolve({component: PrayersText}, {context: {prayer}});
			} catch (ex) {
				reject();
			}
		},
		beforeEnter: requireData('prayers')
	},
	{
		path: '/search',
		popup: {
			component: Search
		}
	},
	{
		path: '/favorites',
		popup: {
			component: Favorites
		}
	},
	{
		path: '/settings',
		component: Settings
	},
	{
		path: '/settings/fonts',
		component: SettingsFonts
	},
	// Default route (404 page). MUST BE THE LAST
	{
		path: '(.*)',
		component: NotFound
	}
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
			await Promise.all(params.map((source) => app.dataManager.get(source)));
			resolve();
		} catch(ex) {
			app.methods.showLoadError();
			reject();
		} finally {
			app.preloader.hide();
		}
	};
}
