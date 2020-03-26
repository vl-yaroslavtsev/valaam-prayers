/**
 * Загружает данные для оффлайн версии
 */
import {
	format,
	parse,
	startOfYear,
	endOfYear,
	getUnixTime
} from './date-utils.js';

import db from './data/db.js';
import Framework7 from 'framework7';


const BASE_URL = 'https://valaam.ru';
const API_URL = 'https://valaam.ru/phonegap/';

/**
 * Размер элемента данных в килобайтах (в среднем)
 */
const DATA_SIZE_KB = {
	common: 10.8,
	prayers: 10.8,
	calendar: 8.2,
	spiritual_books: 17.2,
	liturgical_books: 22
};

/**
 * Размер картинки в килобайтах (в среднем)
 */
const IMAGE_SIZE_KB = 61.9;

/**
 * Период автообновления данных
 */
const RELOAD_PERIOD = 24 * 3600 * 1000;

/**
 * Минимально доступное пространство для загрузки данных
 */
const MIN_STORAGE_AVAILABLE_MB = 5;

let app;
let _state;
let controller;
let retryCount = 0;
let manager = new Framework7.Events();

function init(appInstance) {
	app = appInstance;
	
	// Состояние по умолчанию
	state(app.methods.storageGet('load-manager') || {
		status: 'idle'
	});
	
	// Продолжаем прерванную загрузку
	if (_state.status === 'loading') {
		load(_state.type, true);
	}
}

/**
 * Получаем или устанавливаем состояние
 * @param {Object | undefined} value
 */
function state(value) {
	if (!value) {
		return _state;
	}
	
	let state = app.methods.storageGet('load-manager') || {};	
	_state = Object.assign(state, value);
	app.methods.storageSet('load-manager', _state);
	//console.log('state: ', _state);
}

function getState() {
	let res = {
		status: _state.status
	};
	
	if (_state.status === 'loading') {
		Object.assign(res, {
			type: _state.type,
			signal: controller.signal,
			progress: _state.progress
		});
	}
	
	return res;
}

/**
 * Старт загрузки определенного типа
 */
async function load(type, force) {
	if (state().status == 'loading' && !force) {
		app.dialog.alert(
			`Пожалуйста, дождитесь окончания загрузки`,
			'Оффлайн версия'
		);
		return false;
	}
	
	if (!navigator.onLine && !force) {
		app.dialog.alert(
			`Скачивание невозможно.<br>
			 Вы не подключениы к сети Интернет`,
			'Оффлайн версия'
		);
		return false;
	}	
	
	
	controller = new AbortController();
	
	let source = getSource(type);
	let loadedTs = getUnixTime(await db.stat.get(`${type}-loaded-date`) || 0);
	let signal = controller.signal;
	
	//controller.abort(); // отмена!
	//alert(controller.signal.aborted); // true
	
	
	let progress = ({sourceIndex, sourceCount, page, pageCount, step}) => {
		let pageProgress = 100 * (2 * page + step - 1 ) / (2 * pageCount);
		if (!pageCount) pageProgress = 100;
		
		let progress = Math.floor((100 * sourceIndex + pageProgress) / sourceCount);
		
		state({
			progress
		});
		
		return progress;
	}
	
	let processData = async (data, {dbStore, sourceIndex, sourceCount, page, pageCount}) => {		
		manager.emit(
			"progress", 
			progress({
				sourceIndex, 
				sourceCount, 
				page, 
				pageCount, 
				step: 0
			})
		);
		await dbStore.putAll(data);		
		manager.emit(
			"progress", 
			progress({
				sourceIndex, 
				sourceCount, 
				page, 
				pageCount, 
				step: 1
			})
		);
	};
	
	state({
		status: 'loading',
		type
	});
	
	try {	
		let sourceIndex = _state.sourceIndex || 0, sourceCount = source.length;
		for (;sourceIndex < sourceCount; sourceIndex++) {
			let {url, store, params = {}} = source[sourceIndex];
			if (loadedTs) {
				params.from_ts = loadedTs;
			}

			let dbStore = db[store];
			
			state({
				sourceIndex
			});
			
			await pageFetchJson(
				url, 
				params, 
				async (data, page, pageCount) => {
					await processData(data, {dbStore, sourceIndex, sourceCount, page, pageCount})
				}, 
				signal
			);
		}	
	} catch(err) {
		// Нет сети интернет
		if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
			// Пробуем еще раз
			if (!signal.aborted && retryCount < 30 * 30) {
				setTimeout(() => {
					retryCount++;
					load(type, true);
				}, 2000);
			}
			
			throw err;
		}
		
		state({
			status: 'idle',
			type: null,
			sourceIndex: null,
			page: null,
			progress: null
		});
		
		console.log(`[load-manager] load("${type}"): error [${err.name}]: ${err.message}`);		
		throw err;
	}
	
	await db.stat.put(new Date(), `${type}-loaded-date`);
	
	state({
		status: 'idle',
		type: null,
		sourceIndex: null,
		page: null,
		progress: null
	});
	return true;
}

