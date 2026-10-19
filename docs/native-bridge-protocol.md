# Контракт нативного моста v1

Единый протокол между веб-частью (JS) и нативными приложениями Android и iOS. Изменения вносятся только в этот файл, обе нативки и JS-код следуют ему.

### Транспорт

- Все сообщения: JSON-строки.
- Запрос: `{ "id": "string", "method": "db.get", "params": {} }`.
- Ответ: `{ "id": "...", "ok": true, "result": ... }` или `{ "id": "...", "ok": false, "error": { "code": "...", "message": "..." } }`.
- Событие: `{ "event": "download.progress", "data": {} }`.
- Android: JS вызывает `androidJsHandler.rpc(requestJson)` (`@JavascriptInterface`, не блокирует: ставит в очередь). Ответы и события нативка шлёт через `evaluateJavascript("window.__nativeRpc.onMessage(<json-object-literal>)")`. JSON подставляется как литерал без собственного экранирования кавычек.
- iOS: JS вызывает `await window.webkit.messageHandlers.nativeRpc.postMessage(requestJson)`. Нативка реализует `WKScriptMessageHandlerWithReply` и отвечает JSON-строкой с конвертом ответа. События идут через `evaluateJavaScript("window.__nativeRpc.onMessage(<json>)")`.
- Коды ошибок: `UNKNOWN_TABLE`, `INVALID_PARAMS`, `DB_ERROR`, `NETWORK`, `HTTP_ERROR`, `SECTIONS_NOT_READY`, `NOT_SUPPORTED`, `INTERNAL`.

### Рукопожатие

- `bridge.getInfo` -> `{ protocolVersion: 1, platform: "android" | "ios", appVersion: string, capabilities: ("db" | "download" | "autoUpdate" | "images")[] }`.

### База данных

Таблицы (имена совпадают со store в IDB), поле ключа и колонки, которые нативка выносит из JSON для индексов:

- `prayers-index`: `id` (число); колонка `parent`.
- `prayer-sections`: `id`; колонка `parent`.
- `saints-index`: `id`.
- `prayer-details`: `id`; колонки `module` (из поля `moduleId`), `modified_ts`.
- `saint-details`: `id`; колонка `modified_ts`.
- `calendar-days`: `code` (строка `YYYYMMDD`).
- `calendar-markers`: `id` (строка, единственная запись `snapshot`).
- `favorites`: `id`; колонки `type`, `sort` (User DB).
- `bookmarks`: `id` (строка); колонка `itemId` (User DB).
- `reading-history`: `id`; колонка `lastReadAt` (ISO, хранится как миллисекунды) (User DB).
- `metadata`: `key` (строка).

Методы (все асинхронные, значения хранятся как JSON-строка payload без потерь неизвестных полей):

- `db.get {table, key}` -> объект или `null`.
- `db.getMany {table, keys}` -> массив объектов или `null` в порядке `keys`.
- `db.getAll {table}` -> массив объектов.
- `db.put {table, item}` -> `null` (upsert, замена всего payload).
- `db.putAll {table, items}` -> `null` (одна транзакция).
- `db.delete {table, key}` -> `null`.
- `db.clear {table}` -> `null`.
- `db.count {table}` -> число.

### Скачивание

Модули: `calendar`, `calendarIcons`, `molitvoslov`, `spiritualLiterature`, `liturgicalBooks`, `saints`, `saintIcons`.

`DownloadProgress`: `{ moduleId, status: "idle" | "downloading" | "completed" | "error", downloadedBytes, totalBytes, error?, updatedAt (мс), isUpdate?: boolean, waitingForNetwork?: boolean }`.

- `download.getProgress {moduleId}` -> `DownloadProgress | null`.
- `download.getAllProgress {}` -> `DownloadProgress[]`.
- `download.getModuleInfo {moduleId}` -> `{ downloaded: boolean, downloadedBytes: number | null, estimatedBytes: number | null, lastSyncAt: string | null }`.
- `download.saveEstimate {moduleId, bytes}` -> `null`.
- `download.getSize {moduleId, since?: ISO, options?: {imageSize?}}` -> байты (запрос к API, нужна сеть).
- `download.getUpdateSize {moduleId}` -> `number | null` (`null`, если модуль не скачан; `0`, если меньше 1024 байт).
- `download.start {moduleId, options?: {imageSize?: "s" | "m" | "l"}}` -> `{ accepted: true }`; идемпотентен, продолжает с чекпоинта.
- `download.checkForUpdate {moduleId, since?: ISO}` -> `{ accepted: boolean, started: boolean }`. Нативка отвечает после проверки размера обновления. `accepted: false`, если модуль не скачан или уже идёт загрузка. `started: true`, только если запущена загрузка и по ней придут события `download.progress` (завершится `completed` или `error`). Если обновление меньше 1024 байт, то `accepted: true, started: false`, событий не будет. JS резолвит ожидание сразу при `started: false`.
- `download.cancel {moduleId}` -> `null` (полный откат: отмена, удаление данных, состояния и метаданных; событий после отмены нет).
- `download.delete {moduleId}` -> `null` (то же, что `cancel`, для скачанного модуля).
- `download.dismissError {moduleId}` -> `null` (`error` -> `idle`, чекпоинт сохраняется).
- `download.resumeInterrupted {}` -> `null` (нативка и сама делает это на старте).
- Событие `download.progress` -> `DownloadProgress`. Не чаще 4 раз в секунду, но смена статуса уходит сразу.

