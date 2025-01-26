/** ServiceWorker для мобильного приложения phonegap
 * Кэширует статические и динамические запросы на стороне клиента
 * Должен быть в корне сайта в связи с ограничением scope,
 * т.к. грузит ресурсы из разных папок (/prayers.f7 и /phonegap)  */

import localforage from 'localforage/src/localforage.js';

const config = {
	app: {
		ver: 'v2',
		name: 'valaam-phonegap'
	},
	db_name: 'valaam-phonegap',

	// ссылки на кэшируемые файлы
	assets: [
		'/prayers.f7/fonts/Circe-Light.woff2',
		'/prayers.f7/fonts/Circe-Regular.woff2',
		'/prayers.f7/fonts/Circe-Bold.woff2',
		'/prayers.f7/fonts/MaterialIcons-Regular.woff2',
		'/prayers.f7/fonts/Geometria-Medium.woff2',

		'/prayers.f7/fonts/fa-brands-400.woff2',
		'/prayers.f7/fonts/Triodion.woff2',
		'/prayers.f7/fonts/PonomarUnicode.otf',
		'/prayers.f7/fonts/PonomarUnicode.woff',

		'/prayers.f7/images/bg.jpg',
		'/prayers.f7/images/default.png',
		'/local/templates/valaam/images/ideograph-1.png',
		'/local/templates/valaam/images/ideograph-2.png',
		'/local/templates/valaam/images/ideograph-3.png',
		'/local/templates/valaam/images/ideograph-4.png',
		'/local/templates/valaam/images/ideograph-5.png',

		'/prayers.f7/css/framework7.bundle.min.css',
		'/prayers.f7/css/icons.css',
		'/prayers.f7/css/app.css',
		'/prayers.f7/css/vm.css',

		'/prayers.f7/',
		'/prayers.f7/favicon.ico',
		'/prayers.f7/pages/prayers.html',
		'/prayers.f7/pages/calendar.html',
		'/prayers.f7/pages/calendar-holidays.html',
		'/prayers.f7/pages/calendar-fasting.html',
		'/prayers.f7/pages/rites.html',

		'/prayers.f7/pages/prayers-text.html',
		'/prayers.f7/pages/days.html',
		'/prayers.f7/pages/day-readers.html',
		'/prayers.f7/pages/day-instructions.html',
		'/prayers.f7/pages/day-thoughts.html',
		'/prayers.f7/pages/day-prayers.html',
		'/prayers.f7/pages/saints.html',
		'/prayers.f7/pages/saint-lives.html',
		'/prayers.f7/pages/404.html',

		'/prayers.f7/cordova.js',
		'/prayers.f7/cordova_plugins.js',
		'/prayers.f7/plugins/cordova-plugin-device/www/device.js',
		'/prayers.f7/plugins/cordova-plugin-device/src/browser/DeviceProxy.js',
		'/prayers.f7/js/bundle.min.js',
		'/prayers.f7/js/framework7.bundle.min.js',
		'/prayers.f7/js/routes.js',
		'/prayers.f7/js/app.js',
		'/prayers.f7/js/sw-client.js',
		'/prayers.f7/js/sw-config.js',
		'/prayers.f7/js/reloader.js'
	]
};

config.cache = {
	images: config.app.name + '-images',
	runtime: config.app.name + '-runtime-' + config.app.ver
};

let idbStoreNames = ['saints', 'days', 'prayers', 'stat'];

let strategies = {
	cache: {},
	db: {}
};

self.addEventListener('install', (event) => {
	self.skipWaiting();
	console.log('[sw] installing...');

	// Ждем загрузки базовых ресурсов для оффлайн версии, без них ServiceWorker не запустится
	event.waitUntil(

		caches
			.open(config.cache.precache)
			.then(cache => {
				return config.assets.forEach(el => {
					cache.match(el).then(found => {
						if (!found) cache.add(el);
					});
				});
			})
	);
});

