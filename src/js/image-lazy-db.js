/**
 * Если картинки нет в кэше браузера грузим из БД.
 * Необходмо, чтобы у картинок было lazy
 */

let dataManager;
let blobUrls = {};
let inited = false;

/**
 * Инициализация
 * @param  {Framework7} app
 */
function init (app) {
	if (inited) return;

	dataManager = app.dataManager;

	attach(app.root);

	app.on('pageBeforeRemove', (page) => {
		clear(page.$el);
	});

	inited = true;
}

/**
 * Получаем blob url из БД
 * @param  {string} src Урл картинки
 * @return {Promise}
 */
async function getBlobUrl(src) {
	if (blobUrls[src]) return blobUrls[src];

 	let blob = await dataManager.idb.images.getItem(src);
 	if (!blob) {
		return;
	}

 	let url = URL.createObjectURL(blob);
 	blobUrls[src] = url;

 	return url;
 }

/**
 * Загружаем картинку из БД
 * @param  {Image} img Картинка
 * @param  {string} src Урл
 * @return {Promise}
 */
async function loadImg(img, src) {
 	let url = await getBlobUrl(src);
	if (!url) return;
	img.src = url;
}

/**
 * Загружаем картинку из БД, если ее нет в кэше браузера
 * Картинка должна быть с lazy
 * @param {Dom7} $el Родительский элемент
 */
function attach($el) {
	$el.on('lazy:error',  (event) => {
		let img = event.target;
		if (!img.dataset.srcDb) return;
		loadImg(img, img.dataset.srcDb);
	});
}

/**
 * Отключаем загрузку картинок из БД, освобождаем память.
 * Картинка должна быть с lazy
 * @param  {Dom7} $el Родительский элемент
 */
function clear($el) {
	$el
		.find('img[src^="blob:"]')
		.forEach((img) => {
			revoke({blobUrl: img.src, url: img.dataset.srcDb});
		});
}

/**
 * Освобождаем ресурсы blob
 * @param {string} src Blob URL
 */
function revoke({blobUrl, url}) {
	URL.revokeObjectURL(blobUrl);
	delete blobUrls[url];
}

export default {init};
