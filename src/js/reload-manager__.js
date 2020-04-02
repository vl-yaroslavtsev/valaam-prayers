/**
 * Клиентский код для serviсeWorker
 * Запускает serviсeWorker и управляет обновлением офлайн данных.
 */
import {unixNow} from './date-utils.js';
import ReloaderWorker from './reloader.wkr.js';
import ImagePreloader from './image-preloader.js';
import db 			  from './data/db.js';

let app;

/**
 * Минимальный размер офлайн-данных для обновления в Мб,
 * для которого обновляем втихую, без запроса пользоватлею.
 */
const RELOAD_CONFIRM_MIN_SIZE_MB = 5;

/**
 * Количество отказов обновиться,
 * после которых не будет показываться запрос на обновление.
 */
const RELOAD_CONFIRM_REJECT_MAX_COUNT = 3;

/**
 * Период времени в секундах,
 * в течение которого запрос на обновление не показывается
 */
const RELOAD_CONFIRM_TIMEOUT_SEC = 24 * 3600;

/**
 * Минимально доступное пространство для обновления данных
 */
const MIN_STORAGE_AVAILABLE_TO_RELOAD_MB = 5;

function init(appInstance) {
	app = appInstance;
	app.methods.storageSet('reload-working');
}

async function preload() {
	if (!navigator.onLine) return;

	let {status, size, count} = await reloadAction('check');

	if (status !== 'need-update') return;

	let sizeMb = {
		data: Math.round(size.data / 1024),
		image: Math.round(size.image / 1024)
	};
	console.log(`[reload-manager] preload: status = ${status}, sizeMb = ,`, sizeMb,
							`, count = `, count);


	let {usageMb, quotaMb} = await getQuota();

	console.log(`[reload-manager] preload: usage / quota: ${usageMb} / ${quotaMb} MB`);

	// Размер обновления превышает место для хранения
	if (quotaMb - usageMb < MIN_STORAGE_AVAILABLE_TO_RELOAD_MB) {
		return 'few-available-space';
	}

	if (sizeMb.data + MIN_STORAGE_AVAILABLE_TO_RELOAD_MB > quotaMb) {
		return reloadAction('base');
	}

	try {
		// Если размер меньше RELOAD_CONFIRM_MIN_SIZE_MB мегабайт,
		// обновляем без вопросов.
		if (sizeMb.data <= RELOAD_CONFIRM_MIN_SIZE_MB) {
			return reloadAction('full');
		}

		let result = await confirmReloadData(sizeMb, quotaMb);
		// Обновляем базовые данные для офлайн версии
		if (!result) {
			return; // reloadAction('base');
		}

		return processReloadUI(result);

	} catch (err) {
		console.log('[reload-manager] preload() Error: ', err);
	}
}

async function download() {
	if (!navigator.onLine) {
		app.dialog.alert(
			`Скачивание невозможно.<br>
			 Вы не подключениы к сети Интернет`,
			'Оффлайн версия'
		);
		return;
	};

	try {
		app.preloader.show();

		let {status, size, count} = await reloadAction('force-check');

		app.preloader.hide();

		if (status !== 'need-update') {
			app.dialog.alert(
				`У Вас самые свежие данные.<br>
				 Обновление не требуется`,
				'Офлайн версия'
			);
			return;
		}

		let sizeMb = {
			data: Math.round(size.data / 1024),
			image: Math.round(size.image / 1024)
		};
		console.log(`[reload-manager] preload: status = ${status}, sizeMb = ,`, sizeMb,
								`, count = `, count);


		let {usageMb, quotaMb} = await getQuota();

		console.log(`[reload-manager] download: usage / quota: ${usageMb} / ${quotaMb} MB`);

		// Размер обновления превышает место для хранения
		if (quotaMb - usageMb < MIN_STORAGE_AVAILABLE_TO_RELOAD_MB ||
		    sizeMb.data + MIN_STORAGE_AVAILABLE_TO_RELOAD_MB > quotaMb) {
			app.dialog.alert(
				`На Вашем устройстве недостаточно места для хранения офлайн версии`,
				'Оффлайн версия'
			);
			return;
		}

		let result = await confirmReloadData(sizeMb, quotaMb, true);
		// Обновляем базовые данные для офлайн версии
		if (!result) {
			return; // reloadAction('base');
		}

		return processReloadUI(result);

	} catch (err) {
		console.log('[reload-manager] download() Error: ', err);
		app.preloader.hide();
	}
}

