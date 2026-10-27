# Контракт нативного моста v1

Единый протокол между веб-частью (JS) и нативными приложениями Android и iOS. Изменения вносятся только в этот файл, обе нативки и JS-код следуют ему.

### Транспорт

- Все сообщения: JSON-строки.
- Запрос: `{ "id": "string", "method": "db.get", "params": {} }`.
- Ответ: `{ "id": "...", "ok": true, "result": ... }` или `{ "id": "...", "ok": false, "error": { "code": "...", "message": "..." } }`.
- Событие: `{ "event": "download.progress", "data": {} }`.
- Android, WebView 82 и новее (`WebViewFeature.WEB_MESSAGE_LISTENER`): нативка регистрирует `WebViewCompat.addWebMessageListener(webView, "valaamNativeRpcPort", allowedOrigins, listener)`. JS вызывает `window.valaamNativeRpcPort.postMessage(requestJson)`. Ответ нативка шлёт через `replyProxy.postMessage(responseJson)`, JS получает его строкой в `event.data` события `message` порта (`nativeRpc.ts` сам подписывается на порт и передаёт строку в `window.__nativeRpc.onMessage`, никакого внедряемого шима нет). События нативка шлёт через `evaluateJavascript("window.__nativeRpc.onMessage(<json-object-literal>)")`. JSON подставляется как литерал без собственного экранирования кавычек.
- Android, WebView младше 82 (фича недоступна, порт не регистрируется): JS вызывает `androidJsHandler.rpc(requestJson)` (`@JavascriptInterface`, не блокирует: ставит в очередь). Ответ и события приходят тем же `evaluateJavascript("window.__nativeRpc.onMessage(<json>)")`. `@JavascriptInterface` origin не проверяет, поэтому нативка принимает `rpc` только когда порта нет. При наличии порта вызов `rpc` игнорируется, и JS его не использует.
- iOS: JS вызывает `await window.webkit.messageHandlers.nativeRpc.postMessage(requestJson)`. Нативка реализует `WKScriptMessageHandlerWithReply` и отвечает JSON-строкой с конвертом ответа. События идут через `evaluateJavaScript("window.__nativeRpc.onMessage(<json>)")`.
- Допустимые источники: только главный фрейм страницы приложения. Android с портом ограничивает origin правилами `addWebMessageListener` (`https://app.valaam.ru`, `https://dev.app.valaam.ru`, `https://valaam.ru`, `https://dev.valaam.ru`, а `http://localhost:5173` и `http://10.0.2.2:5173` только в debug-сборке); запрос из другого источника не доставляется. Запасной `androidJsHandler.rpc` такой проверки не делает. iOS проверяет `frameInfo` сообщения: главный фрейм, схема `valaam-app` (хост `app`) или `https` с хостами `valaam.ru`, `www.valaam.ru`, `dev.valaam.ru`, `app.valaam.ru`, `dev.app.valaam.ru`. Запрос из другого источника на iOS отклоняет промис `postMessage` (JS видит `NativeRpcError` с кодом `INTERNAL`).
- Коды ошибок: `UNKNOWN_TABLE`, `INVALID_PARAMS`, `DB_ERROR`, `NETWORK`, `HTTP_ERROR`, `SECTIONS_NOT_READY`, `NOT_SUPPORTED`, `INTERNAL`.

### Рукопожатие

- `bridge.getInfo` -> `{ protocolVersion: 1, platform: "android" | "ios", appVersion: string, capabilities: ("db" | "download" | "autoUpdate" | "images" | "seed" | "pay")[] }`. Capability `seed` нативка объявляет только если seed лежит в ресурсах и его версия формата поддерживается (см. «Seed»). Capability `pay` объявляется, если в сборке есть ЮKassa SDK (см. «Оплата»).

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

- `calendar`: `GET /days/list?from_date=YYYY0114&to_date=YYYY0113` (церковный год, 1–13 января два года: см. `src/services/download/calendarRange.ts`), размер `GET /days/count?...`. Элементы пишутся в `calendar-days`.
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
- Capability `images`. Android перехватывает `https://app.valaam.ru/upload/resize_cache/**`, iOS обслуживает `valaam-cache://app/upload/resize_cache/**` (веб подменяет схему на iOS, пока страница на `https`; когда страница открыта по `valaam-app://`, подмены нет: относительные пути идут в тот же обработчик схемы, см. «Статика в нативке»). Fallback по имени файла (одинаковому для всех размеров) выбирает ближайшую по ширине папку ресайза, а не первую найденную.

