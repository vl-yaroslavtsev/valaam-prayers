/**
 * Загружает данные для оффлайн версии c помощью fetch,
 * сохраняя состояние загрузки между стартами приложения
 */
import Framework7 from 'framework7';

import StateStore from '../state-store.js';
import { fetchJson } from '../utils/utils.js';

const RETRY_PERIOD = 5 * 1000;
const MAX_RETRY_COUNT = 17280; // 1 сутки

class FetchTask extends StateStore {

	constructor({
		id,
		urls = [],
		size = 0,
		save = async (data, url) => {}
	}) {
		super(
			'fetch-task-' + id,
			{
				status: 'new',
				index: 0,
				urls: [],
				retryCount: 0
			}
		);

		this.id = id;
		this.urls = urls;
		this.size = size;
		this.save = save;

		this.controller = null;
	}

	destroy() {
		super.destroy();
		this.off(Object.keys(this.eventsListeners).join(' '));
		this.controller = null;
	}

	async fetch() {
		this.controller = new AbortController();
		let signal = this.controller.signal;

		await this.statePromise;

		console.log('FetchTask: fetch state', this.state, this.size);

		try {
			let {index: i} = this.state;
			
			if (i === 0) {
				await this.setState({
					urls: this.urls,
				});
				this.emit('start');

			} else {
				this.emit('continue');
				this.urls = this.state.urls;
			}
			for (let len = this.urls.length; i < len; i++) {
				let url = this.urls[i];
				let downloaded = this.size ? (this.size * (i + 1) / len) : 0;

				await this.setState({
					status: 'loading',
					index: i,
				});

				let data = await fetchJson(url, {}, signal);

				this.emit('progress', {
					downloaded,
 				 	progress: Math.floor(100 * (2 * (i + 1) - 1 ) / (2 * len))
				});

				await this.save(data, url);

				this.emit('progress', {
					downloaded,
 				 	progress: Math.floor(100 * (2 * (i + 1) - 0) / (2 * len))
				});
			}
		} catch(err) {
			// Нет сети интернет
			if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
				// Пробуем еще раз
				if (!signal.aborted && this.state.retryCount < MAX_RETRY_COUNT) {
					setTimeout(() => {
						this.setState({
							retryCount: ++this.state.retryCount
						});
						this.fetch();
					}, RETRY_PERIOD);
				}

				throw err;
			}

			this.emit('error', {
				name: err.name,
				message: err.message,
			});

			setTimeout(() => this.destroy(), 0);
		}

		this.emit('done');
		setTimeout(() => this.destroy(), 0);
		return true;
	}

	async cancel() {
		await this.controller.abort();
		setTimeout(() => this.destroy(), 0);
	}
}

export default FetchTask;