self.addEventListener('activate', (event) => {
	self.clients.claim();
	console.log('[sw] activing...');

	event.waitUntil(
		// Очистка старого кэша
		caches
			.delete(config.cache.runtime)
			.then(() => caches.open(config.cache.precache))
			.then((cache) => Promise.all(cache.keys(), cache))
			.then(([keys, cache]) => {
				let precache = config.cache.precache;
				return keys.forEach(request => {
					const url = new URL(request.url).pathname;
					if (precache.includes(url)) return;
					cache.delete(request);
				});
			})
			.then(() => createDb())
	);
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	let found;

	if (event.request.method != 'GET') return;
	if (url.origin !== location.origin) return;

	// Не обрабатываем api-запросы от worker'а  reloader.js
	if (/\/reloader\.js$/.test(event.request.referrer) &&
		/\phonegap\//.test(url.pathname)) return;

	//console.log('[sw] fetch: ', event);

	// Базовые ресурсы
	if (config.assets.includes(url.pathname)) {
		return event.respondWith(
			strategies.cache.localFirst(event.request, {
				cacheName: config.cache.precache
			})
		);
	}

	// Картинки
	if (/\.(?:png|gif|jpg|jpeg|webp)$/.test(url.pathname)) {
		return event.respondWith(
			strategies.cache.localFirst(event.request, {
				cacheName: config.cache.images,
				default: '/prayers.f7/images/default.png',
				maxEntries: 50
			})
		);
	}

	// Шрифты
	if (/\.(?:woff|woff2|ttf|eot|svg)$/.test(url.pathname) ) {
		return event.respondWith(
			strategies.cache.localFirst(event.request)
		);
	}

	// html, js, css
	if (/\.(?:htm|html|js|css|ico)$/.test(url.pathname)) {
		return event.respondWith(
			strategies.cache.staleWhileRevalidate(event.request)
		);
	}


	// Страницы молитвослова
	if (found = url.pathname.match(/\/phonegap\/prayers\/(\d+)$/)) {
		let idbPrayers = localforage.createInstance({
			name: config.db_name,
			storeName: 'prayers'
		});
		return event.respondWith(
			strategies.db.staleWhileRevalidate(event.request, {
				idbStore: idbPrayers,
				key: found[1],
				default: jsonResponse({error: 'network fail'}, 503)
			})
		);
	}

	// Дни календаря
	if (found = url.pathname.match(/\/phonegap\/days\/(\d+)$/)) {
		let idbDays = localforage.createInstance({
			name: config.db_name,
			storeName: 'days'
		});
		return event.respondWith(
			strategies.db.staleWhileRevalidate(event.request, {
				idbStore: idbDays,
				key: found[1],
				default: jsonResponse({error: 'network fail'}, 503)
			})
		);
	}

	// Святые
	if (found = url.pathname.match(/\/phonegap\/saints\/(\d+)$/)) {
		let idbSaints = localforage.createInstance({
			name: config.db_name,
			storeName: 'saints'
		});
		return event.respondWith(
			strategies.db.staleWhileRevalidate(event.request, {
				idbStore: idbSaints,
				key: found[1],
				default: jsonResponse({error: 'network fail'}, 503)
			})
		);
	}

	// Серверные json из /phonegap/
	if (/\phonegap\//.test(url.pathname))  {
		return event.respondWith(
			strategies.cache.staleWhileRevalidate(event.request)
		);
	}
});

self.addEventListener('message', function(event) {
	console.log('[sw] Handling message event:', event);

	if (event.data.action == 'is-online') {
		event.waitUntil(
			fetch('/phonegap/?referer1=valaam.tour')
				.then(() => {
					event.ports[0].postMessage(true);
				})
				.catch((ex) => {
					event.ports[0].postMessage(false);
				})
		);

	}
});

/**
 * Создаем хранилища в  indexedDB
 */
function createDb() {
	let idbStore = {};

	idbStoreNames.forEach((name) => {
		idbStore[name] = localforage.createInstance({
			name: config.db_name,
			storeName: name
		});

		idbStore[name].setItem('test', 1).then(() => {
		 	idbStore[name].removeItem('test');
		});
	});
}

/**
 * Обработка запроса request
 * Сначала берем из БД, потом смотрим в сеть
 * @param {Request}             request
 * @param {object}              params Значения:
 * @param {localForageInstance} params.idbStore Хранилище
 * @param {string}              params.key Ключ записи
 * @param {Request}             [params.default] Запрос, возвращаемый при ошибке
 * @return {Promise}
 */
strategies.db.localFirst = async function (request, {idbStore, key, default: defResponse}) {
	try {
		let val = await idbStore.getItem(key);
		if (val) {
			return jsonResponse(val);
		}

		let response = await fetch(request);
		if (!response.ok) {
			return defResponse || response;
		}

		let json = await response.clone().json();
		idbStore.setItem(key, json);

		return response;
	} catch (err) {
		console.log('[sw] fetch err', err);
		return defResponse || Response.error();
	}
};

/**
 * Обработка запроса request
 * Сначала берем БД, а потом из обновляем DB из сети.
 * @param {Request}             request
 * @param {Object}              params Значения:
 * @param {localForageInstance} params.idbStore Хранилище
 * @param {string}              params.key Ключ записи
 * @param {Request}             [params.default] Запрос, возвращаемый при ошибке
 * @return {Promise}
 */
strategies.db.staleWhileRevalidate = async function (request, {idbStore, key, default: defResponse}) {
	let val = await idbStore.getItem(key);
	if (val) {
		_fetchAndSave();
		return jsonResponse(val);
	} else {
		return await _fetchAndSave();
	}

	async function _fetchAndSave() {
		try {
			let response = await fetch(request);
			if (!response.ok) {
				return defResponse || response;
			}

			let json = await response.clone().json();
			idbStore.setItem(key, json);

			return response;
		} catch(err) {
			console.log('[sw] fetch err', err);
			return defResponse || Response.error();
		}
	}
};

/**
 * Обработка запроса request
 * Сначала берем из сети, потом смотрим в БД
 * @param {Request}             request
 * @param {Object}              params Значения:
 * @param {localForageInstance} params.idbStore Хранилище
 * @param {string}              params.key Ключ записи
 * @param {Request}             [params.default] Запрос, возвращаемый при ошибке
 * @return {Promise}
 */
strategies.db.networkFirst = async function (request, {idbStore, key, default: defResponse}) {
	try {
		let response = await fetch(request);
		if (!response.ok) {
			let val = await idbStore.getItem(key);
			return val ? jsonResponse(val) : (defResponse || response);
		}

		let json = await response.clone().json();
		idbStore.setItem(key, json);

		return response;
	} catch(err) {
		let val = await idbStore.getItem(key);
		return val ? jsonResponse(val) : (defResponse || Response.error());
	}
};

/**
 * Обработка запроса request
 * Сначала берем из кэша, потом смотрим в сеть
 * @param {Request} request
 * @param {Object}  [params = {}] Значения:
 * @param {string}  [params.cacheName = config.cache.runtime] Название кэша
 * @param {number}  [params.maxEntries] Максимальное количество записей в кэше
 * @param {string}  [params.default] Значение из кэша при ошибке
 * @return {Promise}
 */
strategies.cache.localFirst = async function (request, {
	cacheName = config.cache.runtime,
	maxEntries,
	default: defUrl
} = {}) {
	let cache = await caches.open(cacheName);
	let response = await cache.match(request);
	if (response) return response;

	try {
		response = await fetch(request);
		if (!response.ok) {
			return defUrl ? caches.match(defUrl) : response;
		}

		await cache.put(request, response.clone());
		deleteCacheExceed(cache, maxEntries);

		return response;
	} catch(err) {
		console.log('[sw] fetch err', err);
		return defUrl ? caches.match(defUrl) : Response.error();
	}
};

/**
 * Обработка запроса request
 * Сначала берем из кэша, а потом обновляем кэш из сети.
 * @param {Request} request
 * @param {Object}  [params = {}] Значения:
 * @param {string}  [params.cacheName = config.cache.runtime] Название кэша
 * @param {number}  [params.maxEntries] Максимальное количество записей в кэше
 * @param {string}  [params.default] Значение из кэша при ошибке
 * @return {Promise}
 */
strategies.cache.staleWhileRevalidate = async function (request, {
	cacheName = config.cache.runtime,
	maxEntries,
	default: defUrl
} = {}) {
	let cache = await caches.open(cacheName);
	let response = await cache.match(request);
	if (response) return response;

	try {
		response = await fetch(request);
		if (!response.ok) {
			return defUrl ? caches.match(defUrl) : response;
		}

		await cache.put(request, response.clone());
		deleteCacheExceed(cache, maxEntries);

		return response;
	} catch(err) {
		console.log('[sw] fetch err', err);
		return defUrl ? caches.match(defUrl) : Response.error();
	}
};

/**
 * Обработка запроса request
 * Сначала берем из сети, потом смотрим в кэш
 * @param {Request} request
 * @param {Object}  [params = {}] Значения:
 * @param {string}  [params.cacheName = config.cache.runtime] Название кэша
 * @param {number}  [params.maxEntries] Максимальное количество записей в кэше
 * @param {string}  [params.default] Значение из кэша при ошибке
 * @return {Promise}
 */
strategies.cache.networkFirst = async function (request, {
	cacheName = config.cache.runtime,
	maxEntries,
	default: defUrl
} = {}) {
	let cache = await caches.open(cacheName);

	try {
		let response = await fetch(request);
		if (!response.ok) {
			let resp = await cache.match(request);
			return resp || (defUrl ? caches.match(defUrl) : response);
		}

		await cache.put(request, response.clone());
		deleteCacheExceed(cache, maxEntries);

		return response;
	} catch(err) {
		let resp = await cache.match(request);
		return resp || (defUrl ? caches.match(defUrl) : Response.error());
	}
};

/**
 * Удаляем из кэша старые записи превышающие макс. размер
 * @param  {Cache} cache         Кэш
 * @param  {number} [maxEntries] Макс. размер кэша
 * @return {boolean}             Удлили или нет
 */
async function deleteCacheExceed(cache, maxEntries) {
	let keys = maxEntries ? await cache.keys() : null;
	if (!keys || keys.length <= maxEntries) {
		return false;
	}
	keys.slice(0, keys.length - maxEntries).forEach((key) => {
		cache.delete(key);
	});
	return true;
}

/**
 * Объект с параметрами преобразуем в урл параметры
 * @param {Object} obj Объект с параметрами
 * @return {string}
 */
function objToUrl(obj) {
	return Object.keys(obj).map((key) => {
		return key + '=' + encodeURIComponent(obj[key]);
	}).join('&');
}

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

// Картинки
// registerRoute(
	// /\.(?:png|gif|jpg|jpeg|webp)$/,
	// (event) => {
		// return
	// }
// );

// // Шрифты
// workbox.routing.registerRoute(
	// /\.(?:woff|woff2|ttf|eot|svg)$/,
	// new workbox.strategies.CacheFirst({
		// cacheName: config.cache.fonts,
		// plugins: [
			// new workbox.expiration.Plugin({
				// maxEntries: 15,
				// maxAgeSeconds: 180 * 24 * 60 * 60, // 180 Days
			// }),
		// ],
	// })
// );

// // index page
// workbox.routing.registerRoute(
	// ({url}) => {
		// return (url.pathname === '/prayers.f7/');
	// },
	// new workbox.strategies.StaleWhileRevalidate()
// );

// // html, css, js
// workbox.routing.registerRoute(
	// /\.(?:htm|html|js|css|ico)$/,
	// new workbox.strategies.StaleWhileRevalidate()
// );


// // Серверные json по пути /phonegap/prayers/12345
// workbox.routing.registerRoute(
	// /\/phonegap\/prayers\/(\d+)$/,
	// ({url, event, params}) => {
		// let key = params[0];
		// let idbPrayers = localforage.createInstance({
			// name: config.db_name,
			// storeName: 'prayers'
		// });
		// return DBstrategies.StaleWhileRevalidate(event.request, idbPrayers, key);
	// }
// );

// // Серверные json по пути /phonegap/days/12345
// workbox.routing.registerRoute(
	// /\/phonegap\/days\/(\d+)$/,
	// ({url, event, params}) => {
		// let key = params[0];
		// let idbDays = localforage.createInstance({
			// name: config.db_name,
			// storeName: 'days'
		// });
		// return DBstrategies.StaleWhileRevalidate(event.request, idbDays, key);
	// }
// );

// // Серверные json из /phonegap/
// workbox.routing.registerRoute(
	// /\/phonegap\//,
	// new workbox.strategies.StaleWhileRevalidate()
// );


// workbox.routing.setCatchHandler(({event}) => {
	// console.log('setDefaultHandler for ', event.request);
	// switch (event.request.destination) {
		// case 'image':
			// return caches.match('/prayers.f7/images/transparent_1х1.png');
		// break;

		// case 'font':
			// return caches.match('/prayers.f7/fonts/Circe-Regular.woff2');
		// break;

		// default:
			// // If we don't have a fallback, just return an error response.
			// return Response.error();
	// }
// });
