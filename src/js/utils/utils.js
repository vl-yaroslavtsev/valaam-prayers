
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
 * @param {AbortSignal} [abortSignal] Сигнал отмены
 * @return {Promise} Promise должен возвращать данные
 */
async function fetchJson(url, params = {}, abortSignal) {
	let response = await fetch(formatUrl(url, params), {
		signal: abortSignal
	});
	if (!response.ok) {
		throw new Error(`Bad fetch response. Status: ${response.status}`);
	}

	return await response.json();
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
	formatUrl
};