/**
 * Спрашиваем у пользователя обновлять ли офлайн данные.
 * Возвращает Promise, который разрешается в true, если данные обновлены, false - если отказ.
 * @param {Object} sizeMb Размер обновляемых данных
 * @param {number} quotaMb Размер хранилища
 * @param {boolean} force Принудильно спрашиваем
 * @return {Promise}
 */
function confirmReloadData(sizeMb, quotaMb, force = false) {
	let msg = `
		<p>
		Доступно обновление для офлайн версии молитвослова и календаря.
		</p>
		<p>
			<label class="radio">
				<input type="radio"
							 id="confirm-reload-data"
							 name="reload-data"
							 value="${sizeMb.data}"
							 checked>
				<i class="icon-radio"></i>
			</label>
			<label for="confirm-reload-data"
						 class="margin-left-half">данные: ${sizeMb.data} Мб</label>
			${(quotaMb > sizeMb.data + sizeMb.image + MIN_STORAGE_AVAILABLE_TO_RELOAD_MB) ? `
				<br/>
				<label class="radio">
					<input type="radio"
								 id="confirm-reload-image"
								 name="reload-data"
								 value="${sizeMb.data + sizeMb.image}">
					<i class="icon-radio"></i>
				</label>
				<label for="confirm-reload-image"
							 class="margin-left-half">данные + иконы: ${sizeMb.data + sizeMb.image} Мб</label>
			` : ''}
		</p>
		<p>
			Загрузить <span class="total-size">${sizeMb.data}</span> Мб?
		</p>
	`;

	return new Promise(function(resolve, reject) {
		let confirmTs = app.methods.storageGet('reload-confirm-ts') * 1;
		let rejectCount = app.methods.storageGet('reload-confirm-reject') * 1;

		if (!force) {
			if (rejectCount >= RELOAD_CONFIRM_REJECT_MAX_COUNT) {
				return resolve(false);
			}

			if (unixNow() - confirmTs < RELOAD_CONFIRM_TIMEOUT_SEC) {
				return resolve(false);
			}
		}

		let dialog = app.dialog.confirm(
			msg,
			'Оффлайн версия',
			() => {
				app.methods.storageSet('reload-confirm-ts', unixNow());
				resolve({
					useImages: dialog.$el.find('#confirm-reload-image:checked').length
				});
			},
			() => {
				app.methods.storageSet('reload-confirm-ts', unixNow());
				if (!force) {
					app.methods.storageSet('reload-confirm-reject', ++rejectCount);
				}
				resolve(false);
			});

		dialog.$el.on('change', '[type="radio"]', (e) => {
			let $el = dialog.$el;
			let totalSize = $el.find('[type="radio"]:checked')[0].value * 1;
			$el.find('.total-size').text(totalSize);
		});
	});
}

/**
 * Обновляем данные, отображая прогресс для пользователя
 * @return {Promise}
 */
async function processReloadUI({useImages}) {
	let toast = app.toast.create({
		text: `
			Загрузка <span class="toast-type">данных</span>
			для офлайн версии: <span class="toast-progress">0</span>%.<br>
			Пожалуйста, не переходите на другие вкладки.
		`,
		destroyOnClose: true
	});

	toast.open();

	try {
		app.methods.storageSet('reload-working', true);

		let data = await reloadAction('full',	{
			useImages,
			progressCb: ({type, progress}) => {
				if (type === 'image') {
					toast.$el.find('.toast-type').text('картинок');
				}
				toast.$el.find('.toast-progress').text(progress);
			}
		});

		toast.close();

		toast = app.toast.create({
			text: 'Данные загружены! Теперь можно использовать молитвослов и календарь офлайн',
			closeButton: true,
			destroyOnClose: true
		});
		toast.open();
		app.methods.storageSet('reload-working');
		return data;
	} catch(err) {
		toast.close();
		let errMessage = err.message;
		app.methods.storageSet('reload-working');

		if (err.name === 'QuotaExceededError') {
			errMessage = 'Недостаточно места на устройстве.'
		}

		console.log('[reload-manager.js] processReloadUI: Ошибка загрузки данных ', err);
		toast = app.toast.create({
			text: `Ошибка при загрузке. Оффлайн данные загружены не полностью.
						 ${errMessage}`,
			closeButton: true,
			cssClass: 'bg-color-red',
			destroyOnClose: true
		});
		toast.open();
	}
}

