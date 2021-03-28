/**
 * Загружает данные для оффлайн версии
 */
import {
	format,
	parse,
	startOfYear,
	endOfYear,
	getUnixTime
} from '../utils/date-utils.js';

import { bytesToSize } from '../utils/utils.js';

import StateStore from '../state-store.js';
import db from '../data/db.js';
import downloadItemsList from './items.js';

const BASE_URL = 'https://valaam.ru';
const API_URL = 'https://valaam.ru/phonegap/';

let manager;

/**
 * Период обновления данных
 */
const REFRESH_PERIOD = 24 * 3600 * 1000;

/**
 * Минимально доступное пространство для загрузки данных
 */
const MIN_STORAGE_AVAILABLE = 5 * 1024 * 1024;

let app;
let downloadItems = {};

function init(appInstance) {
	app = appInstance;

	//window.db = db;

	manager = new StateStore({id: 'download-manager'});

	registerSources();
	continueDownload();
	refreshAll();
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
	await manager.statePromise;

	if (new Date() - manager.state.refreshDate < REFRESH_PERIOD) {
		return;
	}

	await Promise.all(
		Object.values(downloadItems).map(item => item.refresh())
	);

	manager.setState({
		'refreshDate': new Date()
	});
}

/**
 * Получаем количество доступного и использованного пространства для хранения данных
 * @return {Promise}
 */
async function getQuota() {
	if ('storage' in navigator && 'estimate' in navigator.storage) {
		let {usage, quota} = await navigator.storage.estimate();
		return {
			usage,
			free: quota - usage,
			quota
		};
	}

	if ('webkitTemporaryStorage' in navigator) {
		return new Promise(function(resolve, reject) {
			navigator.webkitTemporaryStorage.queryUsageAndQuota (
				(usage, quota) => {
					resolve({
						usage,
						free: quota - usage,
						quota
					});
				},
				function(ex) {reject(ex);}
			);
		});
	}

	return {
		usage: 0,
		free:  Infinity,
		quota: Infinity
	};
}

function registerSources() {
	downloadItemsList().forEach(item => {
			downloadItems[item.id] = item;
	});
}

/**
 * Тестируем фичи клиента.
 */
async function testFitures() {
	let msg = 'Версия: ' + app.version + '<br>'; // sdfas

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
		msg += 'indexedDB: нет<br>';
	}

	if ('serviceWorker' in navigator && 'BackgroundFetchManager' in window) {
		msg += 'BackgroundFetch: да<br>';
	} else {
		msg += 'BackgroundFetch: нет<br>';
	}

	msg = msg + 'UA: ' + navigator.userAgent + '<br>';


	let quota = await getQuota();
	msg = msg + `
	Использовано:
		${bytesToSize(quota.usage, {wrapDigit:false})} из
		${bytesToSize(quota.quota, {wrapDigit:false})}<br>
	`;

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

/**
 * Достаточно ли места для загруки данных
 * @param  {string|object}  id Элемент для загрузки
 * @return {Boolean}    [description]
 */
async function isEnoughQuota(item) {
	item = typeof item === 'string' ? get(item) : item;
	let quota = await getQuota();
	return item.state.size + MIN_STORAGE_AVAILABLE < quota.free;
}


export default {
	init,
	refreshAll,
	get,
	getLoading,
	testFitures,
	isEnoughQuota
};
