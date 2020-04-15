
/**
 * Байты в человекочитаемую строку
 * @param  {integer} bytes    Кол-во байт
 * @param  {integer} [decimals] Кол-во точек после запятой
 * @return {string}
 */
function bytesToSize(bytes, decimals) {
  if (bytes == 0) return '0 Байт';
  var k = 1024,
    dm = decimals <= 0 ? 0 : decimals || 2,
    sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'TБ', 'ПБ', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [signal] Сигнал отмены
 * @return {Promise} Promise должен возвращать [данные, размер]
 */
async function fetchJson(url, {params = {}, signal} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});

	if (!response.ok) {
		return null;
	}
	//response.headers.get('data-length');
	return await response.json();
}

/**
 * Получаем данные из сети в json
 * @param {string}      url Урл для запроса данных
 * @param {Object}      [params] Параметры запроса данных
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchBlob(url, {params = {}, signal} = {}) {
	let response = await fetch(formatUrl(url, params), {
		signal
	});
	if (!response.ok) {
		return null;
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

export {
	bytesToSize,
	fetchJson,
	fetchBlob,
	formatUrl
};
