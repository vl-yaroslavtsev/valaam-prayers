/**
 * Источники данных для загрузки
 */

import {
	format,
	parse,
} from '../utils/date-utils.js';

import { jsonSize, isMobile } from '../utils/utils.js';

import db from '../data/db.js';

const API_URL = 'https://valaam.ru/phonegap/';

/**
 * Базовый класс для источника json
 */
class JsonSource {
	constructor(params = {}) {}

	async save(data) {
		throw new Error('JsonSource.save not implemented!');
	}

	async delete() {
	}

	async size() {
		return 0;
	}
}

class Calendar extends JsonSource {
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

	async size() {
		let value = await db.collections.get('calendar');
		return jsonSize(value);
	}
}

class Prayers extends JsonSource {
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

	async size() {
		let value = await db.collections.get('prayers');
		return jsonSize(value);
	}
}

class SaintsList extends JsonSource {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}saints/list/`;
		this.urlCount = `${API_URL}saints/count/`;
		this.params = {
			page_size: 100,
			...params
		};
	}

	async save({data}) {
		await db.saints.putAll(data);
	}

	async delete() {
		await db.saints.clear();
	}

	async size() {
		let size = 0;
		await db.saints.iterate((key, value) => {
			size += jsonSize(value);
		})
		return size;
	}
}

class DaysList extends JsonSource {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}days/list/`;
		this.urlCount = `${API_URL}days/count/`;
		this.params = {
			page_size: 100,
			...params
		};
	}

	async save({data}) {
		await db.days.putAll(data);
	}

	async delete() {
		await db.days.delete(
			IDBKeyRange.bound(this.params.from_date, this.params.to_date)
		);
	}

	async size() {
		let size = 0;
		await db.days.iterate(
			(key, value) => {
				size += jsonSize(value);
			},
			IDBKeyRange.bound(this.params.from_date, this.params.to_date)
		);
		return size;
	}
}

class PrayersList extends JsonSource {
	constructor(params = {}) {
		super();
		this.url = `${API_URL}prayers/list/`;
		this.urlCount = `${API_URL}prayers/count/`;
		this.params = {
			page_size: 100,
			...params
		}
	}

	async save({data}) {
		data.forEach(item => item.root_id = this.params.section_id); // root section
		await db.prayers.putAll(data);
	}

	async delete() {
		await db.prayers.deleteFromIndex('by-root-id', this.params.section_id);
	}

	async size() {
		let size = 0;
		await db.prayers.iterateFromIndex(
			'by-root-id',
			this.params.section_id,
			(key, value) => {
				size += jsonSize(value);
			}
		);
		return size;
	}
}

/**
 * Базовый класс для источника икон
 */
class IconsSource {
	constructor(params = {}) {
		this.id = '';
		this.url = ``;
	}

	async save(data) {
		await db.images.putAll(data);
	}

	async delete() {
		await db.images.deleteFromIndex('by-source-id', this.id);
	}

	async size() {
		let size = 0;
		await db.images.iterateFromIndex(
			'by-source-id',
			this.id,
			(key, {raw}) => size += raw.byteLength
		);
		return size;
	}
}

class SaintsIcons extends IconsSource {
	constructor(params = {}) {
		super();
		this.id = 'saints';
		this.url = `${API_URL}saints/list/`;
		this.params = {
			image_only: 1,
			image_size:  isMobile() ? 's' : 'm',
			...params
		};
	}
}

class DaysIcons extends IconsSource {
	constructor(params = {}) {
		super();
		this.id = 'days' + (params.from_date ? `-${format(parse(params.from_date), 'yyyy')}` : '');
		this.url = `${API_URL}days/list/`;
		this.params = {
			image_only: 1,
			image_size: isMobile() ? 's' : 'm',
			...params
		};
	}
}

class PrayersIcons extends IconsSource {
	constructor(params = {}) {
		super();
		this.id = 'prayers';
		this.url = `${API_URL}prayers/list/`;
		this.params = {
			image_only: 1,
			image_size: isMobile() ? 's' : 'm',
			...params
		};
	}
}

export {
	Calendar,
	Prayers,
	DaysList,
	DaysIcons,
	PrayersList,
	PrayersIcons,
	SaintsList,
	SaintsIcons
};

//'icons': ['saints', 'calendar']
