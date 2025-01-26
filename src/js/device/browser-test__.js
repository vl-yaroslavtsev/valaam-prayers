/**
 * Преобразует байты в человекочитаемую строку
 * @param {number} bytes Количество байт
 * @param {Object} options Параметры форматирования
 * @param {number} [options.decimals=0] Количество знаков после запятой
 * @param {boolean} [options.wrapDigit=true] Оборачивать ли цифры в HTML-класс
 * @return {string} Отформатированная строка с размером
 */
const bytesToSize = (bytes, { decimals = 0, wrapDigit = true } = {}) => {
  const UNITS = ["Байт", "КБ", "МБ", "ГБ", "TБ", "ПБ", "EB", "ZB", "YB"];
  const BYTES_IN_KB = 1024;

  const formatDigit = (digit) => {
    return wrapDigit ? `<span class="digit">${digit}</span>` : digit;
  };

  if (bytes === 0) {
    return `${formatDigit(0)} ${UNITS[0]}`;
  }

  const exponent = Math.floor(Math.log(bytes) / Math.log(BYTES_IN_KB));
  const value = (bytes / Math.pow(BYTES_IN_KB, exponent)).toFixed(
    Math.max(0, decimals),
  );

  return `${formatDigit(value)} ${UNITS[exponent]}`;
};

/**
 * Получаем количество доступного и использованного пространства для хранения данных
 * @return {Promise}
 */
const getQuota = async () => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();
    return {
      usage,
      free: quota - usage,
      quota,
    };
  }

  if ("webkitTemporaryStorage" in navigator) {
    return new Promise(function (resolve, reject) {
      navigator.webkitTemporaryStorage.queryUsageAndQuota(
        (usage, quota) => {
          resolve({
            usage,
            free: quota - usage,
            quota,
          });
        },
        function (ex) {
          reject(ex);
        },
      );
    });
  }
};

const openTestDb = async () => {
  const promise = new Promise((resolve, reject) => {
    let openRequest = indexedDB.open("valaam-test-db", 1);

    // создаём хранилище объектов для books, если ешё не существует
    openRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("images")) {
        // если хранилище "images" не существует
        db.createObjectStore("images", { keyPath: "url" }); // создаём хранилище
      }
    };

    openRequest.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    openRequest.onerror = function () {
      reject(openRequest.error);
    };
  });

  return promise;
};

const putImgToDb = async (db, image) => {
  const promise = new Promise((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite"); // (1)

    // получить хранилище объектов для работы с ним
    const images = transaction.objectStore("images"); // (2)
    const request = images.put(image); // (3)

    request.onsuccess = function () {
      // (4)
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });

  return promise;
};

const getImgFromDb = (db, url) => {
  const promise = new Promise((resolve, reject) => {
    const transaction = db.transaction("images"); // (1)

    // получить хранилище объектов для работы с ним
    const images = transaction.objectStore("images"); // (2)
    const request = images.get(url);

    request.onsuccess = function () {
      if (request.result !== undefined) {
        resolve(request.result); // массив книг с ценой 10
      } else {
        resolve(null);
      }
    };

    request.onerror = function () {
      reject(request.error);
    };
  });

  return promise;
};

/**
 * Тестируем фичи клиента.
 */
const testBrowser = async (device) => {
  let msg = ""; // sdfas

  if (navigator.serviceWorker) {
    //navigator.serviceWorker.register('./sw-phonegap.js');
    msg += "ServiceWorker: да<br>";
  } else {
    msg += "ServiceWorker: нет<br>";
  }

  if ("onLine" in navigator) {
    msg += "navigator.onLine: да, " + navigator.onLine + "<br>";
  } else {
    msg += "navigator.onLine: нет<br>";
  }

  if (
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB
  ) {
    msg += "indexedDB: да<br>";
  } else {
    msg += "indexedDB: нет<br>";
  }

  if ("serviceWorker" in navigator && "BackgroundFetchManager" in window) {
    msg += "BackgroundFetch: да<br>";
  } else {
    msg += "BackgroundFetch: нет<br>";
  }

  msg = msg + "UA: " + navigator.userAgent + "<br>";
  msg = msg + "os: " + device.os + ", osVersion:" + device.osVersion + "<br>";
  msg =
    msg +
    "ios: " +
    device.ios +
    ", ipad:" +
    device.ipad +
    ", iphone: " +
    device.iphone +
    ", ipod: " +
    device.ipod +
    ", macos: " +
    device.macos +
    ", android: " +
    device.android +
    ", androidChrome: " +
    device.androidChrome +
    "<br>";

  let quota = await getQuota();
  msg =
    msg +
    `
	Использовано:
		${bytesToSize(quota.usage, { wrapDigit: false })} из
		${bytesToSize(quota.quota, { wrapDigit: false })}<br>
	`;

  await (async function _testBlobImg() {
    let blob, result, db;
    const src2 =
      "https://molitvoslov.valaam.ru/upload/iblock/59f/59fcea0d296ab35820997e98bed8c3bd.jpg";
    result = "";
    try {
      const response = await fetch(src2);
      if (!response.ok) throw new Error("Bad fetch response");
      blob = await response.blob();
      db = await openTestDb();
      await putImgToDb(db, {
        url: src2,
        image: blob,
      });
      result = "ok";
    } catch (err) {
      result = `err: ${err.name}: ${err.message}`;
    }
    msg = msg + `икона сохранена в БД: ${result}<br>`;

    result = "";
    blob = null;
    let blobUrl;
    try {
      ({ image: blob } = await getImgFromDb(db, src2));
      if (!blob) {
        throw new Error("no blob found");
      }
      blobUrl = URL.createObjectURL(blob);
      result = "ok";
    } catch (err) {
      result = `err: ${err.name}: ${err.message}`;
    }
    msg =
      msg + `икона из БД: ${result} <img height="30px" src="${blobUrl}"><br>`;
  })();

  return msg;
};

export default testBrowser;
