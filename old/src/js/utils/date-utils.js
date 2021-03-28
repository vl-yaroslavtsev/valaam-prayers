import {
	format as dateFormat,
	parse as dateParse,
	startOfWeek as dateStartOfWeek,
	endOfWeek as dateEndOfWeek,
	getUnixTime
} from 'date-fns';
import { ru } from 'date-fns/locale';

let app, monthNames;

const EASTER = {
	'2018': '0408',
	'2019': '0428',
	'2020': '0419',
	'2021': '0502',
	'2022': '0424',
	'2023': '0416',
	'2024': '0505',
	'2025': '0420',
	'2026': '0412',
	'2027': '0502',
	'2028': '0416',
	'2029': '0408',
	'2030': '0428',
};

function init(appInstance) {
	app = appInstance;
}

function getEaster(year) {
	return parse(year + EASTER[year]);
}

function parse(str, format = 'yyyyMMdd') {
	return dateParse(str, format, new Date());
}

function format(date, str = 'yyyyMMdd') {
	return dateFormat(date, str, {locale: ru});
}

function startOfWeek(date) {
	return dateStartOfWeek(date, {locale: ru});
}

function endOfWeek(date) {
	return dateEndOfWeek(date, {locale: ru});
}

function months() {
	if (monthNames)
		return monthNames;

	monthNames = [];
	for (let i = 0; i < 12; i++) {
  	monthNames.push( ru.localize.month(i) );
	}

	return monthNames;
}

function weekdaysMin() {
	let weekdays = [];
	for (let i = 0; i < 7; i++) {
  	weekdays.push( ru.localize.day(i, { width: 'short' }) );
	}

	return weekdays;
}

function unixNow() {
	return getUnixTime(new Date());
}

export {
	set,
	addDays,
	subDays,
	addYears,
	startOfYear,
	endOfYear,
	isLeapYear,
	getUnixTime
} from 'date-fns';

export {
	init,
	getEaster,
	parse,
	format,
	startOfWeek,
	endOfWeek,
	months,
	weekdaysMin,
	unixNow
};
