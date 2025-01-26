interface FormatOptions {
  decimals?: number;
  wrapDigit?: boolean;
}

interface QuotaResult {
  usage: number;
  free: number;
  quota: number;
}

interface Device {
  os: string;
  osVersion: string;
  ios: boolean;
  ipad: boolean;
  iphone: boolean;
  ipod: boolean;
  macos: boolean;
  android: boolean;
  androidChrome: boolean;
}

interface TestImage {
  url: string;
  image: Blob;
}

/**
 * Преобразует байты в человекочитаемую строку
 */
const bytesToSize = (
  bytes: number,
  { decimals = 0, wrapDigit = true }: FormatOptions = {},
): string => {
  const UNITS = ["Байт", "КБ", "МБ", "ГБ", "TБ", "ПБ", "EB", "ZB", "YB"];
  const BYTES_IN_KB = 1024;

  const formatDigit = (digit: string | number): string => {
    return wrapDigit ? `<span class="digit">${digit}</span>` : String(digit);
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
 */
const getQuota = async (): Promise<QuotaResult> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();
    return {
      usage: usage || 0,
      free: (quota || 0) - (usage || 0),
      quota: quota || 0,
    };
  }

  if ("webkitTemporaryStorage" in navigator) {
    return new Promise((resolve, reject) => {
      (navigator as any).webkitTemporaryStorage.queryUsageAndQuota(
        (usage: number, quota: number) => {
          resolve({
            usage,
            free: quota - usage,
            quota,
          });
        },
        reject,
      );
    });
  }

  throw new Error("Storage API not supported");
};

/**
 * Открываем БД для тестирования
 * @returns {Promise<IDBDatabase>}
 */
const openTestDb = async (): Promise<IDBDatabase> => {
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    let openRequest = indexedDB.open("valaam-test-db", 1);

    // создаём хранилище объектов для images, если ешё не существует
    openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest;
      if (!target) return;
      const db = target.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "url" });
      }
    };

    openRequest.onsuccess = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      resolve(db);
    };

    openRequest.onerror = function () {
      reject(openRequest.error);
    };
  });

  return promise;
};

const putImgToDb = async (db: IDBDatabase, image: TestImage) => {
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

const getImgFromDb = (
  db: IDBDatabase,
  url: string,
): Promise<TestImage | null> => {
  const promise = new Promise<TestImage | null>((resolve, reject) => {
    const transaction = db.transaction("images"); // (1)

    // получить хранилище объектов для работы с ним
    const images = transaction.objectStore("images"); // (2)
    const request = images.get(url);

    request.onsuccess = function () {
      if (request.result !== undefined) {
        resolve(request.result as TestImage);
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
const testBrowser = async (device: Device): Promise<string> => {
  let msg = "";

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

  if (window.indexedDB) {
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
    const src2 =
      "https://molitvoslov.valaam.ru/upload/iblock/59f/59fcea0d296ab35820997e98bed8c3bd.jpg";
    let saveResult = "";
    let getResult = "";
    let blobUrl;

    try {
      const response = await fetch(src2);
      if (!response.ok) throw new Error("Bad fetch response");

      const blob = await response.blob();
      const db = await openTestDb();

      await putImgToDb(db, {
        url: src2,
        image: blob,
      });
      saveResult = "ok";

      const img = await getImgFromDb(db, src2);
      if (!img) {
        throw new Error("no blob found");
      }
      blobUrl = URL.createObjectURL(img.image);
      getResult = "ok";
    } catch (err: any) {
      saveResult = saveResult || `err: ${err.name}: ${err.message}`;
      getResult = getResult || `err: ${err.name}: ${err.message}`;
    }

    msg = msg + `икона сохранена в БД: ${saveResult}<br>`;
    msg =
      msg +
      `икона из БД: ${getResult} <img height="30px" src="${blobUrl}"><br>`;
  })();

  return msg;
};

export { bytesToSize, getQuota, testBrowser };
