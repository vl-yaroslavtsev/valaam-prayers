/**
 * Worker. Управляет обновлением оффлайн данных.
 */
import {
	format,
	parse,
	startOfYear,
	endOfYear,
	startOfWeek,
	endOfWeek,
	getUnixTime,
	unixNow
} from './date-utils.js';

import db from './data/db.js';

const BASE_URL = 'https://valaam.ru';
const API_URL = 'https://valaam.ru/phonegap/';

const config = {
	db_name: 'valaam-phonegap',
	reload_period: 24 * 3600,
	data_row_size_kb: 10.8, // Размер строчки данных в БД в килобайтах (в среднем)
	image_size_kb: 61.9 // Размер картинки в килобайтах (в среднем)
};

let isUpdating = false;

self.addEventListener('message', async (event) => {
	console.log('[reloader.wkr] Handling message event:', event.data);
	let {action, useImages} = event.data;

	if (action == 'test') {
		self.postMessage({msg: 'w-reloader test 134'});
	}

	if (action == 'base') {
		let imageCb = function (src) {
			self.postMessage({
				type: 'image',
				src: src
			});
		};
		let result = await reloadData('base', {imageCb, useImages});
		self.postMessage(result);
	}

	if (action == 'full') {
		let progressCb = function (progress) {
			self.postMessage({
				type: 'progress',
				progress: progress
			});
		};
		let imageCb = (src) => {
			self.postMessage({
				type: 'image',
				src: src
			});
		};
		let result = await reloadData('full', {progressCb, imageCb, useImages});
		self.postMessage(result);
	}

	if (action == 'check') {
		let result = await checkData('full');
		self.postMessage(result);
	}

	if (action == 'force-check') {
		let result = await checkData('full', true);
		self.postMessage(result);
	}
});

/**
 * Объект с параметрами преобразуем в урл параметры
 * @param {Object} obj Объект с параметрами
 * @return {string}
 */
function objToUrl(obj) {
	return Object.keys(obj).map((key) => {
		return key + '=' + encodeURIComponent(obj[key]);
	}).join('&');
}

/**
 * Сохраняем изображение в базу
 * @param  {string} src
 * @return {Promise}
 */
async function saveImage(src) {
	try {
		let response = await fetch(BASE_URL + src);
		if (!response.ok) return;
		let blob = await response.blob();
		await idbImages.setItem(src, blob);
	} catch(ex) {

	}
}

function getPeriod(type = 'week') {
	switch (type) {
		case 'week':
		return {
			start: startOfWeek(new Date()),
			end: endOfWeek(new Date())
		};

		case 'year':
		return {
			start: startOfYear(new Date()),
			end: endOfYear(new Date())
		};

		default:
		return null;
	}
}

/**
 * Получаем данные из сети в json
 * @param {string} url Урл для запроса данных
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchJson(url, params = {}, defParams = {}) {
	let urlParams = objToUrl(Object.assign({}, defParams, params));
	if (urlParams) urlParams = `?${urlParams}`;

	let response = await fetch(url + urlParams);
	if (!response.ok) {
		throw new Error(`Bad fetch response status: ${response.status}`);
	}

	return await response.json();
}

/**
 * Удаляем старые данные из БД
 */
async function clearOldData() {
	// Удаляем прошлогодние записи
	let keys = await idbDays.keys();
	keys
		.filter((key) => parse(key) < getPeriod('year').start)
		.forEach((key) => idbDays.removeItem(key));
}

/**
 * Проверяем есть ли обновления данных
 * @param {string} [type='full'] Тип проверки
 * @param {boolean} проверяем насильно на сервере
 * return {Promise}
 */
