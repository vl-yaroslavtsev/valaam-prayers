import {isFunction} from 'lodash-es';
import localforage from 'localforage/src/localforage.js';

const API_URL = 'https://valaam.ru/phonegap/';
const DB_NAME = 'valaam-phonegap';
const STORAGES = ['collections', 'saints', 'days', 'prayers', 'stat', 'images'];

/**
 * Источники данных
 * @type {Array<DataSource>}
 */
let sources = {};

class DataManager {
	/**
	 * Доблавляем источник данных
	 * @param {DataSource} source Источник данных
	 */
	static addSource(source) {
		sources[source.id] = source;
	}

	constructor() {
		this._handlerPromise = {};
		this.cache = {};

		this._initCache();
		this._createDb();

		this._preload();
	}

	/**
	 * Получаем данные из источника данных
	 * @param  {string} sourceId Источник данных
	 * @param  {*}      args     Доп. параметры
	 * @return {Promise}
	 */
	async get(sourceId, ...args) {
		let source = sources[sourceId], result;
		if (!source) {
			throw new Error(`[DataManager] get('${sourceId}'):
				Неверно указан источник данных`);
		}

		let {url, storage, key, handler, memoryCache} = source;
		let isCollection = isFunction(key);

		url = isFunction(url) ? url(...args) : url;
		key = isFunction(key) ? key(...args) : key;

		if (this._handlerPromise[sourceId])
			return this._handlerPromise[sourceId];

		if (memoryCache && this.cache[sourceId]) {
			if (!isCollection) {
				return this.cache[sourceId];
			} else if (this.cache[sourceId][key]) {
				return this.cache[sourceId][key];
			}
		}

		if (typeof handler == 'string') {
			handler = () => {
				return this[source.handler].call(this, {
					url,
					storage,
					key,
					source: sourceId
				});
			};
		}

		try {
			this._handlerPromise[sourceId] = handler.call(null, ...args);
			result = await this._handlerPromise[sourceId];
			if (memoryCache) {
				if (!isCollection) {
					this.cache[sourceId] = result;
				} else {
					this.cache[sourceId][key] = result;
				}
			}
			return result;
		} catch(err) {
			console.error(err);
			throw err;
		} finally {
			delete this._handlerPromise[sourceId];
		}
	}

	/**
	 * Получаем данные сначала локально, если нет - из сети
	 * @param  {string}  url     Урл данных
	 * @param  {string}  storage    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @param  {string}  source    Id источника данных
	 * @return {Promise}
	 */
	async localFirst({url, storage, key, source}) {
		await this.idb.ready;
		let idbStore = this.idb[storage];
		let val = await idbStore.getItem(key);

		if (val !== null) {
			return val;
		}

		return await this._fetchAndSave({url, idbStore, key});
	}

	/**
	 * Получаем данные локально и обновляем из сети
	 * @param  {string}  url     Урл данных
	 * @param  {string}  storage    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @param  {string}  source    Id источника данных
	 * @return {Promise}
	 */
	async staleWhileRevalidate({url, storage, key, source}) {
		await this.idb.ready;
		let idbStore = this.idb[storage];
		let val = await idbStore.getItem(key);

		if (val !== null) {
			this._fetchAndSave({url, idbStore, key})
					.catch(ex => {});
		} else {
			val = await this._fetchAndSave({url, idbStore, key});
		}

		return val;
	}

	/**
	 * Получаем данные сначала из сети, если недоступна - локально
	 * @param  {string}  url     Урл данных
	 * @param  {string}  storage    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @param  {string}  source    Id источника данных
	 * @return {Promise}
	 */
	async networkFirst({url, storage, key, source}) {
		await this.idb.ready;
		let idbStore = this.idb[storage],
				val;

		try {
			val = await this._fetchAndSave({url, idbStore, key, source});
		} catch(err) {
			val = await idbStore.getItem(key);

			if (val === null) {
				throw err;
			}
		}

		return val;
	}

	/**
	 * Получаем данные только из сети
	 * @param  {string}  url     Урл данных
	 * @param  {string}  source    Id источника данных
	 * @return {Promise}
	 */
	async networkOnly({url, source}) {
		try {
			let response = await fetch(url);
			if (!response.ok) {
				throw new Error('Fetch error');
			}

			return await response.json();
		} catch(err) {
			console.log(`[DataManager] fetch(${url}) err: `, err);
			throw err;
		}
	}

	/**
	 * Создаем хранилища в  indexedDB
	 */
	_createDb() {
		if (this.idb) return;

		this.idb = {};

		this.idb.ready = (async () => {
			for (const storage of STORAGES) {
				this.idb[storage] = localforage.createInstance({
					name: DB_NAME,
					storeName: storage
				});

				await this.idb[storage].setItem('test', 1);
				await this.idb[storage].removeItem('test');
			}
		})();
	}

	/**
	 * Получаем данные и сохраняем в indexedDB
	 * @param  {string}  			url     	Урл данных
	 * @param  {LocalForage}  idbStore  Хранилище
	 * @param  {string}  			key     	Ключ хранилища в idb
	 * @param  {string}  			source    Id источника данных
	 * @return {Promise}
	 */
	async _fetchAndSave({url, idbStore, key, source}) {
		try {
			let response = await fetch(url);
			if (!response.ok) {
				throw new Error('Fetch error');
			}

			let json = await response.json();
			idbStore.setItem(key, json);

			return json;
		} catch(err) {
			console.log(`[DataManager] fetch(${url}) err:`, err);
			throw err;
		}
	}

	async _preload() {
		await this.idb.ready;
		Object.values(sources).forEach((source) => {
			if (source.autoLoad) {
				this.get(source.id);
			}
		});
	}

	_initCache() {
		Object.values(sources).forEach((source) => {
			if (source.memoryCache) {
				this.cache[source.id] = source.isCollection() ? {} : null;
			}
		});
	}
}

class DataSource {
	constructor({
		id,
		url,
		handler = 'networkOnly',
		storage = null,
		key = null,
		autoLoad = false,
		memoryCache = false
	}) {
		if (!id) {
			throw new Error(`Невозможно создать DataSource. Не задан id`);
		}
		if (!url) {
			throw new Error(`Невозможно создать DataSource. Не задан url`);
		}

		this.id = id;
		this.url = url;
		this.handler = handler;
		this.storage = storage;
		this.key = key;
		this.autoLoad = autoLoad;
		this.memoryCache = memoryCache;
	}

	isCollection() {
		return isFunction(this.key);
	}
}

export {DataManager, DataSource, API_URL};
