import {isFunction} from 'lodash-es';
import localforage from 'localforage';

const API_URL = 'https://valaam.ru/phonegap/';
const DB_NAME = 'valaam-phonegap';
const STORAGES = ['collections',
									'saints',
									'days',
									'prayers',
									'stat',
									'images'];

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

		let {url, storage, key, handler} = source;

		url = isFunction(url) ? url(...args) : url;
		key = isFunction(key) ? key(...args) : key;

		if (this._handlerPromise[sourceId])
			return this._handlerPromise[sourceId];

		if (typeof handler == 'string') {
			handler = () => {
				return this[source.handler].call(this, {
					url,
					storage,
					key,
					source
				});
			};
		}

		try {
			this._handlerPromise[sourceId] = handler.call(null, ...args);
			result = await this._handlerPromise[sourceId];
			return result;
		} catch(err) {
			console.error(err);
			throw err;
		} finally {
			delete this._handlerPromise[sourceId];
		}
	}

	/**
	 * Получаем данные из памяти.
	 * @param  {DataSource}  source   Источник данных
	 * @param  {string}  key          Ключ данных
	 * @return {*}               null - если нет данных
	 */
	cacheGet(source, key) {
		if (!this.cache[source.id])
			return null;

		if (!source.isCollection()) {
			return this.cache[source.id];
		} else if (this.cache[source.id][key]) {
			return this.cache[source.id][key];
		}

		return null;
	}

	/**
	 * Сохряем данные в память
	 * @param  {DataSource}  source Источник данных
	 * @param  {ыекштп}  key        Ключ данных
	 * @param  {*}  value        		Данные
	 */
	cacheSet(source, key, value) {
		if (!source.isCollection()) {
			this.cache[source.id] = value;
		} else {
			this.cache[source.id][key] = value;
		}
	}

	/**
	 * Получаем данные из памяти, если нет то - networkOnly
	 * @param  {string}  url     Урл данных
	 * @param  {DataSource}  source    Источник данных
	 * @return {Promise}
	 */
	async cacheThenNetwork({url, key, source}) {
		let cache = this.cacheGet(source, key);
		if (cache !== null) {
			return cache;
		}

		let result = await this.networkOnly({url});

		this.cacheSet(source, key, result);
		return result;
	}

	/**
	 * Получаем данные из памяти, если нет то - staleWhileRevalidate
	 * @param  {string}  url     Урл данных
	 * @param  {string}  storage    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @param  {string}  source  Источник данных
	 * @return {Promise}
	 */
	async cacheThenRevalidate({url, storage, key, source}) {
		let cache = this.cacheGet(source, key);
		if (cache !== null) {
			return cache;
		}

		let result = await this.staleWhileRevalidate({
			url,
			storage,
			key,
			onRevalidate: (json) => {
				this.cacheSet(source, key, json);
			}
		});

		this.cacheSet(source, key, result);

		return result;
	}

	/**
	 * Получаем данные сначала локально, если нет - из сети
	 * @param  {string}  url     Урл данных
	 * @param  {string}  storage    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @return {Promise}
	 */
	async localFirst({url, storage, key}) {
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
	 * @return {Promise}
	 */
	async staleWhileRevalidate({url, storage, key, onRevalidate}) {
		await this.idb.ready;
		let idbStore = this.idb[storage];
		let val = await idbStore.getItem(key);

		if (val !== null) {
			this._fetchAndSave({url, idbStore, key})
					.then((json) => {
						if (onRevalidate) onRevalidate(json);
					})
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
	async networkFirst({url, storage, key}) {
		await this.idb.ready;
		let idbStore = this.idb[storage],
				val;

		try {
			val = await this._fetchAndSave({url, idbStore, key});
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
	 * @return {Promise}
	 */
	async _fetchAndSave({url, idbStore, key}) {
		try {
			let response = await fetch(url);
			if (!response.ok) {
				if (response.statusText === 'Network error') {
					throw new Error('Network error');
				}
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
			this.cache[source.id] = source.isCollection() ? {} : null;
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
		autoLoad = false
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
	}

	isCollection() {
		return isFunction(this.key);
	}
}

export {DataManager, DataSource, API_URL};
