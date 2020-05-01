
import {Request} from 'framework7';

let app;

function init(appInstance) {
	app = appInstance;
}

function isMobile() {
	return app.width < 768 || app.height < 768;
}

/**
 * Байты в человекочитаемую строку
 * @param  {integer} bytes    Кол-во байт
 * @param  {integer} [decimals] Кол-во точек после запятой
 * @param  {integer} [wrapDigit] Оборачиваем цифры в класс
 * @return {string}
 */
function bytesToSize(bytes, {decimals = 0, wrapDigit = true} = {}) {
	if (bytes == 0) return `${printDigit(0)} Байт`;
  var k = 1024,
    dm = decimals <= 0 ? 0 : decimals,
    sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'TБ', 'ПБ', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${printDigit((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;

	function printDigit(digit) {
		return `${wrapDigit ? `<span class="digit">${digit}</span>` : digit}`;
	}
}

function getProgressResponse(response, progress) {
	let reader = response.body.getReader();

	return new Response(
		new ReadableStream({
			start(controller) {
				read();
				async function read() {
					try {
						let {done, value} = await reader.read();
						if (done) {
							controller.close();
							return;
						}
						progress(value.byteLength);
						controller.enqueue(value);
						read(controller);
					} catch(err) {
						console.log('ReadableStream error:', err.name, err.message);
						controller.error(err);
						//throw err;
					}
				}
			}
		}),
		{
			status: response.status,
			statusText:	response.statusText,
			headers: response.headers
		}
	);
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [signal] Сигнал отмены
 * @return {Promise} Promise должен возвращать [данные, размер]
 */
async function fetchJson(url, {params = {}, signal, progress} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});

	if (!response.ok) {
		return null;
	}

	if (progress) {
		const contentLength = response.headers.get('data-length');
		const total = parseInt(contentLength, 10);
		let loaded = 0;

		response = getProgressResponse(response, (chunk) => {
			loaded += chunk;
			progress({loaded, total, chunk});
		});
	}

	return await response.json();
}

async function fetchJson2(url, {params = {}, signal, start, progress} = {}) {
	let {data, xhr, status} = await Request.promise({
		url,
		data: params,
		dataType: 'json',
		beforeSend:	(xhr) => {
			if (signal) {
				let onAbort = () => {xhr.abort()};
				signal.addEventListener('abort', onAbort);
				xhr.onloadend = () => {
					signal.removeEventListener('abort', onAbort);
				};
			}

			if (progress) {
				let prevLoaded = 0;
				xhr.onprogress = ({loaded, total}) => {
					progress({
						loaded,
						total,
						chunk: loaded - prevLoaded
					});
					prevLoaded = loaded;
				};
			}
			if (start) {
				xhr.loadstart = start;
			}
		}
	});

	if (status != 200) {
		return null;
	}

	return data;
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchBlob(url, {params = {}, signal, progress} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});

	if (!response.ok) {
		return null;
	}

	if (progress) {
		const contentLength = response.headers.get('content-length');
		const total = parseInt(contentLength, 10);
		let loaded = 0;

		response = getProgressResponse(response, (chunk) => {
			loaded += chunk;
			progress({loaded, total, chunk});
		});
	}

	return await response.blob();
}

/**
 * Добавляет параметры к урл
 * @param {string} url Урл без параметров
 * @param {Object} params Объект с параметрами
 * @return {string}
 */
function formatUrl(url, params) {
	let urlParams = Object.keys(params).map((key) => {
		return key + '=' + encodeURIComponent(params[key]);
	}).join('&');
	if (urlParams) urlParams = (url.indexOf('?') === -1 ? '?' : '&') + urlParams;
	return url + urlParams;
}

/**
 * Размер json в байтах
 * @param  {Object} json
 * @return {number}
 */
function jsonSize(json) {
	let str = JSON.stringify(json);

	if (TextEncoder) {
		return (new TextEncoder().encode(str)).length;
	}

	let m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

/**
 * navigator.onLine always true!!!
 * @return {Boolean} [description]
 */
async function isOnline() {

	// TODO: использовать navigator.onLine !!
	// Пока navigator.onLine всегда true
	isOnline.date = isOnline.date || 0;
	if (new Date - isOnline.date < 300) {
		return isOnline.cache;
	}

	try {
		await fetch('images/default.png?sid=' + Math.random());
		isOnline.cache = true;
	} catch (err) {
		isOnline.cache = false;
	}

	isOnline.date = new Date;
	return isOnline.cache;
}

export {
	init,
	isMobile,
	bytesToSize,
	fetchJson,
	fetchBlob,
	formatUrl,
	jsonSize,
	isOnline
};