### Оплата

Нативная оплата ЮKassa SDK. Capability `pay`. Нативка не вызывает сервер платежей: отдаёт токен, проводит подтверждение и закрывает экран SDK. JS-обёртка в приложении не внедряется, веб вызывает методы через `nativeCall` (`src/services/native/pay.ts`).

`PayResult`: `{ status: "success" | "cancelled" | "error" | "unknown", message?: string, paymentToken?: string, paymentMethodType?: string }`. Отмена, отказ SDK, занятость (`message: "busy"`) и неверные параметры приходят самим результатом со `status: "error"` и `message`: вызов не должен зависать ни при каких входных данных. RPC-ошибка только при сбое моста (`NOT_SUPPORTED`, если оплаты нет).

- `pay.tokenize {amount: string, title: string, subtitle: string}` -> `PayResult`. `amount` в рублях: десятичная точка, не больше двух знаков, больше нуля. Открывает экран SDK и отвечает, когда пользователь выбрал способ (`success` с `paymentToken` и `paymentMethodType`), отменил (`cancelled`) или SDK вернул ошибку (`error`). На iOS экран SDK остаётся открытым после `success` (его закрывает `pay.confirm` или `pay.close`), на Android SDK закрывает свой экран сам.
- `pay.confirm {confirmationUrl: string, paymentMethodType: string}` -> `PayResult`. `paymentMethodType` это имя из API ЮKassa (`bank_card`, `sberbank`, `sbp`, `yoo_money`, `alfa_bank`, `alfa_pay`), обычно значение из ответа `pay.tokenize`. `success` платёж подтверждён, `cancelled` отмена, `unknown` итог неизвестен (например, пользователь вернулся из банковского приложения без ответа): веб сам проверяет статус на сервере.
- `pay.close {}` -> `{ status: "success" }`. Закрывает экран SDK. Идущий вызов `pay.tokenize` или `pay.confirm` получает `cancelled`.
- Одновременно идёт один платёжный запрос. Второй получает `status: "error"`, `message: "busy"`.
- Если страница ушла (навигация), ждущий вызов завершается `cancelled`, экран SDK закрывается.
- Порядок вызовов: `pay.tokenize` -> (сервер создаёт платёж) -> `pay.confirm` при необходимости -> `pay.close`. На iOS `pay.confirm` без открытого модуля (после `pay.tokenize` со `success`) это `status: "error"`. Android такой проверки не делает. Нативка не принимает способ оплаты, который не умеет подтверждать (`apple_pay`, неизвестные имена): `status: "error"`.

### Статика в нативке

Собранный бандл (`www/`, тот же, что деплоится на сервер) лежит в ресурсах приложения. Различие только в рантайме: веб определяет нативку по наличию моста.

- Android: `WebViewAssetLoader`, домен `app.valaam.ru`, префикс `/native/` -> `assets/web/`. Страница: `https://app.valaam.ru/native/index.html`. Origin прежний, поэтому сохраняются localStorage и IndexedDB, а перехват `/upload/resize_cache/**` работает как раньше. Путь `/webview/` для нативки использовать нельзя: старый Service Worker (scope `/webview/`) отдал бы закэшированный старый бандл.
- iOS: схема `valaam-app`, страница `valaam-app://app/native/index.html`, `WKURLSchemeHandler`. `/native/**` отдаётся из ресурса `web/`, `/upload/**` из офлайн-кэша иконок с сетевым фолбэком, остальное 404. Origin меняется, поэтому localStorage один раз сбрасывается. Для работы обработчика `limitsNavigationsToAppBoundDomains` выключен.
- API остаётся `https://app.valaam.ru/api` (сервер отражает `Origin` в `Access-Control-Allow-Origin`).
- Service Worker в нативке не регистрируется. Веб при старте отписывает старые регистрации и удаляет все Cache Storage (на Android они остались от прежних версий).
- Deep links `https://app.valaam.ru/webview/#calendar:/days/20261018` продолжают открывать приложение. Нативка берёт из ссылки только фрагмент и открывает локальную страницу с этим фрагментом: `https://app.valaam.ru/native/index.html#...` (Android) или `valaam-app://app/native/index.html#...` (iOS). Веб сам разбирает фрагмент (при загрузке и на `hashchange`).