Семантика, которую нужно сохранить (она описана в `DownloadManager.ts`):

- `totalBytes` определяется до публикации `downloading` (иначе UI показывает "0 из 0 МБ").
- Обновление (`since` задан) с `totalBytes < 1024` не публикуется и ничего не качает.
- Порядок завершения: сохранить полный размер, затем `lastSync = now`, затем статус `completed` с `downloadedBytes = totalBytes`. Для обновления полный размер берётся запросом без `since`; при ошибке запроса прежнее значение сохраняется.
- Ошибка: статус `error` и текст, чекпоинт сохраняется для докачки.
- Кратковременная потеря сети не является ошибкой: статус остаётся `downloading`, можно выставить `waitingForNetwork`.

API: база `https://app.valaam.ru/api`. Ответ имеет вид `{ status: "success", data, errors }`. Списковые эндпоинты отдают `data = { items, nav: { page_count } }`, параметры `page`, `page_size=100`, `modified_since` (unix-секунды).

- `calendar`: `GET /days/list?from_date=YYYY0101&to_date=YYYY1231`, размер `GET /days/count?...`. Элементы пишутся в `calendar-days`.
- `calendarIcons`: `GET /days/icons?from_date&to_date&image_size=s`, размер `GET /days/icons/count?...`. Элемент `{id, code, url, prayers_url}`: качаются оба URL. Двухфазно: сначала собрать список, затем файлы.
- `molitvoslov`: разделы берутся из таблицы `prayer-sections` (`parent = 842`, кроме `id = 937`). Для каждого `GET /prayers/list?section_id=ID`, размер `GET /prayers/count?section_id=ID` суммой по разделам. Пишутся в `prayer-details` с `moduleId = "molitvoslov"`. Если таблица разделов пуста, ошибка `SECTIONS_NOT_READY`.
- `liturgicalBooks`: раздел 937, `spiritualLiterature`: раздел 976 (те же эндпоинты, свои `moduleId`).
- `saints`: `GET /saints/list`, размер `GET /saints/count`, пишутся в `saint-details`.
- `saintIcons`: `GET /saints/icons?image_size=m|l`, размер `GET /saints/icons/count?image_size=...`, элемент `{id, url}`.
- URL, начинающиеся с `/`, дополняются префиксом `https://app.valaam.ru`.
- Год календаря берётся из местной даты устройства.

### Автообновление

- `autoUpdate.set {enabled: boolean}` -> `{ enabled, lastCheckAt: string | null }`. Идемпотентен. При включении планирует периодическую проверку раз в 6 часов и сразу проверяет, если `lastCheckAt` старше 6 часов. При выключении снимает расписание, идущие обновления не прерываются.
- `autoUpdate.getState {}` -> `{ enabled, lastCheckAt, nextCheckAt: string | null, running: boolean }`.
- Для каждого скачанного модуля действует `checkForUpdate` с `since = lastSync`. Размер иконок (`imageSize`) нативка запоминает из последнего `download.start`.

Политика сети для автообновления:

- Ручные `download.start` и `download.checkForUpdate`: любая сеть, без ограничений.
- Иконки (`calendarIcons`, `saintIcons`): только по сети без лимита (Wi-Fi/Ethernet).
- Тексты и календарь (`calendar`, `molitvoslov`, `spiritualLiterature`, `liturgicalBooks`, `saints`): по сети без лимита без ограничений. По сети с лимитом только если суммарный размер ожидающих обновлений этих модулей не больше 5 МБ (`AUTO_UPDATE_METERED_LIMIT_BYTES`). Иначе ждут сеть без лимита. Размер берётся как у `download.getUpdateSize`.
- Не запускаться при Data Saver / Low Data Mode, в роуминге и при низком заряде. Автообновление тихое: без уведомлений.
- `lastCheckAt` обновляется после каждой успешной проверки модулей, разрешённых текущей сетью (даже если изменений нет; отложенные до сети без лимита модули не считаются проверенными). События `download.progress` от запусков автообновления имеют `isUpdate: true`, а их ошибки не публикуются как `status: "error"`. Ручной `download.checkForUpdate` публикует ошибки как обычно.

### Хранилище

- `storage.getInfo {}` -> `{ offlineUsedBytes, freeBytes, totalBytes }`.

### Картинки

- В DOM картинки запрашиваются как относительные пути `/upload/resize_cache/...`.
- Capability `images`. Android перехватывает `https://app.valaam.ru/upload/resize_cache/**`, iOS обслуживает `valaam-cache://app/upload/resize_cache/**` (веб подменяет схему на iOS, пока страница на `https`; после переезда статики на кастомную схему подмена не нужна). Fallback по имени файла (одинаковому для всех размеров) выбирает ближайшую по ширине папку ресайза, а не первую найденную.

