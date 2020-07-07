/**
 * Загружает данные для оффлайн версии c помощью fetch,
 * сохраняя состояние загрузки между стартами приложения
 */
import Framework7 from 'framework7';

import StateStore from '../state-store.js';
import { fetchJson, fetchRaw } from '../utils/utils.js';

const RETRY_PERIOD = 2 * 1000;
const MAX_RETRY_COUNT = 43200; // 1 сутки

const SITE_URL = 'https://valaam.ru';

class FetchTask extends StateStore {

	constructor({
		id,
		urls = [],
		bulk_size = 1,
		type = 'json',
		save = async (data, url) => {}
	}) {
		super({
			id: 'fetch-task-' + id,
			index: 0,
			urls: [],
			retryCount: 0,
			downloaded: 0
		});

		this.id = id;
		this.urls = urls;
		this.bulk_size = bulk_size;
		this.type = type;
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

			let downloaded =  this.state.downloaded;
			let bulkUrls = [];
			for (let len = this.urls.length; i < len; i++) {
				let url = this.urls[i];
				let data;

				bulkUrls.push(url);
				if (bulkUrls.length < this.bulk_size &&
						bulkUrls.length < len) {
					continue;
				}

				if (this.type === 'json') {
					data = await Promise.all(
						bulkUrls.map(url => fetchJson(
							url,
							{
								signal,
								progress: ({chunk}) => {
									downloaded += chunk;
									this.emit('progress', {
										downloaded
									});
								}
							}
						))
					);
					data = data.filter(json => !!json);
					if (this.bulk_size === 1) data = data[0];
				} else if (this.type === 'raw') {
					data = await Promise.all(
						bulkUrls.map(url => fetchRaw(
							SITE_URL + url,
							{
								signal,
								progress: ({chunk}) => {
									downloaded += chunk;
									this.emit('progress', {
										downloaded
									});
								}
							}
						))
					);
					data = data.filter(blob => !!blob);
					if (this.bulk_size === 1) data = data[0];
				}

				await this.setState({
					downloaded
				});

				this.emit('progress', {
					downloaded
				});

				await this.save(data,	this.bulk_size === 1 ? url : bulkUrls);

				await this.setState({
					index: i + 1,
				});

				bulkUrls = [];
			}
		} catch(err) {
			console.log(err);
			// Нет сети интернет
			//console.log('fetch task catch:', err.name, err.message, err);
			if (signal.aborted && err.name !== 'AbortError') {
				err = new DOMException('Aborted', 'AbortError');

			} else if (['TypeError','DataError'].includes(err.name)  &&
								 this.state.retryCount < MAX_RETRY_COUNT) {
				return setTimeout(() => {
					this.setState({
						retryCount: ++this.state.retryCount
					});
					this.fetch();
				}, RETRY_PERIOD);
			}

			this.emit('error', {
				name: err.name,
				message: err.message,
			});

			setTimeout(() => this.destroy(), 0);
			return;
		}

		this.emit('done');
		setTimeout(() => this.destroy(), 0);
		return true;
	}

	async cancel() {
		await this.controller.abort();
		//setTimeout(() => this.destroy(), 0);
	}
}

export default FetchTask;
