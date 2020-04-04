/**
 * Загружает данные для оффлайн версии c помощью BackgroundFetch API,
 * @see https://github.com/WICG/background-fetch
 */
import Framework7 from 'framework7';
import Worker from './bg-fetch.wkr.js';

class BackgroundFetchTask extends Framework7.Events {
	/**
	 * @param {DownloadSourceGroup} sourceGroup [description]
	 */
	constructor(sourceGroup) {
		super();

		this.id = sourceGroup.id;
		this.urls = sourceGroup.urls;
		this.sourceGroup = sourceGroup;

		if (!('serviceWorker' in navigator && 'BackgroundFetchManager' in window)) {
			throw new Error('BackgroundFetch не доступен');
		}
	}

	handleEvent(event) {
		if (event.source !== this.registration.active) {
			return;
		}

		if (event.data.type) {
			this.emit(event.data.type, event.data);
		}
	}

	destroy() {
		navigator.serviceWorker.removeEventListener('message', this);
		this.off(Object.keys(this.eventsListeners).join(' '));
		this.registration = null;
		this.bgFetchRegistration = null;
	}

	async registerSW() {
		await navigator.serviceWorker.register('bg-fetch.wkr.js'); // '?id=' + Math.random()
		this.registration = await navigator.serviceWorker.ready;
	}

	async fetch() {
		await this.registerSW();

		console.log(this);

		navigator.serviceWorker.addEventListener('message', this);

		this.bgFetchRegistration = await this.registration.backgroundFetch.get(this.id);

		if (!this.bgFetchRegistration) {
			console.log('create this.bgFetchRegistration!');
			this.bgFetchRegistration = await this.registration.backgroundFetch.fetch(
				 this.id,
				 this.urls,
				 {
					 title: this.sourceGroup.title
				 }
			 );

			 this.emit('download:start');
		} else {
			console.log('this.bgFetchRegistration exists!', this.bgFetchRegistration);
		}

		this.bgFetchRegistration.addEventListener('progress', event => {
			let fetchProgress = event.currentTarget;
			//console.log('fetchProgress', fetchProgress, event);
			let progress = Math.floor((100 * fetchProgress.downloaded) / this.sourceGroup.size);
			progress = progress >= 100 ? 100 : progress;
			this.emit('download:progress', {
				downloaded: fetchProgress.downloaded,
				progress
			});
	 	});
	}

	async cancel() {
		 await this.bgFetchRegistration.abort();
		 setTimeout(() => this.destroy(), 0);
	}
}

export default BackgroundFetchTask;
