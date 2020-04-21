import { getUnixTime } from '../utils/date-utils.js';
import { fetchJson, formatUrl } from '../utils/utils.js';
import StateStore from '../state-store.js';
import FetchTask from './fetch-task.js';
/**
 * Размер элемента данных в килобайтах (в среднем)
 * Размер несжатых по сети данных
 */
const ROW_SIZE_AVG = 20.8 * 1024;

/**
 * Элемент загрузки офлайн данных
 */
class JsonDownloadItem extends StateStore {
	constructor({
		id,
		title,
		sources,
		row_size = ROW_SIZE_AVG
	}) {
		super(
			'download-item-' + id,
			{
				status: 'new',
				progress: 0, // прогресс скачивания данных
				size: 0, // Размер данных доступных для скачивания
				loadedSize: 0, // Размер сохраненных данных
				loadedDate: 0, // Дата последней загрузки данных
			}
		);

		if (!id) {
			throw new Error(`Невозможно создать JsonDownloadItem. Не задан id`);
		}
		if (!sources) {
			throw new Error(`Невозможно создать JsonDownloadItem. Не задан sources`);
		}

		this.id = id;
		this.title = title;
		/**
		 * @type {Array.<DownloadSource>}
		 */
		this.sources = sources;
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
			throw err;
		}

		this.count = totalCount;
		await this.setState({
			status: !loadedTs ? 'new' : (totalCount ? 'update' : 'fresh'),
			size: totalCount * this.row_size,
			downloaded: 0,
			progress: 0,
		});
	}

	/**
	 * Обновляем состояние
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
	 * @param  {Object}  data
	 * @param  {string}  sourceUrl
	 * @return {Promise}
	 */
	async save(data, sourceUrl) {
		sourceUrl = new URL(sourceUrl);
		let source = this.sources.find(
			({url}) => url === (sourceUrl.origin + sourceUrl.pathname)
		);
		await source.save(data, this.id);

		this.emit('data:saved', data, source);
	}

	async deleteAll() {
		await Promise.all(
			this.sources.map(source => source.delete(this.id))
		);
		await this.setState({
			loadedSize: 0,
			loadedDate: 0
		});
		await this.refresh();
		this.emit('data:deleted');
	}

	async countTotal() {
		let res = await Promise.all(
			this.sources.map(source => source.count(this.id))
		);

		return res.reduce((total, count) => total += count);
	}

	/**
	 * Старт загрузки
	 */
	async download() {
		//console.log(downloadItem);

		let fetchTask = this.fetchTask = new FetchTask({
			id: this.id,
			urls: this.urls,
			type: 'json',
			save: async (data, url) => this.save(data, url)
		});

		fetchTask.on('start', () => {
			//console.log(`Прогресс загрузки начат`);
			this.setState({
				status: 'loading'
			});
		});

		fetchTask.on('continue', () => {
			//console.log(`Прогресс загрузки продолжается`);
			this.setState({
				status: 'loading'
			});
		});

		fetchTask.on('progress', ({progress, downloaded}) => {
			//console.log(`Прогресс загрузки ${progress}% ${bytesToSize(downloaded)}`);
			this.setState({
				progress,
				downloaded
			});
		});

		fetchTask.on('done', async () => {
			console.log(`Успешно загружено и сохранено`);

			console.time('json-item: count');
			let total = await this.countTotal();
			console.timeEnd('json-item: count');
			console.log('json-item: count', total);

			this.setState({
				status: 'fresh',
				downloaded: 0,
				progress: 0,
				loadedSize: total * this.row_size,
				loadedDate: new Date()
			});
			fetchTask = null;
		});

		// QuotaExceededError, AbortError
		fetchTask.on('error', ({name, message}) => {
			console.log(`Ошибка: [${name}]: ${message}`);

			if (name === 'AbortError') {
				this.setState({
					status: this.state.loadedSize ? 'update' : 'new',
					progress: 0,
					downloaded: 0
				});

			} else if (name === 'QuotaExceededError') {
				this.setState({
					status: 'error',
					message: 'Недостаточно места на устройстве для сохранения данных',
					progress: 0,
					downloaded: 0
				});

			} else {
				this.setState({
					status: 'error',
					message: `Ошибка при загрузке данных. [${name}]: ${message}`,
					progress: 0,
					size: 0,
				});
			}

			this.fetchTask = null;
		});

		fetchTask.fetch();

		this.fetchTask = fetchTask;

		return true;
	}

	cancel() {
		this.fetchTask.cancel();
	}
}

export default JsonDownloadItem;
