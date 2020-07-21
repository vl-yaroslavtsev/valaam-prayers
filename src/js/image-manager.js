/**
 * Управляем картинками
 */
import { Dom7 as $$ } from 'framework7';
import { isMobile as isMobileDevice } from './utils/utils.js';
import db from './data/db.js';

const SITE_URL = 'https://valaam.ru';

let app;
let inited = false;
let isMobile = true;

/**
 * Инициализация
 * @param  {Framework7} app
 */
function init (appInstance) {
	app = appInstance;
	if (inited) return;

	isMobile = isMobileDevice();

	app.on('pageBeforeRemove', (page) => {
		revoke(page.$el);
	});

	app.root.on('click', '.page-current img[data-src-full]', (e) => {
		imgFullscreen(e.target);
	});

	inited = true;
}

/**
 * Получаем URL картинки: онлайн или офлайн, для мобильного или для планшета
 * @param  {string} s          URL для мобильника, онлайн
 * @param  {string} [m]        URL для планшета, онлайн
 * @param  {string} [sOffline] URL для мобильника, офлайн
 * @param  {string} [mOffline] URL для планшета, офлайн
 * @return {string}          [description]
 */
async function getUrl({s, m, sOffline, mOffline}) {
	if (!m) m = s;
	if (!sOffline) sOffline = s;
	if (!mOffline) mOffline = m;

	let urlOnline = SITE_URL + (isMobile ? s : m);

	if (navigator.onLine) {
		return urlOnline;
	}

	let urlOffline = isMobile ? sOffline : mOffline;
	let image = await db.images.get(urlOffline);
	if (!image) {
		return urlOnline;
	}
	let {raw, type} = image;
	let blob = new Blob([raw], {type});

	return URL.createObjectURL(blob);
}

/**
 * Освобождаем память для всех blob: картинок внутри $el
 * @param  {Dom7} $el Родительский элемент
 */
function revoke($el) {
	$el
		.find('img[src^="blob:"],img[data-src^="blob:"],img[data-src-full^="blob:"]')
		.forEach((img) => {
			let $img = $$(img);

			revokeUrl($img.attr('src'));
			revokeUrl($img.data('src'));
			revokeUrl($img.data('src-full'));
		});
}

/**
 * Освобождаем память для указанного урл
 * @param  {string} [url]
 */
function revokeUrl(url) {
	if (!url || !url.startsWith('blob:')) return;
	URL.revokeObjectURL(url);
}

/**
 * Раскрываем фото на полный экран,
 * если у него есть атрибут data-src-full
 * @param {HTMLImageElement} el
 */
function imgFullscreen(el) {
	let $el = $$(el);
	let browser = $el.data('photoBrowser');
	let src = $el.attr('data-src-full');

	if (!src) return;

	if (!browser) {
		browser = app.photoBrowser.create({
			photos : [
				{
					url: src,
					caption: $el.attr('title')
				}
			],
			type: 'standalone',
			toolbar: false,
			exposition: true,
			expositionHideCaptions: true,
			theme: 'dark',
			routableModals: false,
			popupCloseLinkText: '<i class="icon material-icons">close</i>',
			swiper: {
				zoom: {
					enabled: true,
					maxRatio: 10,
					minRatio: 1
				}
			}
		});

		$el.data('photoBrowser', browser);
	}
	browser.open();
}

export {init, getUrl, revoke};
