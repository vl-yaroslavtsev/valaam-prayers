import StateStore from '../state-store.js';

/**
 * Элемент загрузки офлайн данных.
 * Содержит общую логику
 */
class DownloadItem extends StateStore {
	constructor({
		id,
		title,
		sources
	}) {
		super(
			{
				id,
				status: 'new',
				downloaded: 0, // скачано в прогрессе
				progress: 0, // прогресс скачивания данных
				size: 0, // Размер данных доступных для скачивания
				loadedSize: 0, // Размер сохраненных данных
				loadedDate: 0, // Дата последней загрузки данных
			},
			'downloads'
		);

		if (!id) {
			throw new Error(`Невозможно создать DownloadItem. Не задан id`);
		}
		if (!sources) {
			throw new Error(`Невозможно создать DownloadItem. Не задан sources`);
		}

		this.id = id;
		this.title = title;
		/**
		 * @type {Array.<DownloadSource>}
		 */
		this.sources = sources;

		this.addHooks();
	}

	/**
	 * Обновляем состояние
	 * @return {Promise}
	 */
	async refresh() {
		// Здесь нужно обновить состояние
		// status:
		// size:
		// downloaded:
		// progress:

		throw new Error('DownloadItem.refresh not implemented!');
	}

	/**
	 * Сохраняем элемент данных
	 * @param  {Object}  data
	 * @param  {string}  sourceUrl
	 * @return {Promise}
	 */
	async save(data, sourceUrl) {
		throw new Error('DownloadItem.save not implemented!');
	}

	/**
	 * Удаление сохраненных данных
	 * @return {Promise} [description]
	 */
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

	/**
	 * Размер в байтах сохраненных данных
	 * @return {Promise} [description]
	 */
	async getSize() {
		let res = await Promise.all(
			this.sources.map(source => source.size())
		);

		return res.reduce((total, size) => total += size);
	}

	/**
	 * Старт загрузки
	 */
	async download() {
		throw new Error('DownloadItem.download not implemented!');
	}

	/**
	 * Отмена загрузки
	 */
	cancel() {
		throw new Error('DownloadItem.cancel not implemented!');
	}

	addHooks() {
		this.on('download:start', () => {
			this.setState({
				status: 'loading'
			});
		});

		this.on('download:continue', () => {
			this.setState({
				status: 'loading'
			});
		});

		this.on('download:progress', ({downloaded}) => {
			if ((downloaded - this.state.downloaded) / this.state.size < 0.001) {
				return;
			}
			this.setState({
				progress: 100 * downloaded / this.state.size,
				downloaded
			});
		});

		this.on('download:done', async () => {
			console.log(`DownloadItem.fetch: Успешно загружено и сохранено`);

			this.setState({
				status: 'processing',
			});

			let loadedSize = await this.getSize();

			this.setState({
				status: 'fresh',
				downloaded: 0,
				progress: 0,
				loadedSize,
				loadedDate: new Date()
			});
		});

		// QuotaExceededError, AbortError
		this.on('download:error', ({name, message}) => {
			console.log(`DownloadItem.fetch: Ошибка: [${name}]: ${message}`);

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
		});
	}
}

export default DownloadItem;
