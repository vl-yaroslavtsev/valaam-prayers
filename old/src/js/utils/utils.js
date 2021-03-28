
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

async function getResponseData(response, {progress, type = 'json'}) {
	if (!progress) {
		return await response[type]();
	}

	const header = type === 'json' ? 'data-length' : 'content-length';
	const contentLength = response.headers.get(header);
	const total = parseInt(contentLength, 10) || 0;
	let loaded = 0;
	let isReadableStream = true;
	try {
		new ReadableStream();
	} catch(ex) {
		isReadableStream = false;
	}

	if (!isReadableStream) {
		progress({loaded, total, chunk: 0});
		let data = await response[type]();
		progress({loaded: total, total, chunk: total});
		return data;
	}

	let reader = response.body.getReader();
	response = new Response (
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
						let chunk = value.byteLength
						loaded += chunk;
						progress({loaded, total, chunk});
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

	return await response[type]();
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [signal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchJson(url, {params = {}, signal, progress} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});

	if (!response.ok) {
		return null;
	}

	return await getResponseData(response, {progress, type: 'json'});
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

	return await getResponseData(response, {progress, type: 'blob'});
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchRaw(url, {params = {}, signal, progress} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});

	if (!response.ok) {
		return null;
	}

	const type = response.headers.get('content-type');

	let raw = await getResponseData(response, {progress, type: 'arrayBuffer'});
	return {
		raw,
		type
	};
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

	if (window.TextEncoder) {
		return (new TextEncoder().encode(str)).length;
	}

	let m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

/**
 * Анимация
 * @param  {Object} params
 * @param  {String|Function(Number)} [timing='swing'] Функция состояния (0-1) от времени (0-1).
 * @param  {Function} draw           Отрисовка состояния
 * @param  {Number} [duration=300]   Продолжительность анимации
 * @param  {Function} [end=]         Коллбэк окончания
 * @return {Function}                Отмена анимации
 */
function animate({timing = 'swing', draw, duration = 300, end = () => {}}) {
  let start = performance.now();
  let requestId;

	if (timing == 'swing') {
		timing = (progress) => {
			return 0.5 - (Math.cos(progress * Math.PI) / 2);
		}
	} else if (timing == 'linear') {
		timing = (progress) => {
			return progress;
		}
	}

  requestId = requestAnimationFrame(function animate(time) {
    // timeFraction изменяется от 0 до 1
    let timeFraction = (time - start) / duration;
    if (timeFraction > 1) timeFraction = 1;

    // вычисление текущего состояния анимации
    let progress = timing(timeFraction);

    draw(progress); // отрисовать её

    if (timeFraction < 1) {
      requestId = requestAnimationFrame(animate);
    } else {
			end();
		}
  });

	return () => cancelAnimationFrame(requestId);
}

export {
	init,
	isMobile,
	bytesToSize,
	fetchJson,
	fetchBlob,
	fetchRaw,
	formatUrl,
	jsonSize,
	animate
};
