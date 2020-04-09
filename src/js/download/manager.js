/**
 * Загружает данные для оффлайн версии
 */

import Framework7 from 'framework7';

import {
	format,
	parse,
	startOfYear,
	endOfYear,
	getUnixTime
} from '../utils/date-utils.js';
import { bytesToSize, fetchJson } from '../utils/utils.js';

import db from '../data/db.js';
import sourceGroupsList from './sources.js';
//import BackgroundFetchTask from './bg-fetch-task.js';
import FetchTask from './fetch-task.js';

const BASE_URL = 'https://valaam.ru';
const API_URL = 'https://valaam.ru/phonegap/';


/**
 * Период автообновления данных
 */
const RELOAD_PERIOD = 24 * 3600 * 1000;

/**
 * Минимально доступное пространство для загрузки данных
 */
const MIN_STORAGE_AVAILABLE_MB = 5;

let app;
let state;
let sourceGroups = {};
let manager = new Framework7.Events();
let fetchTask;

function init(appInstance) {
	app = appInstance;

	window['dm'] = manager;

	registerSources();

	continueDownload();
}

/**
 * Старт загрузки определенного типа
 */
async function download(id = 'calendar', force) {
	let sourceGroup = sourceGroups[id];

	if (sourceGroup.state.status == 'loading' && !force) {
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

	if (!force) {
		await sourceGroup.refresh();

	}

	//console.log(sourceGroup);

	if (sourceGroup.state.status === 'fresh' && !force) {
		return console.log('У Вас самые свежие данные!');
	}

	fetchTask = new FetchTask({
		id: sourceGroup.id,
		urls: sourceGroup.urls,
		size: sourceGroup.state.size,
		save: async (data, url) => sourceGroup.save(data, url)
	});

	fetchTask.on('start', () => {
		console.log(`Прогресс загрузки начат`);
		sourceGroup.setState({
			status: 'loading'
		});
		manager.emit('download:start', {sourceGroup});
	});

	fetchTask.on('continue', () => {
		console.log(`Прогресс загрузки продолжается`);
		sourceGroup.setState({
			status: 'loading'
		});
		manager.emit('download:continue', {sourceGroup});
	});

	fetchTask.on('progress', ({progress, downloaded}) => {
		console.log(`Прогресс загрузки ${progress}% ${bytesToSize(downloaded)}`);
		sourceGroup.setState({
			progress,
			downloaded
		});
		manager.emit('download:progress', {progress, downloaded, sourceGroup});
	});

	fetchTask.on('done', () => {
		console.log(`Успешно загружено и сохранено`);
		sourceGroup.setState({
			status: 'fresh',
			progress: 0,
			size: 0,
			loadedSize: sourceGroup.state.size,
			loadedDate: new Date()
		});
		fetchTask = null;
		manager.emit('download:done', {sourceGroup});
	});

	// QuotaExceededError, AbortError
	fetchTask.on('error', ({name, message}) => {
		console.log(`Ошибка: [${name}]: ${message}`);

		if (name === 'AbortError') {
			sourceGroup.setState({
				status: 'need-update',
			});

		} else {
			sourceGroup.setState({
				status: 'error',
				progress: 0,
				size: 0,
			});
		}

		fetchTask = null;
		manager.emit('download:error', {name, message, sourceGroup});
	});

	fetchTask.fetch();

	return true;
}

async function continueDownload() {
	let groups = Object.values(sourceGroups);
	await Promise.all(
		groups.map(group => group.statePromise)
	);
	let sourceGroup = groups.find(({state}) => state.status === 'loading');

	if (sourceGroup) {
		download(sourceGroup.id, true);
	}
}

function get(id) {
	return sourceGroups[id];
}

async function refresh(id = 'calendar') {
	let sourceGroup = sourceGroups[id];

	await sourceGroup.refresh();
}

async function refreshAll() {
	await Promise.all(
		Object.values(sourceGroups).map(sourceGroup => sourceGroup.refresh())
	);
}

async function cancel(id = 'calendar') {
	let sourceGroup = sourceGroups[id];

	if (!fetchTask || sourceGroup.state.status != 'loading') {
		return;
	}

	await fetchTask.cancel();
};


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

function registerSources() {
	sourceGroupsList.forEach(item => {
			sourceGroups[item.id] = item;
	});
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

	if ('serviceWorker' in navigator && 'BackgroundFetchManager' in window) {
		msg += 'BackgroundFetch: да<br>';
	} else {
		msg += 'BackgroundFetch: нет<br>';
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
manager.download = download;
manager.cancel = cancel;
manager.refresh = refresh;
manager.refreshAll = refreshAll;
manager.get = get;
manager.testFitures = testFitures;


export default manager;