async function checkData(type = 'full' , force = false) {
	let fromTs = 0;
	let	defParams = {
		page_size: 1,
		section_id: 0,
		subsections: 1,
		from_ts: 0
	};

	if (!force) {
		let checkTs = await idbStat.getItem(`last_check_${type}_ts`);
		if ((unixNow() - checkTs < config.reload_period)) {
			return {status: 'data-fresh'};
		}
	}

	let reloadTs = await idbStat.getItem(`last_reload_${type}_ts`);
	if (reloadTs) {
		fromTs = reloadTs;
	}

	let sources = [];
	let count = {
		total: 0
	}; // Количество строк для обновления

	if ( type === 'full' ) {
		sources = [
			{
				name: 'prayers',
				url: `${API_URL}prayers/list/`
			},
			{
				name: 'days',
				url: `${API_URL}days/list/`,
				params: {
					from_date: format(getPeriod('year').start),
					to_date:  format(getPeriod('year').end) // Текущий год
				}
			},
			{
				name: 'saints',
				url: `${API_URL}saints/list/`
			}
		]
	}

	try {
		for (let {url, params = {}, name} of sources) {
			if (fromTs) {
				params.from_ts = fromTs;
			}

			let json = await fetchJson(url, params, defParams);
			count[name] = (count[name] || 0) + json.nav.record_count;
			count.total += count[name];
		}

		await idbStat.setItem(`last_check_${type}_ts`, unixNow());

		return {
			status: count.total > 0 ? 'need-update' : 'data-fresh',
			count: count,
			size: {
				data: count.total * config.data_row_size_kb, // Размер в килобайтах.
				image: (count.days * 2 + count.saints) *
							 config.image_size_kb // Размер в килобайтах.
			}
		};

	} catch(err) {
		if (err.message === 'data-fresh') return { status: 'data-fresh' };

		console.log(`[reloader.wkr] checkData(${type}): ошибка `, err);
		return {
			status: 'error',
			error: {
				'name': err.name,
				'message': err.message,
				'stack': err.stack
			}
		};
	}
}

/**
 * Получаем данные из сети постранично и возвращаем генератор значений.
 * @param {string}   url Урл для запроса данных
 * @param {Object}   [urlParams] Параметры запроса данных
 * @return {Generator} Должен возвращать данные по одному элементу
 */
async function* fetchResultGen(url, urlParams = {}) {
	let	defUrlParams = {
		page_size: 100,
		section_id: 0,
		subsections: 1,
		from_ts: 0
	}

	let {nav, data} = await fetchJson(url, urlParams, defUrlParams);

	yield nav;

	for (let item of data) yield item;

	for (let page = nav.page_num + 1; page <= nav.page_count; page++) {
		urlParams['PAGEN_' + nav.nav_num] = page;
		let {data} = await fetchJson(url, urlParams, defUrlParams);
		for (let item of data) 	yield item;
	}

	// for (let page = nav.page_num + 1; page <= nav.page_count; page++) {
	// 	urlParams['PAGEN_' + nav.nav_num] = page;
	// 	let promise = fetchJson(url, urlParams, defUrlParams);
	// 	for (let item of data) 	yield item;
	// 	({data} = await promise);
	// }
	//
	// for (let item of data) yield item;
}

/**
 * Обновляет данные в idb
 * @param  {string} [type='base']   Тип обновления. По умолчанию базовый
 * @param  {Object} [params] Доп. параметры
 * @param  {Function} [params.progressCb=()=>{}] Коллбэк для прогресса
 * @param  {Function} [params.imageCb=()=>{}] Коллбэк для картинок
 * @return {Promise}
 */