### Seed

Начальные данные в формате ответов API. Нативка один раз применяет их к пустой БД тем же кодом приёма данных, что и загрузчик (второго парсера нет). Модули `calendar` и `molitvoslov` после применения считаются скачанными, а последующие обновления идут по сети с `modified_since`, равным времени съёма seed.

Seed генерирует `npm run seed:fetch` (`scripts/fetch-seed.mjs`) в папку `native-seed/` в корне веб-проекта. Папка в `.gitignore`, лежит вне `www/`, `src/` и `public/`, поэтому на сервер не попадает. Нативные сборки копируют её в ресурсы приложения вместе с `www/` (`npm run native:prepare` собирает и то и другое).

Не входят в seed веб-бандла: `spiritualLiterature`, `liturgicalBooks`, иконки календаря и молитвослова, карточки святых (`saint-details`), индекс мыслей. Иконки виджета лежат отдельно, см. ключ `widget`.

Файлы:

```
native-seed/
  manifest.json                         # пишется последним, без него seed не готов
  prayers.json                          # GET /prayers
  saints-index.json                     # GET /saints
  calendar-markers.json                 # GET /days/calendar
  calendar-days-001.json ...            # GET /days/list?from_date&to_date&page=N&page_size=100
  molitvoslov-<sectionId>-001.json ...  # GET /prayers/list?section_id=<id>&page=N&page_size=100
  widget-days-001.json ...              # GET /days/widget/list?from_date&to_date&page=N&page_size=100
  upload/...                            # иконки виджета, пути из manifest.widget.icons
```

Каждый файл самоописываемый (конверт):

```json
{
  "seedVersion": 1,
  "createdAt": "2026-10-19T19:30:00.000Z",
  "createdAtTs": 1792438200,
  "request": "/prayers/list?section_id=835&page=1&page_size=100",
  "response": { "status": "success", "data": { "items": [], "nav": { "page_count": 12 } }, "errors": [] }
}
```

`response` это тело ответа API без изменений. Нативка берёт `response.data` тем же кодом, что и ответ сети. Страницы по 100 элементов, как у загрузчика, файл до нескольких МБ (сейчас максимум около 8 МБ у разделов с длинными текстами), поэтому нативке достаточно держать в памяти одну страницу.

`manifest.json`:

```json
{
  "seedVersion": 1,
  "createdAt": "2026-10-19T19:30:00.000Z",
  "createdAtTs": 1792438200,
  "webVersion": "1.43.0",
  "calendarRange": { "from": "20260114", "to": "20270113" },
  "indexes": [{ "name": "prayers", "file": "prayers.json", "bytes": 1743235 }],
  "modules": {
    "calendar": {
      "apiSize": 13739240,
      "files": [{ "file": "calendar-days-001.json", "bytes": 3905042, "page": 1, "totalPages": 4 }]
    },
    "molitvoslov": {
      "apiSize": 88620640,
      "sections": [1078, 835],
      "files": [{ "file": "molitvoslov-835-001.json", "bytes": 3900000, "sectionId": 835, "page": 1, "totalPages": 6 }]
    }
  },
  "widget": {
    "files": [{ "file": "widget-days-001.json", "bytes": 120000 }],
    "icons": ["upload/webp/api/iblock/5cb/414_q75/file.webp"]
  }
}
```

- `indexes` содержит `prayers`, `saints`, `calendarMarkers`. Виджета в `indexes` нет: он копируется в свою базу. Порядок файлов модуля: календарь по страницам; молитвослов по `sections` в указанном порядке, внутри раздела по страницам.
- `widget` лежит рядом с `modules`. `files` — страницы `/days/widget/list` за церковный год (14 января – 13 января следующего года), тот же конверт. `icons` — до 30 относительных путей `upload/...` с сегодняшнего дня вперёд; файлы лежат в каталоге seed по этим путям.
- `seedVersion` это версия формата. Нативка с версией больше поддерживаемой (сейчас 1) seed пропускает.
- `createdAt` это заголовок `Date` первого ответа сервера минус 60 секунд запаса (не часы компьютера и не время окончания съёма). Тогда `modified_since = createdAt` гарантированно заберёт всё изменённое с момента съёма.
- `apiSize` это поле `size` из `/days/count` и `/prayers/count` (сумма по разделам). Оно идёт в `download_size_<id>`, как и при загрузке по сети.
- Разделы молитвослова скрипт вычисляет из `/prayers`: `parent = 842`, кроме `id = 937`.

