import { getUnixTime } from '../utils/date-utils.js';
import { fetchJson, formatUrl } from '../utils/utils.js';
import DownloadItem from './item.js';
import FetchTask from './fetch-task.js';
/**
 * Размер элемента данных в килобайтах (в среднем)
 * Размер несжатых по сети данных
 */
const ROW_SIZE_AVG = 20.8 * 1024;

/**
 * Элемент загрузки офлайн данных
 */
class JsonDownloadItem extends DownloadItem {
	constructor({
		id,
		title,
		sources,
		row_size = ROW_SIZE_AVG
	}) {
		super({
			id,
			title,
			sources
		});

		this.row_size = row_size;
		this.count = 0; // количество элементов для скачивания
		this.urls = [];
	}

	/**
	 * Получаем список url для загрузки
	 * @return {Promise} [description]
	 */
	getUrls() {
		let sources = this.sources;
		let loadedTs = getUnixTime(this.state.loadedDate);
		let urls = [];

		let	defParams = {
			from_ts: loadedTs
		}

		for (let i = 0, length = sources.length; i < length; i++) {
			let {url, params = {}, updateCount} = sources[i];
			let urlParams = [];

			params = Object.assign({}, defParams, params);

			if (params.page_size) {
				let pages = Math.ceil(updateCount / params.page_size);
				for (let i = 1; i <= pages; i++) {
					urlParams.push(
						Object.assign({ PAGEN_1: i }, params)
					);
				}
			} else {
				urlParams.push(params);
			}

			urlParams.forEach(item => urls.push(formatUrl(url, item)));
		}

		return urls;
	}

	/**
	 * Cчитаем количество данных для загрузки и обновляем статус
	 */
	async doCount() {
		await this.statePromise;

		let sources = this.sources;
		let loadedTs = getUnixTime(this.state.loadedDate);
		let totalCount = 0;

		let	defParams = {
			from_ts: loadedTs
		};

    await this.setState({
      status: 'size-counting',
    });

		try {
			for (let i = 0, length = sources.length; i < length; i++) {
				let count = 0;
				let {urlCount, params = {}} = sources[i];
				params = Object.assign({}, defParams, params);

				if (params.page_size) {
          ({count} = await fetchJson(
						urlCount,
						{params}
					));
					sources[i].updateCount = count;
				} else {
					count = 0;
				}

				totalCount += count;
			}
		} catch(err) {
			console.log(`[DownloadItem] doCount(): error [${err.name}]: ${err.message}`);
			totalCount = !loadedTs ? Math.round(this.state.size / this.row_size) : 0;
			//throw err;
		}

		await this.setState({
			status: !loadedTs ? 'new' : (totalCount ? 'update' : 'fresh'),
			size: totalCount * this.row_size,
			downloaded: 0,
			progress: 0,
		});
	}

	/**
	 * Обновляем состояние
	 * @override
	 * @return {Promise}
	 */
	async refresh() {
		await this.statePromise;
		if (this.state.status === 'loading') {
			return;
		}
		await this.doCount();
		this.urls = this.getUrls();
	}

	/**
	 * Сохраняем элемент данных
	 * @override
	 * @param  {Object}  data
	 * @param  {string}  sourceUrl
	 * @return {Promise}
	 */
	async save(data, sourceUrl) {
		sourceUrl = new URL(sourceUrl);
		let source = this.sources.find(
			({url}) => url === (sourceUrl.origin + sourceUrl.pathname)
		);
		await source.save(data);

		this.emit('data:saved', data, source);
	}

	/**
	 * Старт загрузки
	 * @override
	 */
	async download() {
		this.fetchTask = new FetchTask({
			id: this.id,
			urls: this.urls,
			type: 'json',
			save: async (data, url) => this.save(data, url)
		});

		this.fetchTask.on('start', () => {
			this.emit('download:start');
		});

		this.fetchTask.on('continue', () => {
			this.emit('download:continue');
		});

		this.fetchTask.on('progress', ({downloaded}) => {
			this.emit('download:progress', {downloaded});
		});

		this.fetchTask.on('done', async () => {
			this.emit('download:done');
			this.fetchTask = null;
		});

		this.fetchTask.on('error', ({name, message}) => {
			this.emit('download:error', {name, message});
			this.fetchTask = null;
		});

		this.fetchTask.fetch();
		return true;
	}

	/**
	 * Отменяем загрузку
	 * @override
	 */
	cancel() {
		this.fetchTask.cancel();
	}
}

export default JsonDownloadItem;