/**
 * Отправлем сообщение для Worker reloader.wrk.js и ждём ответа
 * @param {Object|string} msg
 * @param {Function} [progressCb] Коллбэк для получения прогресса
 * @return {Promise}
	 */
function reloadAction(msg, {progressCb = ()=>{}, useImages = false} = {}) {
	let worker = new ReloaderWorker();
	let imagePreloader = new ImagePreloader();

	console.log('[reload-manager] reloadAction() msg:', msg);

	return new Promise(function(resolve, reject) {

		// Handler for recieving message reply from service worker
		worker.onmessage = function ({data}) {
			if (data.type === 'progress') {
				return progressCb({
					type: 'data',
					progress: data.progress
				});
			}

			if (data.type === 'image') {
				//console.log('[reload-manager] event image ', event.data.src);
				if (useImages) {
					imagePreloader.add(data.src);
					imagePreloader.start();
				}
				return;
			}

			worker.terminate();

			if (data.error) {
				imagePreloader.stop();
				reject(data.error);
			} else {
				if (imagePreloader.working) {
					return imagePreloader.progressCb = (progress) => {
						if (progress < 100) {
							return progressCb({
								type: 'image',
								progress
							});
						}

						resolve(data);
					};
				}
				resolve(data);
			}
		};

		// Send message to service worker along with port for reply
		worker.postMessage({
			action: msg,
			useImages
		});
	});
};

/**
 * Получаем количество доступного и использованного пространства для хранения данных
 * @return {Promise}
 */
async function getQuota() {
	if ('storage' in navigator && 'estimate' in navigator.storage) {
		let {usage, quota} = await navigator.storage.estimate();
		return {
			usageMb: Math.round(usage / (1024 * 1024)),
			quotaMb: Math.round(quota / (1024 * 1024))
		};
	}

	if ('webkitTemporaryStorage' in navigator) {
		return new Promise(function(resolve, reject) {
			navigator.webkitTemporaryStorage.queryUsageAndQuota (
				(usage, quota) => {
					resolve({
						usageMb: Math.round((usage / (1024 * 1024))),
						quotaMb: Math.round((quota / (1024 * 1024)))
					});
				},
				function(ex) {reject(ex);}
			);
		});
	}

	return {
		usageMb: 0,
		quotaMb: Infinity
	};
}

/**
 * Тестируем фичи клиента.
 */
async function testFitures() {
	let msg = ''; // sdfas

	if (navigator.serviceWorker) {
		//navigator.serviceWorker.register('./sw-phonegap.js');
		msg += 'ServiceWorker: да<br>';
	} else {
		msg += 'ServiceWorker: нет<br>';
	}

	if ('onLine' in navigator) {
		msg += 'navigator.onLine: да, ' + navigator.onLine + '<br>';
	} else {
		msg += 'navigator.onLine: нет<br>';
	}

	if (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB) {
		msg += 'indexedDB: да<br>';
	} else {
		msg += 'indexedDB: Нет<br>';
	}

	msg = msg + 'UA: ' + navigator.userAgent + '<br>';


	let quota = await getQuota();
	msg = msg + `Использовано: ${quota.usageMb} из ${quota.quotaMb} МБ<br>`;

	await (async function _testBlobImg() {
		let blob, result;
		let src2 = 'https://valaam.ru/upload/iblock/59f/59fcea0d296ab35820997e98bed8c3bd.jpg';
		result = '';
		try {
			let response = await fetch(src2);
			if (!response.ok) throw new Error('Bad fetch response');
			blob = await response.blob();
			await db.images.put({
				url: src2,
				image: blob
			});
			result = 'ok';
		} catch(err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `икона сохранена в БД: ${result}<br>`;

		result = '';
		blob = null;
		let blobUrl;
		try {
			({image: blob} = await db.images.get(src2));
	 		if (!blob) {
				throw new Error('no blob found');
			}
			blobUrl = URL.createObjectURL(blob);
			result = 'ok';
		} catch (err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `икона из БД: ${result} <img height="30px" src="${blobUrl}"><br>`;
	}) ();

	app.dialog.alert(msg);
}

export default {init, preload, download, testFitures};
