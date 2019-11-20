/**
 * Клиентский код для serviсeWorker
 * Запускает serviсeWorker и управляет обновлением оффлайн данных.
 */
import moment from 'moment';
import ReloaderWorker from './reloader.wkr.js';
import ImagePreloader from './image-preloader.js';

let app;

/**
 * Минимальный размер оффлайн-данных для обновления в Мб,
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
}

async function preload() {

	if (!navigator.onLine) return;

	let {status, size, count} = await reloadAction('check');

	if (status !== 'need-update') return;

	let sizeMb = {
		data: +(size.data / 1024).toFixed(1),
		image: +(size.image / 1024).toFixed(1)
	};
	console.log(`[reload-manager] preload: status = ${status}, sizeMb = ,`, sizeMb,
							`, count = `, count);

	try {
			let {usageMb, quotaMb} = await getQuota();

			console.log(`[reload-manager] preload: usage / quota: ${usageMb} / ${quotaMb} MB`);

			// Размер обновления превышает место для хранения
			if (quotaMb - usageMb < MIN_STORAGE_AVAILABLE_TO_RELOAD_MB) {
				return 'few-available-space';
			}

			if (sizeMb.data + MIN_STORAGE_AVAILABLE_TO_RELOAD_MB > quotaMb) {
				return reloadAction('base');
			}

			//app.dialog.alert('quota: ' + JSON.stringify(data[1], 2));
			// app.dialog.alert(`[reload-manager] init(): status: ${status}
			//                  ,<br>size: ${sizeMb} MB
			// 								 ,<br>usage / quota: ${usageMb} / ${quotaMb} MB`);
	} catch (ex) {

	}

	try {
		// Если размер меньше RELOAD_CONFIRM_MIN_SIZE_MB мегабайт,
		// обновляем без вопросов.
		if (sizeMb.data <= RELOAD_CONFIRM_MIN_SIZE_MB) {
			return reloadAction('full');
		}

		let result = await confirmReloadData(sizeMb);
		// Обновляем базовые данные для оффлайн версии
		if (!result) {
			return reloadAction('base');
		}

		return processReloadUI(result);

	} catch (err) {
		console.log('[reload-manager] preload() Error: ', err);
	}
}

/**
 * Спрашиваем у пользователя обновлять ли оффлайн данные.
 * Возвращает Promise, который разрешается в true, если данные обновлены, false - если отказ.
 * @param {Object} sizeMb Размер обновляемых данных
 * @return {Promise}
 */