Соответствие таблицам и метаданным (применяет нативка):

- `prayers.json`: `data.elements` в `prayers-index`, `data.sections` в `prayer-sections`, `last_sync_prayers = createdAt`.
- `saints-index.json`: `data` (массив) в `saints-index`, `last_sync_saints = createdAt`.
- `calendar-markers.json`: из сырого `data` оставляются ключи из 8 цифр (значение строка или `null`), плюс `min` и `max` числами. В `calendar-markers` пишется `{ id: "snapshot", min, max, days }` (та же трансформация, что в `DaysApi.getCalendarMarkers`).
- `calendar-days-*.json`: `data.items` в `calendar-days`.
- `molitvoslov-*.json`: `data.items` с добавленным `moduleId = "molitvoslov"` в `prayer-details`.
- По завершению модуля: `last_sync_download_<id> = createdAt` (не текущее время), `download_size_<id> = download_estimate_<id> = apiSize`, состояние модуля `completed`, `downloadedBytes = totalBytes = apiSize`.

Состояние seed хранится в `metadata`, ключ `seed_state`, значение `{ status, seedVersion, createdAt, error? }`:

- Метка пишется один раз и никогда не удаляется: ни `download.delete`, ни обновление приложения её не трогают, поэтому seed повторно не применяется. `applying` и `importing` означают «продолжить с чекпоинта», `completed`, `skipped`, `error` означают «ничего не делать».
- Нет метки и нет seed в ресурсах (или версия не поддерживается): метка не пишется, статус `skipped` только в памяти.
- Нет метки, seed есть, БД не пуста: метка `skipped`. «Пустая БД» это таблицы `prayers-index`, `prayer-sections`, `saints-index`, `calendar-days`, `calendar-markers`, `prayer-details` пусты и в `metadata` нет ключей `last_sync_*`. Пользовательские таблицы не учитываются.
- Нет метки, seed есть, БД пуста: метка `applying`, этап 1.

Этапы:

1. Блокирующий (секунды): индексы, разделы, раскраска; в конце `last_sync_prayers` и `last_sync_saints = createdAt`, статус `importing`. Ошибка: откат строк этих таблиц и ключей `last_sync_*`, метка `error`, дальше приложение работает по сети.
2. Фоновый: модули `calendar`, затем `molitvoslov` как обычные модули с прогрессом в `download.progress`. Запись по странице (длинных транзакций нет), чекпоинт после каждого файла. Ошибка модуля: его данные и состояние стираются (как `cancel`), модуль остаётся нескачанным, seed идёт дальше. После обоих модулей метка `completed`.

Пока модуль принадлежит seed: `download.start` ничего не делает (`accepted: true`), `download.checkForUpdate` возвращает `accepted: false, started: false`, `download.cancel` и `download.delete` останавливают seed этого модуля и стирают данные (метка не меняется), `download.resumeInterrupted` и автообновление такие модули пропускают. `download.getModuleInfo.downloaded` становится `true` только по завершению модуля.

JS API:

- `seed.getState {}` -> `{ status: "applying" | "importing" | "completed" | "skipped" | "error", seedVersion: number | null, createdAt: string | null, error?: string }`. Нативка отвечает только после принятия решения (метка и пустота БД проверены), статуса «неизвестно» нет.
- Событие `seed.state` с тем же телом при смене статуса. События до загрузки JS теряются, поэтому JS сам запрашивает `seed.getState`.
- `applying` означает, что индексы ещё пишутся: JS не должен читать таблицы. `importing` и дальше: индексы готовы, модули догружаются в фоне. Веб в `initStorage()` ждёт выход из `applying` (таймаут 30 секунд, затем работает по сети).
- WebView можно создавать и загружать во время применения seed. Нативная заставка остаётся, пока веб не вызовет `setWebViewVisible(true)` или `hideLaunchScreen`, то есть пока `initStores()` не закончится.

