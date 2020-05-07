import {isFunction} from 'lodash-es';
import db from './db.js';
import DataSource from './source.js';
import dataSources from './sources.js';

/**
 * Менеджер данных
 */
class DataManager {
	constructor() {
		this._handlerPromise = {};
		/**
		 * Источники данных
		 * @type {Object}
		 */
		this._sources = {};

		this.cache = {};

		this._registerSources();
		this._initCache();
	}

	async init() {
		await this._openDb();
		this._preload();
	}

	/**
	 * Получаем данные из источника данных
	 * @param  {string} sourceId Источник данных
	 * @param  {*}      args     Доп. параметры
	 * @return {Promise}
	 */
	async get(sourceId, ...args) {
		let source = this._sources[sourceId], result;
		if (!source) {
			throw new Error(`[DataManager] get('${sourceId}'):
				Неверно указан источник данных`);
		}

		let {url, store, key, handler} = source;

		url = isFunction(url) ? url(...args) : url;
		key = isFunction(key) ? key(...args) : key;

		if (this._handlerPromise[sourceId])
			return this._handlerPromise[sourceId];

		if (typeof handler == 'string') {
			handler = () => {
				return this[source.handler].call(this, {
					url,
					store,
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
	 * @param  {data/Source}  source   Источник данных
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
	 * @param  {data/Source}  source Источник данных
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
	 * @param  {data/Source}  source    Источник данных
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
	 * @param  {string}  store    Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @param  {string}  source  Источник данных
	 * @return {Promise}
	 */
	async cacheThenRevalidate({url, store, key, source}) {
		let cache = this.cacheGet(source, key);
		if (cache !== null) {
			return cache;
		}

		let result = await this.staleWhileRevalidate({
			url,
			store,
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
	 * @param  {string}  store   Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @return {Promise}
	 */
	async localFirst({url, store, key}) {
		let dbStore = db[store];
		let val = await dbStore.get(key);

		if (val !== null) {
			return val;
		}

		return await this._fetchAndSave({url, dbStore, key});
	}

	/**
	 * Получаем данные локально и обновляем из сети
	 * @param  {string}  url     Урл данных
	 * @param  {string}  store   Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @return {Promise}
	 */
	async staleWhileRevalidate({url, store, key, onRevalidate}) {
		let dbStore = db[store];
		let val = await dbStore.get(key);
		if (val !== undefined) {
			this._fetchAndSave({url, dbStore, key})
					.then((json) => {
						if (onRevalidate) onRevalidate(json);
					})
					.catch(ex => {});
		} else {
			val = await this._fetchAndSave({url, dbStore, key});
		}

		return val;
	}

	/**
	 * Получаем данные сначала из сети, если недоступна - локально
	 * @param  {string}  url     Урл данных
	 * @param  {string}  store   Название хранилища в idb
	 * @param  {string}  key     Ключ хранилища в idb
	 * @return {Promise}
	 */
	async networkFirst({url, store, key}) {
		let dbStore = db[store],
			val;

		try {
			val = await this._fetchAndSave({url, dbStore, key});
		} catch(err) {
			val = await dbStore.get(key);

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
	 * Открываем базу данных
	 */
	async _openDb() {
		await db.open();
	}

	/**
	 * Получаем данные и сохраняем в indexedDB
	 * @param  {string} url  Урл данных
	 * @param  {Store} dbStore  Хранилище
	 * @return {Promise}
	 */
	async _fetchAndSave({url, dbStore, key}) {
		try {
			let response = await fetch(url);
			if (!response.ok) {
				if (response.statusText === 'Network error') {
					throw new Error('Network error');
				}
				throw new Error('Fetch error');
			}

			let json = await response.json();
			dbStore.put(json, key);

			return json;
		} catch(err) {
			console.log(`[DataManager] fetch(${url}) err: `, err);
			throw err;
		}
	}

	async _preload() {
		Object.values(this._sources).forEach((source) => {
			if (source.autoLoad) {
				this.get(source.id);
			}
		});
	}

	_initCache() {
		Object.values(this._sources).forEach((source) => {
			this.cache[source.id] = source.isCollection() ? {} : null;
		});
	}

	/**
	 * Добавляем источники данных
	 */
	_registerSources() {
		dataSources.forEach((source) => {
			this._sources[source.id] = source;
		});
	}

	getSource(sourceId) {
		return this._sources[sourceId];
	}
}

export default new DataManager();