function confirmReloadData(sizeMb) {
	let msg = `
		<p>
		Доступно обновление для оффлайн версии молитвослова и календаря.
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
			<br/>
			<label class="radio">
				<input type="radio"
							 id="confirm-reload-image"
							 name="reload-data"
							 value="${+(sizeMb.data + sizeMb.image).toFixed(1)}">
				<i class="icon-radio"></i>
			</label>
			<label for="confirm-reload-image"
						 class="margin-left-half">данные + иконы: ${+(sizeMb.data + sizeMb.image).toFixed(1)} Мб</label>
		</p>
		<p>
			Загрузить <span class="total-size">${sizeMb.data}</span> Мб?
		</p>
	`;

	return new Promise(function(resolve, reject) {
		let confirmTs = app.methods.storageGet('reload-confirm-ts') * 1;
		let rejectCount = app.methods.storageGet('reload-confirm-reject') * 1;

		if (rejectCount >= RELOAD_CONFIRM_REJECT_MAX_COUNT) {
			return resolve(false);
		}

		if (moment().unix() - confirmTs < RELOAD_CONFIRM_TIMEOUT_SEC) {
			return resolve(false);
		}

		let dialog = app.dialog.confirm(
			msg,
			'Оффлайн версия',
			() => {
				app.methods.storageSet('reload-confirm-ts', moment().unix());
				resolve({
					useImages: dialog.$el.find('#confirm-reload-image:checked').length
				});
			},
			() => {
				app.methods.storageSet('reload-confirm-ts', moment().unix());
				app.methods.storageSet('reload-confirm-reject', ++rejectCount);
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
			для оффлайн версии: <span class="toast-progress">0</span>%.
		`,
		destroyOnClose: true
	});

	toast.open();

	try {
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
			text: 'Данные успешно загружены!',
			closeButton: true,
			destroyOnClose: true,
			closeTimeout: 15000
		});
		toast.open();

		return data;
	} catch(err) {
		toast.close();
		let errMessage = err.message;

		if (err.name === 'QuotaExceededError') {
			errMessage = 'Недостаточно места на устройстве.'
		}

		toast = app.toast.create({
			text: `Ошибка при загрузке. Оффлайн данные загружены не полностью.
						 ${errMessage}`,
			closeButton: true,
			cssClass: 'bg-color-red',
			destroyOnClose: true,
			closeTimeout: 15000
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
			usageMb: +(usage / (1024 * 1024)).toFixed(1),
			quotaMb: +(quota / (1024 * 1024)).toFixed(1)
		};
	}

	if ('webkitTemporaryStorage' in navigator) {
		return new Promise(function(resolve, reject) {
			navigator.webkitTemporaryStorage.queryUsageAndQuota (
				(usage, quota) => {
					resolve({
						usageMb: +(usage / (1024 * 1024)).toFixed(1),
						quotaMb: +(quota / (1024 * 1024)).toFixed(1)
					});
				},
				function(ex) {reject(ex);}
			);
		});
	}

	throw new Error('quota-not-available');
}

/**
 * Тестируем фичи клиента.
 */
async function testFitures() {
	let msg = ''; // sdfas

	if (navigator.serviceWorker) {
		//navigator.serviceWorker.register('./sw-phonegap.js');
		msg += 'ServiceWorker: yes<br>';
	} else {
		msg += 'ServiceWorker: no<br>';
	}

	if ('onLine' in navigator) {
		msg += 'navigator.onLine: yes, value: ' + navigator.onLine + '<br>';
	} else {
		msg += 'navigator.onLine: no<br>';
	}

	if (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB) {
		msg += 'indexedDB: yes<br>';
	} else {
		msg += 'indexedDB: no<br>';
	}

	msg = msg + 'UA: ' + navigator.userAgent + '<br>';

	if ('storage' in navigator && 'estimate' in navigator.storage) {
		let {usage, quota} = await navigator.storage.estimate();
		let percentUsed = Math.round(usage / quota * 100);
		let usageInMib = Math.round(usage / (1024 * 1024));
		let quotaInMib = Math.round(quota / (1024 * 1024));
		let details = `estimate: ${usageInMib} out of ${quotaInMib} MiB used (${percentUsed}%)<br>`;

		msg = msg + details;
	}

	if ('webkitTemporaryStorage' in navigator) {
		let {used, granted} = await new Promise(function(resolve, reject) {
			navigator.webkitTemporaryStorage.queryUsageAndQuota (
				(used, granted) => resolve({used, granted}),
				(e) => reject(e)
			);
		});

		let percentUsed = Math.round(used / granted * 100);
		let usageInMib = Math.round(used / (1024 * 1024));
		let quotaInMib = Math.round(granted / (1024 * 1024));
		let details = `webkitTemporaryStorage: ${usageInMib} out of ${quotaInMib} MiB used (${percentUsed}%)<br>`;

		msg = msg + details;
	}

	await (async function _testBlobImg() {
		let blob, result;
		let src = '/upload/iblock/cd4/cd421e9680e52c2b4aef5a8d2aa1f370.jpg';
		result = await new Promise((resolve) => {
			let img = new Image();
			img.onload = () => resolve(true);
			img.onerror = () => resolve(false);
			img.src = src;
		});
		msg = msg + `new Image() load: ${result}<br>`;
		msg = msg + `image from disk cache : <img height="50px" src="https://valaam.ru${src}"><br>`;

		let src2 = 'https://valaam.ru/upload/iblock/59f/59fcea0d296ab35820997e98bed8c3bd.jpg';
		result = '';
		try {
			let response = await fetch(src2);
			if (!response.ok) throw new Error('Bad fetch response');
			blob = await response.blob();
			await app.dataManager.idb.images.setItem(src2, blob);
			result = 'ok';
		} catch(err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `image saved to db: ${result}<br>`;

		result = '';
		blob = null;
		let blobUrl;
		try {
			blob = await app.dataManager.idb.images.getItem(src2);
	 		if (!blob) {
				throw new Error('no blob found');
			}
			blobUrl = URL.createObjectURL(blob);
			result = 'ok';
		} catch (err) {
			result = `err: ${err.name}: ${err.message}`;
		}
		msg = msg + `image from db: ${result} <img height="50px" src="${blobUrl}"><br>`;
	}) ();

	app.dialog.alert(msg);
}

export default {init, preload, testFitures};
