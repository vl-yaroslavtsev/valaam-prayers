import { getUnixTime } from '../utils/date-utils.js';
import { fetchJson, formatUrl } from '../utils/utils.js';
import StateStore from '../state-store.js';
import FetchTask from './fetch-task.js';
import db from '../data/db.js';

/**
 * Размер элемента данных в килобайтах (в среднем)
 * Размер несжатых по сети данных
 */
const ROW_SIZE_AVG = 61.9 * 1024;

/**
 * Группа источиков данных для загрузки
 */
class IconDownloadItem extends StateStore {
	constructor({
		id,
		title,
		master,
		row_size = ROW_SIZE_AVG
	}) {
		{
			super(
				'download-group-' + id,
				{
					status: 'new',
					progress: 0, // прогресс скачивания данных
					size: 0, // Размер данных доступных для скачивания
					loadedSize: 0, // Размер сохраненных данных
					loadedDate: 0, // Дата последней загрузки данных
					urls: new Set()
				}
			);

			if (!id) {
				throw new Error(`Невозможно создать DownloadGroup. Не задан id`);
			}

			this.id = id;
			this.title = title;
			this.row_size = row_size;
			this.count = 0; // количество элементов для скачивания
			this.master = master;
		}
	}

	/**
	 * Получаем список url для загрузки
	 * @return {Promise} [description]
	 */
	getUrls() {
		//let sources = this.sources;
		return [...this.state.urls];
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

		console.log(this.state);

		await this.setState({
			status: !this.state.loadedSize ? 'new' : 'fresh',//(count ? 'update' : 'fresh'),
			//size: 0,//count * this.row_size,
			message: ''
		});
	}

	async save(blobs, urls) {
		let data = blobs
			.map((blob, index) => {
				return {
					url: urls[index],
					source_id: this.master,
					image: blob
				}
			});
		await db.images.putAll(data);
	}

	async deleteAll(data, sourceUrl) {
		await db.images.deleteFromIndex('by-source-id', this.master);
		await this.setState({
			status: 'new',
			downloaded: 0,
			progress: 0,
			loadedSize: 0,
			loadedDate: 0
		});
	}

	/**
	 * Старт загрузки
	 */
	async download() {
		//console.log(downloadItem);

		let fetchTask = new FetchTask({
			id: this.id,
			urls: this.getUrls(),
			type: 'blob',
			bulk_size: 50,
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
			let loadedSize = 0;
			await db.images.iterateFromIndex(
				'by-source-id',
				this.master,
				(key, {image}) => loadedSize += image.size
			);

			this.setState({
				status: 'fresh',
				downloaded: 0,
				progress: 0,
				loadedSize,
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

	onMasterStateChanged({changed, state}) {
		if (changed.status === 'fresh') {
			let urls = this.state.urls;
			let size = urls.size * this.row_size;
			this.setState({
				size,
			});
		}
	}

	onMasterSaved({data}, source) {
		if (!source.getImageUrls) return;

		let urls = this.state.urls; // set of urls
		data.forEach(item => {
			source.getImageUrls(item).forEach(url => url && urls.add(url));
		});
		this.setState({
			urls
		});
	}

	onMasterDeleted() {
		this.deleteAll();
	}
}

export default IconDownloadItem;
