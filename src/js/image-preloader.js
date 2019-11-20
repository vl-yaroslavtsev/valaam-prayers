/**
 * Управляет загрузкой картинок в кэш браузера
 * Грузит картинки порциями по config.step штук через config.interval мс.
 */

let config = {
 	interval: 200, // Инетрвал с которым подгружаются картинки, мс
 	step: 20, // Количество картинок загружающихся одновременно
 	progressCb: () => {},
	baseUrl: 'https://valaam.ru'
 };

class ImagePreloader {
	constructor(params = {}) {
		let {interval, step, progressCb} = Object.assign({}, config, params);

		this.interval = interval;
		this.step = step;

		this.working = false;
		this.timerId = 0;

		this.images = [];
		this.progressCb = progressCb;

		this.loaded = 0;
		this.total = 0;
	}

	start() {
		if (this.working) return;
		this.working = true;

		if (this.timerId) {
			clearTimeout(this.timerId);
		}

		this.timerId = setTimeout(this.preload.bind(this), this.interval);
	}

	stop() {
		if (this.timerId) {
			clearTimeout(this.timerId);
		}
		this.timerId = 0;
		this.working = false;
	}

	add(src) {
		this.images.push(src);
		this.total++;
	}

	async preload() {
		let len = this.images.length;
		if (!len) {
			return this.stop();
		}

		let images = this.images.splice(len - this.step, this.step);
		await Promise.all(images.map((src) => new Promise((resolve) => {
			let img = new Image();
			img.onload = img.onerror = () => resolve();
			img.src = config.baseUrl + src;
		})));

		let lastProgress = this.progress();
		this.loaded += images.length;
		let progress = this.progress();
		if (progress - lastProgress >= 1) {
			this.progressCb(progress);
		}
		console.log(`${this.loaded} загружено, ${this.images.length} осталось`);

		this.timerId = setTimeout(this.preload.bind(this), this.interval);
	}

	progress() {
		return Math.floor((100 * this.loaded / this.total));
	}
}

export default ImagePreloader;
