import {
	format as dateFormat,
	parse as dateParse,
	startOfWeek as dateStartOfWeek,
	endOfWeek as dateEndOfWeek,
	getUnixTime
} from 'date-fns';
import { ru } from 'date-fns/locale';
import dataManager from '../data/manager.js';

let app, monthNames;

function init(appInstance) {
	app = appInstance;
}

function getEaster(year) {
	let [date] = Object
		.entries(dataManager.cache.calendar)
		.find(([date, desc]) => date.startsWith(year) && desc === "e") || [];

	return parse(date);
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
