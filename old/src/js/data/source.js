import {isFunction} from 'lodash-es';

/**
 * Источник данных
 */
class DataSource {
	constructor({
		id,
		url,
		handler = 'networkOnly',
		store = null,
		key = null,
		autoLoad = false
	}) {
		if (!id) {
			throw new Error(`Невозможно создать data.Source. Не задан id`);
		}
		if (!url) {
			throw new Error(`Невозможно создать data.Source. Не задан url`);
		}

		this.id = id;
		this.url = url;
		this.handler = handler;
		this.store = store;
		this.key = key;
		this.autoLoad = autoLoad;
	}

	isCollection() {
		return isFunction(this.key);
	}
}

export default DataSource;
