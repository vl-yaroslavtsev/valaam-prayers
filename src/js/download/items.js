/**
 * Группы источников данных для загрузки
 */
import {
	format,
	parse,
} from '../utils/date-utils.js';

import db from '../data/db.js';
import JsonDownloadItem from './json-item.js';
import IconDownloadItem from './icon-item.js';
import {
	getPeriod,
	Calendar,
	Prayers,
	DaysList,
	PrayersList,
	SaintsList
} from './sources';


const API_URL = 'https://valaam.ru/phonegap/';

export default [
	new JsonDownloadItem({
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
	new JsonDownloadItem({
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
	new JsonDownloadItem({
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
	new JsonDownloadItem({
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
	}),
	new IconDownloadItem({
		id: 'calendar_icons', // Иконы календаря
		title: 'Иконы календаря ' + format(new Date, 'yyyy'),
		row_size: 61.9 * 1024,
		master: 'calendar',
	})
];

//'icons': ['saints', 'calendar']
