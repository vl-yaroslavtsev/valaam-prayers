import { getUnixTime } from '../utils/date-utils.js';
import { fetchJson } from '../utils/utils.js';
import DownloadItem from './item.js';
import FetchTask from './fetch-task.js';

/**
 * Группа источиков данных для загрузки
 */
class IconDownloadItem extends DownloadItem {
	constructor({
		id,
		title,
		sources
	}) {
		super({
			id,
			title,
			sources
		});

		this.urls = [];
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

		let sources = this.sources;
		let loadedTs = getUnixTime(this.state.loadedDate);
		let totalSize = 0;
		let totalUrls = [];

		let	defParams = {
			from_ts: loadedTs
		};

		this.state.urlSource = {};

		await this.setState({
      status: 'size-counting',
    });

		try {
			for (let source of sources) {
				let {url, params = {}} = source;
				params = Object.assign({}, defParams, params);

				let {size, urls} = await fetchJson(
					url,
					{params}
				);

				urls.forEach((url) => this.state.urlSource[url] = source.id);

				totalSize += size;
				totalUrls = totalUrls.concat(urls);
			}
		} catch(err) {
			console.log(`[IconItem] refresh(): error [${err.name}]: ${err.message}`);
			//throw err;
			totalSize = !loadedTs ? this.state.size : 0;
			totalUrls = [];
		}

		this.urls = totalUrls;
		await this.setState({
			status: !loadedTs ? 'new' : (totalSize ? 'update' : 'fresh'),
			size: totalSize,
			downloaded: 0,
			progress: 0,
		});
	}

	/**
	 * Сохраняем пачку данных
	 * @override
	 * @param  {Array.<{raw, type}>}  blobs
	 * @param  {Array.<string>} urls
	 * @return {Promise}
	 */
	async save(blobs, urls) {
		let data = blobs.map(({raw, type}, index) => {
			let url = urls[index];
			return {
				url,
				source_id: this.state.urlSource[url],
				raw,
				type
			}
		});
		await this.sources[0].save(data);
		this.emit('data:saved', data);
	}

	/**
	 * Старт загрузки
	 */
	async download() {
		this.fetchTask = new FetchTask({
			id: this.id,
			urls: this.urls,
			type: 'raw',
			bulk_size: 30,
			save: async (blobs, urls) => this.save(blobs, urls)
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
			this.setState({
				urlSource: {}
			});
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
	 * Отмена загрузки
	 * @override
	 */
	cancel() {
		this.fetchTask.cancel();
	}
}

export default IconDownloadItem;
