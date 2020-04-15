/**
 * Хранилище состояния
 * Хранится в state indexedDB
 */
import Framework7 from 'framework7';

import db from './data/db.js';

class StateStore extends Framework7.Events {

	constructor(
		key,
		value = {}) {
		super();

		this.stateKey = key;

		this.statePromise = this.getState().then((state) => {
			this.state = state || value;
			this.emit('state:init', this.state, this);
		});

	}

	destroy() {
		this.setState(null);
	}

	/** Получаем состояние */
	async getState() {
		await db.open();
		return await db.state.get(this.stateKey);
	}

	/**
	 * Устанавливаем состояние
	 */
	async setState(value = {}) {
		let key = this.stateKey;

		if (value === null) {
			this.state = null;
			await db.state.delete(key);
		} else {
			this.state = Object.assign(this.state || {}, value);
			try {
				await db.state.put(this.state, key);
			} catch(err) {
				console.error(err);
			}
		}
		this.emit('state:changed', { changed: value, state: this.state });
	}
}

export default StateStore;