function cancel() {
	if (!controller) {
		return;
	}
	controller.abort();
}

/**
 * Проверка обновлений определенного типа
 */
async function check(type) {
	
	if (_state.status != 'idle') {
		return false;
	}
	
	let source = getSource(type);
	let loadedTs = getUnixTime(await db.stat.get(`${type}-loaded-date`) || 0);
	let recordCount = 0;
	
	let	defParams = {
		page_size: 1,
		subsections: 1,
		nav_only: 1,
		from_ts: loadedTs
	}
	
	try {
		let sourceIndex = _state.sourceIndex || 0, sourceCount = source.length;
		for (;sourceIndex < sourceCount; sourceIndex++) {
			let {url, store, params = {}} = source[sourceIndex];
			params = Object.assign({}, defParams, params);
			
			let {nav} = await fetchJson(
				url, 
				params
			);
			
			recordCount += nav.record_count;
		}
	} catch(err) {
		console.log(`[load-manager] load("${type}"): error [${err.name}]: ${err.message}`);		
		throw err;
	}
	
	return {
		type,
		status: !loadedTs ? 'new' : (recordCount ? 'update' : 'fresh'),
		count: recordCount,
		size: recordCount * DATA_SIZE_KB[type]
	};
}

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
 * Получаем данные из сети постранично
 * @param {string}   url Урл для запроса данных
 * @param {Object}   [params] Параметры запроса данных
 * @param {Function} [process] Обработка данных
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Generator} Должен возвращать данные по одному элементу
 */
