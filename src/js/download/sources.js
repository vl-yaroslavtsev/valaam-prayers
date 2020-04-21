/**
 * Источники данных для загрузки
 */

import {
	format,
	parse,
	startOfYear,
	endOfYear,
	getUnixTime
} from '../utils/date-utils.js';

import db from '../data/db.js';

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

class Source {
	constructor(params = {}) {}

	async save(data) {
		throw new Error('Source.save not implemented!');
	}

	async delete() {
	}

	async count() {
		return 0;
	}
}

class Calendar extends Source {
	constructor() {
		super();
		this.url = `${API_URL}days/calendar/`;
		this.params = {
			type: 'json'
		};
	}

	async save(data) {
		await db.collections.put(data, 'calendar');
	}
}

class Prayers extends Source {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}prayers/`;
		this.params = {
			type: 'json',
			...params
		};
	}

	async save(data) {
		await db.collections.put(data, 'prayers');
	}
}

class SaintsList extends Source {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}saints/list/`;
		this.urlCount = `${API_URL}saints/count/`;
		this.params = {
			page_size: 100,
			...params
		};
	}

	async save({data}, dowloadItemId) {
		await db.saints.putAll(data);
	}

	getImageUrls(item) {
		return [item.picture];
	}

	async delete() {
		await db.saints.clear();
	}

	async count() {
		return await db.saints.count();
	}
}

class DaysList extends Source {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}days/list/`;
		this.urlCount = `${API_URL}days/count/`;
		this.params = {
			page_size: 100,
			...params
		};
	}

	async save({data}, dowloadItemId) {
		await db.days.putAll(data);
	}

	getImageUrls(item) {
		return [item.picture, item.prayers.picture];
	}

	async delete() {
		await db.days.delete(
			IDBKeyRange.bound(this.params.from_date, this.params.to_date)
		);
	}

	async count() {
		return await db.days.count(
			IDBKeyRange.bound(this.params.from_date, this.params.to_date)
		);
	}
}

class PrayersList extends Source {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}prayers/list/`;
		this.urlCount = `${API_URL}prayers/count/`;
		this.params = {
			page_size: 100,
			...params
		}
	}

	async save({data}, dowloadItemId) {
		data.forEach(item => item.root_id = this.params.section_id);
		await db.prayers.putAll(data);
	}

	getImageUrls(item) {
		return [item.picture];
	}

	async delete(dowloadItemId) {
		await db.prayers.deleteFromIndex('by-root-id', this.params.section_id);
	}

	async count(dowloadItemId) {
		return await db.prayers.countFromIndex('by-root-id', this.params.section_id);
	}
}

export {
	getPeriod,
	Calendar,
	Prayers,
	DaysList,
	PrayersList,
	SaintsList
};

//'icons': ['saints', 'calendar']
