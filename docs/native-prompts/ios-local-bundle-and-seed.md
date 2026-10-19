# Промпт для iOS: локальный бандл и seed

Промпт целиком передаётся агенту в репозитории iOS. Источник контракта: `docs/native-bridge-protocol.md`, разделы «Статика в нативке» и «Seed». При расхождении прав протокол. Логика seed совпадает с Android (`android-local-bundle-and-seed.md`).

---

Репозиторий: C:\Users\Vladimir\CursorWorkspace\valaam-prayers-ios (приложение Valaam, виджет ValaamWidget, пакет Packages/ValaamOffline на GRDB).
Веб-проект (источник контракта): C:\Users\Vladimir\CursorWorkspace\valaam-prayers\valaam-prayers. Прочитай docs\native-bridge-protocol.md, разделы «Статика в нативке» и «Seed». Краткое изложение контракта seed приведено в конце этого промпта.

## ЦЕЛЬ

1. Грузить собранный веб-бандл из ресурсов приложения через кастомную схему, а не по URL.
2. Один раз применять начальные данные (seed) в пустую БД.

## ЖЁСТКИЕ РЕШЕНИЯ

- Схема valaam-app, адрес страницы valaam-app://app/native/index.html. Обработчик WKURLSchemeHandler:
  - /native/** отдаёт файлы из ресурса web/ в бандле;
  - /upload/** использует существующую логику CacheSchemeHandler (точный файл, ближайшая ширина, фолбэк на https://app.valaam.ru); объедини обработчики или вызови общий код, чтобы не дублировать;
  - остальное 404.
  Заголовки: правильный Content-Type (js и mjs это text/javascript, css, html, json, svg, woff/woff2 = font/woff2, png, jpg, webp, map), Content-Length. Запретить «..» в пути.
- Запросы к API идут по https://app.valaam.ru/api напрямую (сервер отражает Origin в Access-Control-Allow-Origin).
- limitsNavigationsToAppBoundDomains = false (иначе WebKit не вызывает scheme handler, это уже отмечено комментарием в ViewController.swift). Service Worker в нативке отключён на стороне веба.

## ЧАСТЬ 1. Статика

- Зарегистрируй обработчик через config.setURLSchemeHandler(handler, forURLScheme: "valaam-app") ДО создания WKWebView.
- ViewController: appAddress = "valaam-app://app/native/index.html"; формирование адреса с фрагментом (appAddress + "#" + urlFragment) оставить; initial load тоже на новый адрес.
- decidePolicyFor: сейчас схемы кроме http/https открываются через UIApplication.open. Явно разреши valaam-app перед этой проверкой.
- Capability "images" в bridge.getInfo объявлять не нужно: пути /upload/... теперь относительные и идут в тот же обработчик. Веб сам не подменяет их на valaam-cache://, когда страница открыта по valaam-app://.
- Deep links: SceneDelegate и AppDelegate продолжают сохранять фрагмент ссылки в NeedToOpenURL, ViewController подставляет его в новый адрес страницы. Проверь на холодном старте и при запущенном приложении: https://app.valaam.ru/webview/#calendar:/days/20261018 открывает календарь на 18 октября. Фрагмент берётся из любой входящей ссылки, а страница всегда грузится с valaam-app://app/native/index.html. applinks в entitlements и AASA (путь /webview/) уже исправлены, не менять.
- Виджет и Shared не трогать. Не делать изменений в BackgroundTransfer.

## ЧАСТЬ 2. Сборка

- Папки web и seed добавь в Xcode как folder reference только в таргет приложения (не в виджет).
- Run Script phase: `rsync -a --delete "$WEB_PROJECT_DIR/www/" "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/web/"` и то же для native-seed в seed/. WEB_PROJECT_DIR задаётся в gitignored Local.xcconfig. Для таргета отключи ENABLE_USER_SCRIPT_SANDBOXING (иначе доступ вне проекта запрещён).
- Если нет www/index.html, падать с сообщением «выполните npm run native:prepare». Если нет native-seed/manifest.json, тоже падать, кроме SKIP_SEED=YES (тогда seed не копируется).
- Из Xcode не запускай npm.

## ЧАСТЬ 3. Применение seed (пакет ValaamOffline)

Формат seed: ресурс seed/manifest.json и файлы с конвертом { seedVersion, createdAt, createdAtTs, request, response } (см. «Контракт seed» ниже). Поддерживаемая версия формата: 1.

3.1 Один код приёма данных. Перенеси из DownloadEngine в internal-API (например ModuleImport) логику «items модуля -> таблица» (сейчас private saveItems: calendar-days, saint-details, prayer-details с moduleId). Добавь APIParse.list(object:) для уже разобранного словаря, а list(response:) вызывает её. И движок, и seed используют эти функции. Второго парсера быть не должно. Поведение движка не меняется. Чтобы seed мог публиковать прогресс, сделай emit(...) движка internal.

3.2 Индексы: prayers.json (elements -> prayers-index, sections -> prayer-sections), saints-index.json (saints-index), calendar-markers.json -> тонкий импортёр поверх PayloadStore.putAll. Раскраска: оставить ключи из 8 цифр (значение строка или null) и числа min и max; записать {id:"snapshot", min, max, days} в calendar-markers. Юнит-тест на паритет с веб-кодом DaysApi.getCalendarMarkers.

3.3 SeedCoordinator (actor в пакете, запуск из OfflineCoordinator.start() после создания стека и ДО engine.resumeInterrupted()):
- Метка в metadata, ключ "seed_state", значение {status, seedVersion, createdAt, error?}. Метка пишется один раз и не удаляется (download.delete и обновление приложения её не трогают). applying и importing означают «продолжить», completed, skipped и error означают «ничего не делать».
- Нет метки: если ресурса seed нет или версия не поддерживается, метку НЕ писать (skipped только в памяти). Если БД не пуста (prayers-index, prayer-sections, saints-index, calendar-days, calendar-markers, prayer-details пусты и нет ключей last_sync_* в metadata), записать метку skipped. Иначе записать applying и начать.
- Этап 1 (блокирующий): индексы, разделы, раскраска; в конце last_sync_prayers и last_sync_saints = manifest.createdAt (не now), затем статус importing. Ошибка: откат строк этих таблиц и ключей last_sync_*, метка error, JS работает по сети.
- Этап 2 (фон): модули calendar, затем molitvoslov. На каждый: ModuleState (status downloading, isUpdate=false, totalBytes = apiSize из manifest), файлы по порядку, на каждый файл одна запись через PayloadStore.putAll (никаких огромных транзакций), чекпоинт через ContentStore.markPage со scope "seed" и номером файла (по нему возобновление), прогресс событием download.progress через общий emit, downloadedBytes растёт на bytes файла. После последнего файла: last_sync_download_<id> = createdAt (ISO8601, формат как в DownloadEngine.syncKey), download_size_<id> и download_estimate_<id> = apiSize, completed. Ошибка модуля: стереть данные и состояние (как cancel), модуль остаётся нескачанным, seed идёт дальше. После обоих модулей метка completed.
- Память: файл читать целиком (до около 8 МБ), JSONSerialization в autoreleasepool.
- Фоновая работа: оберни этап 2 в UIApplication.beginBackgroundTask (или ProcessInfo.performExpiringActivity). Если процесс убит, продолжится с чекпоинта при следующем запуске.
- API: awaitDecision() (завершается после принятия решения о метке, не после окончания) и поток состояний.

3.4 Конфликты с загрузчиком. Пока модуль принадлежит seed:
- DownloadEngine.start: ничего не делать; checkForUpdate: вернуть false; cancel и delete: остановить seed этого модуля и стереть данные (erase), метку не менять; resumeInterrupted и AutoUpdateService: пропускать такие модули (иначе module_state=downloading запустит сетевую загрузку). Реализуй через замыкание isOwnedBySeed в init движка.
- moduleInfo.downloaded становится true только по last_sync_download_* при завершении модуля.

## ЧАСТЬ 4. Мост

- RpcRouter: "seed.getState" возвращает {status, seedVersion, createdAt, error?} после awaitDecision(); в bridge.getInfo добавлять "seed" в capabilities только если seed есть в ресурсах и версия поддерживается. Статусы: applying, importing, completed, skipped, error.
- OfflineCoordinator.bindProgress: тем же путём отправлять {"event":"seed.state","data":{...}} через window.__nativeRpc.onMessage (включая экранирование U+2028 и U+2029, как для download.progress). События до загрузки JS теряются, поэтому JS сам опрашивает seed.getState.
- Этап 2 использует существующие события download.progress.
- WebView можно создавать и загружать во время применения seed: веб сам ждёт выхода из applying в initStorage() (таймаут 30 с). Нативную заставку держи до вызова setWebViewVisible(true) / hideLaunchScreen как сейчас.

## ЧАСТЬ 5. Тесты и приёмка

XCTest в Tests/ValaamOfflineTests на фикстуре seed во временной папке и временной БД:
- чистая БД: таблицы заполнены, last_sync_prayers и last_sync_saints равны createdAt, last_sync_download_calendar и molitvoslov равны createdAt (не текущему времени), модули downloaded;
- второй запуск и обновление приложения (метка есть): ничего не пишется;
- БД не пуста: метка skipped;
- после delete молитвослова и перезапуска seed не применяется повторно;
- прерывание на этапе 2: продолжение с чекпоинта, resumeInterrupted не запускает сетевую загрузку;
- паритет: одна и та же страница через DownloadEngine и через seed даёт одинаковые строки;
- ошибка этапа 1: откат, статус error.

Ручная проверка на устройстве: чистая установка, авиарежим после первого запуска (календарь и молитвослов открываются), Web Inspector показывает origin valaam-app://app, статика без сетевых запросов, картинки из /upload/ работают (кэш и сеть), window.isSecureContext и копирование ссылки (navigator.clipboard.writeText) работают, обновление поверх старой версии (настройки в localStorage будут сброшены, это ожидаемо), deep link https://app.valaam.ru/webview/#calendar:/days/20261018.

## НЕ ДЕЛАТЬ

Не менять формат seed и контракт; не добавлять seed для иконок, святых, spiritualLiterature и liturgicalBooks; не запускать npm из Xcode; не трогать виджет.
В конце кратко опиши изменённые файлы и результаты тестов.

---

## Контракт seed (кратко, полная версия в docs\native-bridge-protocol.md)

Папка `native-seed/` в веб-проекте, генерируется `npm run seed:fetch` (веб-проект, не нативка). В нативку попадает в ресурс seed/.

```
manifest.json                         # пишется последним
prayers.json                          # GET /prayers
saints-index.json                     # GET /saints
calendar-markers.json                 # GET /days/calendar
calendar-days-001.json ...            # GET /days/list?from_date&to_date&page=N&page_size=100
molitvoslov-<sectionId>-001.json ...  # GET /prayers/list?section_id=<id>&page=N&page_size=100
```

Конверт каждого файла: `{ seedVersion, createdAt, createdAtTs, request, response }`, где `response` это неизменённое тело ответа API (`{status, data, errors}`). Списки: `response.data = { items, nav: { page_count } }`. Страницы по 100 элементов, файл до ~8 МБ.

manifest.json:

```json
{
  "seedVersion": 1,
  "createdAt": "2026-10-19T19:30:00.000Z",
  "createdAtTs": 1792438200,
  "webVersion": "1.43.0",
  "years": [2026],
  "indexes": [{ "name": "prayers", "file": "prayers.json", "bytes": 1743235 }],
  "modules": {
    "calendar": { "apiSize": 13739240, "files": [{ "file": "calendar-days-001.json", "bytes": 3905042, "page": 1, "totalPages": 4 }] },
    "molitvoslov": {
      "apiSize": 88620640,
      "sections": [1078, 835],
      "files": [{ "file": "molitvoslov-835-001.json", "bytes": 3900000, "sectionId": 835, "page": 1, "totalPages": 6 }]
    }
  }
}
```

- `indexes`: prayers, saints, calendarMarkers. Порядок файлов модуля: календарь по страницам; молитвослов по `sections` в указанном порядке, внутри раздела по страницам.
- `createdAt` = серверное время съёма минус 60 секунд запаса. `apiSize` = поле `size` из /days/count и /prayers/count (сумма по разделам).
- Отображение на таблицы:
  - prayers.json: `data.elements` -> prayers-index, `data.sections` -> prayer-sections, `last_sync_prayers = createdAt`;
  - saints-index.json: `data` (массив) -> saints-index, `last_sync_saints = createdAt`;
  - calendar-markers.json: из `data` оставить ключи из 8 цифр (строка или null), плюс `min` и `max` числами, записать `{id:"snapshot", min, max, days}` в calendar-markers;
  - calendar-days-*.json: `data.items` -> calendar-days;
  - molitvoslov-*.json: `data.items` с `moduleId="molitvoslov"` -> prayer-details;
  - завершение модуля: `last_sync_download_<id> = createdAt` (не now), `download_size_<id> = download_estimate_<id> = apiSize`, состояние completed, `downloadedBytes = totalBytes = apiSize`.
- Состояние: ключ `seed_state` в metadata (`{status, seedVersion, createdAt, error?}`), правила в ЧАСТИ 3.3.
- JS API: `seed.getState {}` -> `{status: "applying"|"importing"|"completed"|"skipped"|"error", seedVersion, createdAt, error?}`; событие `seed.state`; capability `seed`.
