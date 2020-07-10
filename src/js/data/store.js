/**
 * @module data/store
 * Предаставляет хранилище данных на клиенте
 */
class Store {
	/**
	 * @param {string} name название хранилища
	 * @param {IDBDatabase} idb
	 * @param {Object} options
	 */
	constructor(name, idb) {
		/** @type IDBDatabase */
		this.idb = idb;
		this.name = name;
	}

  /**
   * Получаем первый элемент по ключу или запросу IDBKeyRange
   * @param  {*|IDBKeyRange}  query
   * @return {Promise}
   */
	async get(query) {
		return this.idb.get(this.name, query);
	}

	/**
	 * Получаем все элементы по ключу или запросу IDBKeyRange
	 * Chrome 48, Firefox 44, and Safari 10.1.
	 * @param  {*|IDBKeyRange} query Ключ или запрос
	 * @param  {number=} count Необязательно. Максимальное количество данных
	 * @return {Promise}
	 */
	async getAll(query, count) {
		return this.idb.getAll(this.name, query, count);
	}

	/**
	 * Сохраняем элемент.
	 * @param  {*|IDBKeyRange}  value значеие
	 * @param  {*} key Необязательно. Если нет keyPath
	 * @return {Promise}
	 */
	async put(value, key) {
		const tx = this.idb.transaction(this.name, 'readwrite');
		if (tx.store.keyPath) {
			key = undefined;
		}
		tx.store.put(value, key);
		await tx.done;
	}

	/**
	 * Сохраняем массив элементов одной транзакцией.
	 * @param {Array<*>}  values значеия
	 * @param {AbortSignal} signal
	 * @return {Promise}
	 */
	async putAll(values) {
		try {
			const tx = this.idb.transaction(this.name, 'readwrite');
			for (let value of values) {
				tx.store.put(value);
			}
			await tx.done;
		} catch (err) {
			console.log('db.store.putAll error: ', err, err.name, err.message);
			throw err;
		}

	}

	/**
	 * Поиск всех ключей, которые удовлетворяют запросу.
	 * Возможно ограничить поиск, передав count.
	 * Chrome 48, Firefox 44, and Safari 10.1.
	 * @param  {IDBKeyRange} query запрос
	 * @param  {number} count Необязательно.
	 * @return {Promise}
	*/
	async getAllKeys(query, count) {
		return this.idb.getAllKeys(this.name, query, count);
	}

	/**
	 * Удаляем элементы по ключу или запросу IDBKeyRange
	 * @param  {*|IDBKeyRange}  query Ключ или запрос
	 * @return {Promise}
	 */
	async delete(query) {
		return this.idb.delete(this.name, query);
	}

	/**
	 * Очистить хранилище
	 * @return {Promise}
	 */
	async clear() {
		return this.idb.clear(this.name);
	}

	/**
	 * Получить общее количество ключей, которые удовлетворяют запросу
	 * @param  {IDBKeyRange}  query запрос
	 * @return {Promise}
	 */
	async count(query) {
		return this.idb.count(this.name, query);
	}

	async iterate(callback = (key, value) => {}, query) {
		let cursor = await this.idb.transaction(this.name).store.openCursor(query);

		while (cursor) {
		  callback(cursor.key, cursor.value);
		  cursor = await cursor.continue();
		}
	}

	/**
	 * Получаем 1-ый элемент из индекса по значению или запросу IDBKeyRange
	 * @param  {string}  indexName [description]
	 * @param  {*|IDBKeyRange}  key  Значение индекса или запрос IDBKeyRange
	 * @return {Promise}
	 */
	async getFromIndex(indexName, key) {
		return this.idb.getFromIndex(this.name, indexName, key);
	}

  /**
   * Получаем элементы из индекса по значению или запросу IDBKeyRange
   * @param  {string}  indexName [description]
   * @param  {*|IDBKeyRange}  key  Значение индекса или запрос IDBKeyRange
   * @return {Promise}
   */
  async getAllFromIndex(indexName, key) {
    return this.idb.getAllFromIndex(this.name, indexName, key);
  }

	/**
   * Получаем ключи из индекса по значению или запросу IDBKeyRange
   * @param  {string}  indexName [description]
   * @param  {*|IDBKeyRange}  key  Значение индекса или запрос IDBKeyRange
   * @return {Promise}
   */
  async getAllKeysFromIndex(indexName, key) {
    return this.idb.getAllKeysFromIndex(this.name, indexName, key);
  }


	/**
	 * Удаляем элементы по значению индекса или запросу IDBKeyRange
	 * @param  {string}  indexName [description]
	 * @param  {*|IDBKeyRange}  query     Значение индекса или запрос IDBKeyRange
	 * @return {Promise}
	 */
	async deleteFromIndex(indexName, query) {
		const tx = this.idb.transaction(this.name, 'readwrite');
		const store = tx.store;
		let cursor = await store.index(indexName).openKeyCursor(query);

		while (cursor) {
		  store.delete(cursor.primaryKey);
		  cursor = await cursor.continue();
		}
		await tx.done;
	}

	/**
	 * Подсчитываем количество элементов в индексе
	 * @param  {string}  indexName [description]
	 * @param  {*|IDBKeyRange}  query Значение индекса или запрос IDBKeyRange
	 * @return {Promise}
	 */
	async countFromIndex(indexName, query) {
		return await this.idb.countFromIndex(this.name, indexName, query);
	}

	async iterateFromIndex(indexName, query, callback = (key, value) => {}) {
		const tx = this.idb.transaction(this.name);
		let cursor = await tx.store.index(indexName).openCursor(query);

		while (cursor) {
		  callback(cursor.key, cursor.value);
		  cursor = await cursor.continue();
		}
	}
}

export default Store;
