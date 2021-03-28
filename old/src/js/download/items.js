/**
 * Группы источников данных для загрузки
 */
import {
	format,
	addDays,
	addYears,
	startOfYear,
	endOfYear,
	parse,
} from '../utils/date-utils.js';

import db from '../data/db.js';
import JsonDownloadItem from './json-item.js';
import IconDownloadItem from './icon-item.js';
import {
	Calendar,
	Prayers,
	DaysList,
	DaysIcons,
	PrayersList,
	PrayersIcons,
	SaintsList,
	SaintsIcons
} from './sources';

const API_URL = 'https://valaam.ru/phonegap/';

export default function getList() {
	return [
		new JsonDownloadItem({
			id: 'calendar', // Календарь: святые + дни календаря
			title: 'Православный календарь ' + format(new Date, 'yyyy'),
			row_size: 59.6 * 1024,
			sources: [
				new Calendar(),
				new Prayers(),
				new DaysList({
					from_date: format(startOfYear(new Date)),
					to_date:  format(endOfYear(new Date)) // Текущий год
				})
			]
		}),
		new JsonDownloadItem({
			id: 'calendar_next', // Календарь на следующий год
			title: 'Православный календарь ' + format(addYears(new Date, 1), 'yyyy'),
			row_size: 59.6 * 1024,
			sources: [
				new Calendar(),
				new DaysList({
					from_date: format(startOfYear(addYears(new Date, 1))),
					to_date:  format(endOfYear(addYears(new Date, 1))) // Следующий год
				})
			]
		}),
		new JsonDownloadItem({
			id: 'saints', // Святые
			title: 'Святые',
			row_size: 14.33 * 1024,
			sources: [
				new Calendar(),
				new SaintsList()
			]
		}),
		new JsonDownloadItem({
			id: 'liturgical_books',// Богослужебные книги
			title: 'Богослужебные книги',
			row_size: 63.5 * 1024,
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
			row_size: 35.4 * 1024,
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
			row_size: 17.64 * 1024,
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
			sources: [
				new DaysIcons({
					from_date: format(startOfYear(new Date)),
					to_date:  format(endOfYear(new Date)) // Текущий год
				})
			]
		}),
		new IconDownloadItem({
			id: 'calendar_next_icons', // Иконы календаря
			title: 'Иконы календаря ' + format(addYears(new Date, 1), 'yyyy'),
			sources: [
				new DaysIcons({
					from_date: format(startOfYear(addYears(new Date, 1))),
					to_date:  format(endOfYear(addYears(new Date, 1))) // Следующий год
				})
			]
		}),
		new IconDownloadItem({
			id: 'saints_icons', // Иконы календаря
			title: 'Иконы святых',
			sources: [
				new SaintsIcons()
			]
		}),
		new IconDownloadItem({
			id: 'prayers_icons',
			title: 'Картинки молитвослова',
			sources: [
				new PrayersIcons()
			]
		})
	];
}
