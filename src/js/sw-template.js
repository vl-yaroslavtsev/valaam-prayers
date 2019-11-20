/** Шаблон ServiceWorker для плагина webpack offline  */

// Добавляем обработку запросов с ошибкой по сети
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	if (event.request.method != 'GET') return;
	if (url.origin !== location.origin) return;

	// Картинки
	if (/\.(?:png|gif|jpg|jpeg|webp)$/.test(url.pathname)) {
		return event.respondWith(
			fetchDef(event.request, {
				default: '/prayers.f7/images/default.png',
			})
		);
	}

	// Серверные json из /phonegap/
	if (/\phonegap\//.test(url.pathname))  {
		return event.respondWith(
			fetchDef(event.request, {
				default: jsonResponse({error: 'network fail'}, 503)
			})
		);
	}
});

/**
 * Обработка запроса request
 * Если возникает ошибка, отправляем ответ по умолчанию
 * @param {Request}             request
 * @param {object}              params Значения:
 * @param {Request}             [params.default] Запрос, возвращаемый при ошибке
 * @return {Promise}
 */
async function fetchDef(request, {default: defResponse}) {
	try {
		let response = await fetch(request);
		return response;
	} catch (err) {
		return defResponse || Response.error();
	}
};

/**
 * Возвращаем Response c указанным json-объектом
 * @param {Object|Array} json
 * @return {Response}
 */
function jsonResponse(json, status = 200) {
	var blob = new Blob([JSON.stringify(json)], {type : 'application/json'});
	return new Response(blob, {
		"status": status
	});
}
