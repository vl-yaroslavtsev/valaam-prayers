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

import db from '../data/db.js';
import downloadItemsList from './items.js';

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
let downloadItems = {};
let manager = new Framework7.Events();

function init(appInstance) {
	app = appInstance;

	window['dm'] = manager;
	window['db'] = db;

	registerSources();
	continueDownload();
}

async function continueDownload() {
	let downloadItem = await getLoading();
	if (downloadItem) {
		downloadItem.download();
	}
}

function get(id) {
	return downloadItems[id];
}

async function getLoading() {
	let items = Object.values(downloadItems);
	await Promise.all(
		items.map(item => item.statePromise)
	);

	return items.find(({state}) => state.status === 'loading');
}

async function refreshAll() {
	await Promise.all(
		Object.values(downloadItems).map(item => item.refresh())
	);
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

function registerSources() {
	downloadItemsList.forEach(item => {
			downloadItems[item.id] = item;

			if (item.master) {
				let masterId = item.master;
				let master = downloadItemsList.find(({id}) => id === masterId);

				master.on('state:changed', item.onMasterStateChanged.bind(item));
				master.on('data:saved', item.onMasterSaved.bind(item));
				master.on('data:deleted', item.onMasterDeleted.bind(item));
			}
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
manager.refreshAll = refreshAll;
manager.get = get;
manager.getLoading = getLoading;
manager.testFitures = testFitures;


export default manager;
