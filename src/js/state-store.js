/**
 * Хранилище состояния
 * Хранится в state indexedDB
 */
import Framework7 from 'framework7';

import db from './data/db.js';

class StateStore extends Framework7.Events {

	constructor(
		value = {id: 'state-id'},
		store = 'state') {
		super();

		this.stateStore = store;

		this.statePromise = this.getState(value.id).then((state) => {
			this.state = state || value;
			this.emit('state:init', this.state, this);
		});

	}

	destroy() {
		this.setState(null);
	}

	/** Получаем состояние */
	async getState(id) {
		id = id || this.state.id;
		await db.open();
		return await db[this.stateStore].get(id);
	}

	/**
	 * Устанавливаем состояние
	 */
	async setState(value = {}) {
		let key = this.state.id;

		if (value === null) {
			this.state = null;
			await db[this.stateStore].delete(key);
		} else {
			this.state = Object.assign(this.state || {}, value);
			try {
				await db[this.stateStore].put(this.state);
			} catch(err) {
				console.error(err);
			}
		}
		this.emit('state:changed', { changed: value, state: this.state });
	}
}

export default StateStore;
