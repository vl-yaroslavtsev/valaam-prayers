import { getUnixTime } from '../utils/date-utils.js';
import { fetchJson, formatUrl } from '../utils/utils.js';
import StateStore from '../state-store.js';
/**
 * Размер элемента данных в килобайтах (в среднем)
 * Размер несжатых по сети данных
 */
const ROW_SIZE_AVG = 20.8 * 1024;

/**
 * Группа источиков данных для загрузки
 */
class DownloadSourceGroup  extends StateStore {
	constructor({
		id,
		title,
		sources,
		row_size = ROW_SIZE_AVG
	}) {
		super(
			'source-group-' + id,
			{
				status: 'new',
				progress: 0, // прогресс скачивания данных
				size: 0, // Размер данных доступных для скачивания
				loadedSize: 0, // Размер загруженных данных
				loadedDate: 0 // Дата последней загрузки данных
			}
		);

		if (!id) {
			throw new Error(`Невозможно создать DownloadSource. Не задан id`);
		}
		if (!sources) {
			throw new Error(`Невозможно создать DownloadSource. Не задан sources`);
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
	async getUrls() {
		await this.statePromise;

		let sources = this.sources;
		let loadedTs = getUnixTime(this.state.loadedDate);
		let urls = [];

		let	defParams = {
			from_ts: loadedTs
		}

		for (let i = 0, length = sources.length; i < length; i++) {
			let {url, params = {}, count} = sources[i];
			let urlParams = [];

			params = Object.assign({}, defParams, params);

			if (params.page_size) {
				let pages = Math.ceil(count / params.page_size);
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
	 * Cчитаем количество данных и обновляем статус
	 */
	async doCount() {
		await this.statePromise;

		let sources = this.sources;
		let loadedTs = getUnixTime(this.state.loadedDate);
		let count = 0;

		let	defParams = {
			from_ts: loadedTs
		};

		try {
			for (let i = 0, length = sources.length; i < length; i++) {
				let cnt;
				let {urlCount, params = {}} = sources[i];
				params = Object.assign({}, defParams, params);

				if (params.page_size) {
					({count: cnt} = await fetchJson(
						urlCount,
						params
					));
					sources[i].count = cnt;
				} else {
					cnt = 0;
				}

				count += cnt;
			}
		} catch(err) {
			console.log(`[DownloadSourceGroup] doCount(): error [${err.name}]: ${err.message}`);
			throw err;
		}

		this.count = count;
		await this.setState({
			status: !loadedTs ? 'new' : (count ? 'update' : 'fresh'),
			size: count * this.row_size,
			downloaded: 0,
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
		this.urls = await this.getUrls();
	}

	async save(data, sourceUrl) {
		sourceUrl = new URL(sourceUrl);
		let source = this.sources.find(
			({url}) => url === (sourceUrl.origin + sourceUrl.pathname)
		);
		await source.save(data);
	}
}

export default DownloadSourceGroup;
