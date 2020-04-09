import {
	format,
	parse,
	startOfYear,
	endOfYear,
	getUnixTime
} from '../utils/date-utils.js';

import db from '../data/db.js';
import DownloadSourceGroup from './source-group.js';

const API_URL = 'https://valaam.ru/phonegap/';

function getPeriod(type = 'year') {
	switch (type) {
		case 'year':
		return {
			start: startOfYear(new Date()),
			end: endOfYear(new Date())
		};

		default:
		return null;
	}
}

class Calendar {
	constructor() {
		this.url = `${API_URL}days/calendar/`;
		this.params = {
			type: 'json'
		};
	}

	async save(data) {
		await db.collections.put(data, 'calendar');
	}
}

class Prayers {
	constructor(params = {}) {
		this.url = `${API_URL}prayers/`;
		this.params = Object.assign({type: 'json'}, params);
	}

	async save(data) {
		await db.collections.put(data, 'prayers');
	}
}

class SaintsList {
	constructor(params = {}) {
		this.url = `${API_URL}saints/list/`;
		this.urlCount = `${API_URL}saints/count/`;
		this.params = Object.assign(
			{
				page_size: 100
			},
			params
		);
		this.paging = true;
	}

	async save(data) {
		await db.saints.putAll(data.data);
	}
}

class DaysList {
	constructor(params = {}) {
		this.url = `${API_URL}days/list/`;
		this.urlCount = `${API_URL}days/count/`;
		this.params = Object.assign(
			{
				page_size: 100
			},
			params
		);
	}

	async save(data) {
		await db.days.putAll(data.data);
	}
}

class PrayersList {
	constructor(params = {}) {
		this.url = `${API_URL}prayers/list/`;
		this.urlCount = `${API_URL}prayers/count/`;
		this.params = Object.assign(
			{
				page_size: 100
			},
			params
		);
	}

	async save(data) {
		await db.prayers.putAll(data.data);
	}
}

export default [
	new DownloadSourceGroup({
		id: 'calendar', // Календарь: святые + дни календаря
		title: 'Православный календарь ' + format(new Date, 'yyyy'),
		row_size: 16.3 * 1024,
		sources: [
			new Calendar(),
			new SaintsList(),
			new DaysList({
				from_date: format(getPeriod('year').start),
				to_date:  format(getPeriod('year').end) // Текущий год
			})
		]
	}),
	new DownloadSourceGroup({
		id: 'liturgical_books',// Богослужебные книги
		title: 'Богослужебные книги',
		row_size: 43.18 * 1024,
		sources: [
			new Prayers(),
			new PrayersList({
				section_id: 937,
			})
		]
	}),
	new DownloadSourceGroup({
		id: 'spiritual_books', // Духовная литература
		title: 'Духовная литература',
		row_size: 33.08 * 1024,
		sources: [
			new Prayers(),
			new PrayersList({
				section_id: 976,
			})
		]
	}),
	new DownloadSourceGroup({
		id: 'prayers', // Молитвослов и Библия
		title: 'Молитвослов',
		row_size: 16.22 * 1024,
		sources: [
			new Prayers(),
			new PrayersList({
				section_id: 842, // Полный молитвослов
			}),
			new PrayersList({
				section_id: 1736,  // Валаам
			})
		]
	})
];

//'icons': ['saints', 'calendar']
