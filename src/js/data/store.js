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
	 * @param  {Array<*>}  values значеия
	 * @return {Promise}
	 */
	async putAll(values) {
		const tx = this.idb.transaction(this.name, 'readwrite');
		for (let value of values) {
			tx.store.put(value);
		}
		await tx.done;
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
	
	async getFromIndex(indexName, key) {
		return this.idb.getFromIndex(this.name, indexName, key);
	}
}

export default Store;