async function pageFetchJson(url, params = {}, process, abortSignal) {
	let	defParams = {
		page_size: 100,
		subsections: 1
	}
	params = Object.assign({}, defParams, params);
		
	for (let page = _state.page || 1, pageCount = page; page <= pageCount; page++) {
		params['PAGEN_1'] = page;
		
		state({
			page
		});
		
		let {data, nav} = await fetchJson(url, params, abortSignal);
		pageCount = nav.page_count; 
		
		if (process) {
			await process(data, page, pageCount);
		}			
	}
	
	state({
		page: null
	});	
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchJson(url, params = {}, abortSignal) {
	let urlParams = objToUrl(params);
	if (urlParams) urlParams = `?${urlParams}`;

	let response = await fetch(url + urlParams, {
		signal: abortSignal
	});
	if (!response.ok) {
		throw new Error(`Bad fetch response. Status: ${response.status}`);
	}

	return await response.json();
}

/**
 * Получаем количество доступного и использованного пространства для хранения данных
 * @return {Promise}
 */
async function getQuota() {
	if ('storage' in navigator && 'estimate' in navigator.storage) {
		let {usage, quota} = await navigator.storage.estimate();
		return {
			usageMb: Math.round(usage / (1024 * 1024)),
			quotaMb: Math.round(quota / (1024 * 1024))
		};
	}

	if ('webkitTemporaryStorage' in navigator) {
		return new Promise(function(resolve, reject) {
			navigator.webkitTemporaryStorage.queryUsageAndQuota (
				(usage, quota) => {
					resolve({
						usageMb: Math.round((usage / (1024 * 1024))),
						quotaMb: Math.round((quota / (1024 * 1024)))
					});
				},
				function(ex) {reject(ex);}
			);
		});
	}

	return {
		usageMb: 0,
		quotaMb: Infinity
	};
}

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

/**
 * Получаем источники данных для обновления
 * @param  {string} source Тип обновления
 * @return {Array}
 */
function getSource(source) {
	let sources = {
		'calendar': [ // Календарь: святые + дни календаря
			{
				store: 'saints',
				url:  `${API_URL}saints/list/`,
				params: {}
			},
			{
				store: 'days',
				url:  `${API_URL}days/list/`,
				params: {
					from_date: format(getPeriod('year').start),
					to_date:  format(getPeriod('year').end) // Текущий год
				}
			}
		],
		'liturgical_books': [ // Богослужебные книги
			{
				store: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 937, 
				}
			},
		],
		'spiritual_books': [ // Духовная литература
			{
				store: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 976, 
				}
			},
		],
		'prayers': [ // Молитвослов и Библия
			{
				store: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 843, // Молитвослов
					//section_id: 842, // Полный молитвослов
					//except_section: 937, // Без Богослужебных книг
					
				}
			},
			{
				store: 'prayers',
				url:  `${API_URL}prayers/list/`,
				params: {
					section_id: 1736,  // Валаам
				}
			},
		],
		'icons': ['saints', 'calendar']	
	};

	if (source) {
		return sources[source];
	}
	return sources;
}

/**
 * Тестируем фичи клиента.
 */
async function testFitures() {
	let msg = ''; // sdfas

	if (navigator.serviceWorker) {
		//navigator.serviceWorker.register('./sw-phonegap.js');
		msg += 'ServiceWorker: да<br>';
	} else {
		msg += 'ServiceWorker: нет<br>';
	}

	if ('onLine' in navigator) {
		msg += 'navigator.onLine: да, ' + navigator.onLine + '<br>';
	} else {
		msg += 'navigator.onLine: нет<br>';
	}

	if (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB) {
		msg += 'indexedDB: да<br>';
	} else {
		msg += 'indexedDB: Нет<br>';
	}

	msg = msg + 'UA: ' + navigator.userAgent + '<br>';


	let quota = await getQuota();
	msg = msg + `Использовано: ${quota.usageMb} из ${quota.quotaMb} МБ<br>`;

	await (async function _testBlobImg() {
		let blob, result;
		let src2 = 'https://valaam.ru/upload/iblock/59f/59fcea0d296ab35820997e98bed8c3bd.jpg';
		result = '';
		try {
			let response = await fetch(src2);
			if (!response.ok) throw new Error('Bad fetch response');
			blob = await response.blob();
			await db.images.put({
				url: src2, 
				image: blob
			});
			result = 'ok';
		} catch(err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `икона сохранена в БД: ${result}<br>`;

		result = '';
		blob = null;
		let blobUrl;
		try {
			({image: blob} = await db.images.get(src2));
	 		if (!blob) {
				throw new Error('no blob found');
			}
			blobUrl = URL.createObjectURL(blob);
			result = 'ok';
		} catch (err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `икона из БД: ${result} <img height="30px" src="${blobUrl}"><br>`;
	}) ();

	app.dialog.alert(msg);
}

manager.init = init; 
manager.load = load;
manager.cancel = cancel;
manager.check = check;
manager.state = getState;
manager.testFitures = testFitures;
	
export default manager;