async function reloadData(type = 'base', {
	progressCb = () => {},
	imageCb = () => {},
	useImages = false
} = {}) {
	console.time(`[reloader.wkr] reloadData ${type}`);
	let fromTs = 0;

	if (isUpdating) throw new Error('updating');
	isUpdating = true;

	try {
		let reloadTs = await idbStat.getItem(`last_reload_${type}_ts`);
		if (reloadTs) {
			if (unixNow() - reloadTs < config.reload_period) {
				throw new Error('data-fresh');
			} else {
				fromTs = reloadTs;
			}
		}

		await clearOldData();

		let keys = await idbCollections.keys();
		if (!keys.includes('calendar')) {
			let data = await fetchJson(`${API_URL}days/calendar/`, {type: 'json'});
			await idbCollections.setItem('calendar', data);
		}

		if (!keys.includes('prayers')) {
			let data = await fetchJson(`${API_URL}prayers/`, {type: 'json'});
			await idbCollections.setItem('prayers', data);
		}

		let sources = getSources(type, fromTs);
		let sourceIndex = 0;
		for (let {url, storage, key = 'id', params = {}} of sources) {
			if (fromTs && !('from_ts' in params)) {
				params.from_ts = fromTs;
			}

			let dbStore = db[storage];

			let itemIndex = 1, itemCount = 0, itemProgress = 0;
			for await (let item of fetchResultGen(url, params)) {
				if (item.record_count !== undefined) {
					itemCount = item.record_count;
					console.log(`storage: ${storage}, itemCount: ${itemCount}, ${url}`);
					continue;
				}

				await dbStore.put(item);

				let progress = 100 * itemIndex / itemCount;
				if (progress - itemProgress >= 1) {
						itemProgress = progress;
						console.log(`storage: ${storage}, progress:`, itemProgress);
						progressCb(Math.floor((100 * sourceIndex + itemProgress) /
																	sources.length));
				}

				if (useImages) {
					if (storage === 'days') {
						//if (item.picture) imageCb(item.picture);
						//if (item.prayers.picture) imageCb(item.prayers.picture);
						if (item.picture) await saveImage(item.picture);
						if (item.prayers.picture) await saveImage(item.prayers.picture);

					} else if (storage === 'prayers' &&
										 item.picture) {
						await saveImage(item.picture);
						//imageCb(item.picture);

					} else if (storage === 'saints' &&
										 item.picture
										) {
						await saveImage(item.picture);
						//imageCb(item.picture);
					}
				}
				itemIndex++;
			}
			sourceIndex++;
		}

		await idbStat.setItem(`last_reload_${type}_ts`, unixNow());

		console.timeEnd(`[reloader.wkr] reloadData ${type}`);
		isUpdating = false;
		return {
			status: 'done'
		};
	} catch (err) {
		isUpdating = false;
		if(err.message === 'data-fresh') return { status: 'data-fresh' };

		console.log(`[reloader.wkr] reloadData(${type}): error `, err);
		return {
			status: 'error',
			error: {
				'name': err.name,
				'message': err.message,
				'stack': err.stack
			}
		};
	}
}

/**
 * Получаем источники данных для обновления
 * @param  {string} type Тип обновления
 * @return {Array}
 */
function getSources(type, fromTs) {
	let sources;

	if (type === 'base') {
		sources = [
			{
				storage: 'saints',
				url:  `${API_URL}saints/list/`,
				params: {
					from_ts: fromTs < getUnixTime(getPeriod('week').start) ? 0 : fromTs,
					from_date: format(getPeriod('week').start),
					to_date:  format(getPeriod('week').end)
				}
			},
			{
				storage: 'prayers',
				url: `${API_URL}prayers/list/`,
				params: {
					section_id: 1736 // Валаам,
				}
			},
			{
				storage: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 843, // Молитвослов (без подгрупп)
					subsections: 0
				}
			},
			{
				storage: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 835 //Начинающим
				}
			},
			{
				storage: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 1641 //Новый завет
				}
			},
			{
				storage: 'days',
				url:  `${API_URL}days/list/`,
				key: 'code',
				params: {
					from_ts: fromTs < getUnixTime(getPeriod('week').start) ? 0 : fromTs,
					from_date: format(getPeriod('week').start),
					to_date:  format(getPeriod('week').end) // Текущая неделя
				}
			}
		];

	} else if ( type === 'full' ) {
		sources = [
			{
				storage: 'saints',
				url:  `${API_URL}saints/list/`,
				params: {}
			},
			{
				storage: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {}
			},
			{
				storage: 'days',
				url:  `${API_URL}days/list/`,
				key: 'code',
				params: {
					from_date: format(getPeriod('year').start),
					to_date:  format(getPeriod('year').end) // Текущий год
				}
			},
		];
	}

	return sources;
}