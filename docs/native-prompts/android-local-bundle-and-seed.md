# Промпт для Android: локальный бандл и seed

Промпт целиком передаётся агенту в репозитории Android. Источник контракта: `docs/native-bridge-protocol.md`, разделы «Статика в нативке» и «Seed». При расхождении прав протокол.

---

Репозиторий: C:\Users\Vladimir\StudioProjects\valaam-prayers-android (Kotlin, модули app, repository, database, model, widget).
Веб-проект (источник контракта): C:\Users\Vladimir\CursorWorkspace\valaam-prayers\valaam-prayers. Прочитай docs\native-bridge-protocol.md, разделы «Статика в нативке» и «Seed». Поведение в них обязательно. Краткое изложение контракта seed приведено в конце этого промпта.

## ЦЕЛЬ

1. Грузить собранный веб-бандл из assets, а не по URL.
2. Один раз применять начальные данные (seed) в пустую нативную БД.

## ЖЁСТКИЕ РЕШЕНИЯ (не пересматривать)

- Origin остаётся https://app.valaam.ru. Бандл отдаётся по https://app.valaam.ru/native/** (НЕ /webview/: старый Service Worker имеет scope /webview/).
- Перехват картинок https://app.valaam.ru/upload/resize_cache/** остаётся как есть.
- Не менять поведение моста, кроме добавления seed. Не трогать виджет.

## ЧАСТЬ 1. Статика в нативке

- Добавь зависимость androidx.webkit (последняя стабильная версия, через libs.versions.toml).
- Создай класс (например web/LocalWebAssets.kt): `WebViewAssetLoader.Builder().setDomain("app.valaam.ru").addPathHandler("/native/", handler).build()`. Обработчик сопоставляет /native/<rel> с assets/web/<rel> (пустой путь или оканчивающийся на "/" означает index.html), отсекает ".." и возвращает null для неизвестного. MIME-типы: js/mjs = text/javascript, css, html, json, svg, woff/woff2, png, jpg, webp, map. Можно обернуть AssetsPathHandler (он получает путь после префикса) или написать свой PathHandler. Сверь API с актуальной документацией androidx.webkit.
- ValaamWebViewClient.shouldInterceptRequest: сначала assetLoader.shouldInterceptRequest(url), затем существующая логика иконок, затем super.
- BuildConfig.APP_URL = "https://app.valaam.ru/native/index.html" для debug и release. CLEAN_APP_URL не менять. Для отладки с HMR: Gradle-свойство -PwebDevUrl=http://<ip>:5173/ подменяет APP_URL в debug.
- Deep links в WebViewFragment.loadDefaultContent: ссылки https://app.valaam.ru/webview/#... (и для совместимости старые /app/...) превращай в APP_URL + "#" + <исходный fragment>. Сейчас ветка `host == APP_URL.host` грузит intent.data как есть: после переезда это откроет удалённую веб-версию, а не локальный бандл. Адрес для виджета (#calendar:/days/<date>) собирай строкой APP_URL + "#calendar:/days/" + date, потому что buildUpon().appendEncodedPath поверх index.html сломается.
- Навигация: handleUri уже оставляет ссылки на app.valaam.ru в WebView, проверь, что /native/ проходит.
- Проверь deep links на холодном старте и при уже запущенном приложении (onNewIntent -> loadDefaultContent): https://app.valaam.ru/webview/#calendar:/days/20261018 должен открыть календарь на 18 октября. Если загрузка меняет только фрагмент, веб обработает hashchange сам. Интент-фильтр в манифесте (pathPrefix /webview/) уже исправлен, не менять.
- Service Worker в нативке отключён на стороне веба (он сам отписывает старые регистрации и чистит кэши). От нативки ничего не требуется.

## ЧАСТЬ 2. Сборка

- Путь к веб-проекту: свойство web.project.dir в local.properties (не коммитить). По умолчанию ошибка с понятным текстом.
- Gradle-задача syncWebAssets (абстрактный класс DefaultTask с @InputDirectory и @OutputDirectory):
  - копирует <web>/www в build/generated/web-assets/web;
  - копирует <web>/native-seed в build/generated/web-assets/seed;
  - если нет www/index.html, падает с сообщением «выполните npm run native:prepare»; если нет native-seed/manifest.json, тоже падает, кроме случая -PskipSeed=true (seed в этом случае не копируется).
- Подключи как generated assets через `androidComponents.onVariants { variant.sources.assets?.addGeneratedSourceDirectory(...) }` (AGP 9.4.1, сверь API).
- Не добавляй json в noCompress: в APK seed сжимается (около 25-30 МБ).
- Ничего не собирай через npm из Gradle. Только копирование.

## ЧАСТЬ 3. Применение seed (модуль repository)

Формат seed (см. «Контракт seed» ниже): assets/seed/manifest.json и файлы с конвертом { seedVersion, createdAt, createdAtTs, request, response }. Поддерживаемая версия формата: 1.

3.1 Один код приёма данных. Вынеси из DownloadWorker логику «ответ API -> строки в таблицу» в общий класс (например ModulePageImporter): разбор response.data.items и nav.page_count, putAll в calendar_days, saint_details или prayer_details (с добавлением moduleId). DownloadWorker и seed вызывают одни и те же функции. Второго парсера быть не должно. Поведение воркера не меняется.

3.2 Индексы. Для prayers.json (elements -> prayers_index, sections -> prayer_sections), saints-index.json (saints_index) и calendar-markers.json напиши тонкий IndexImporter поверх NativeDbDao.putAll. Раскраска: оставить ключи из 8 цифр (значение строка или null) и числа min/max, записать {id:"snapshot", min, max, days} в calendar_markers. Юнит-тест на трансформацию раскраски (паритет с веб-кодом DaysApi.getCalendarMarkers).

3.3 SeedCoordinator (Koin singleton, запуск из App.onCreate на Dispatchers.IO до загрузки WebView):
- Метка seed_state в таблице metadata (ключ "seed_state", значение JSON {status, seedVersion, createdAt, error?}). Правила: метка пишется один раз, никогда не удаляется (download.delete и обновление приложения её не трогают); applying/importing означает «продолжить», completed/skipped/error означает «ничего не делать».
- Нет метки: если seed/manifest.json отсутствует или seedVersion больше поддерживаемой, метку НЕ писать, статус skipped только в памяти. Если БД не пуста (prayers_index, prayer_sections, saints_index, calendar_days, calendar_markers, prayer_details пусты и нет ключей last_sync_* в metadata), записать метку skipped. Иначе записать applying и начать.
- Этап 1 (блокирующий): индексы, разделы, раскраска. В конце записать last_sync_prayers и last_sync_saints = manifest.createdAt (не now), затем статус importing. Ошибка этапа 1: удалить строки из этих таблиц и ключи last_sync_*, метка error, JS работает по сети.
- Этап 2 (фон): модули calendar, затем molitvoslov. Для каждого: module_state = downloading (isUpdate=false, totalBytes=apiSize из manifest), файлы по порядку, на каждый файл putAll (по странице, одной длинной транзакции быть не должно: NativeDbDao синхронизирован и заблокирует db.* из JS), чекпоинт индекса файла в module_state, прогресс через downloadManager.notifyProgress (учитывает троттлинг), downloadedBytes растёт на bytes файла. После последнего файла: last_sync_download_<id> = manifest.createdAt (формат как getCurrentIsoTime в DownloadWorker), download_size_<id> и download_estimate_<id> = apiSize, completed. Ошибка модуля: стереть его данные и состояние (как cancel), модуль остаётся нескачанным, seed продолжает со следующим модулем. После обоих модулей метка completed.
- Память: читать один файл целиком (до около 8 МБ), не весь seed.
- Возобновление после убийства процесса: продолжить модуль с чекпоинта файла (INSERT OR REPLACE идемпотентен).
- StateFlow<SeedState> и suspend-функция awaitDecision() (завершается после принятия решения о метке, не после окончания).

3.4 Конфликты с загрузчиком. Пока модуль принадлежит seed:
- DownloadManager.start: ничего не делать, вернуть accepted=true; checkForUpdate: accepted=false, started=false; cancel/delete: остановить seed этого модуля и стереть данные (deleteModuleData), метку не менять и повторно не засевать; resumeInterrupted и AutoUpdateManager: пропускать такие модули (иначе после падения module_state=downloading запустит сетевую загрузку).
- getModuleInfo.downloaded становится true только на завершении модуля (по last_sync_download_*).

## ЧАСТЬ 4. Мост

- NativeRpcBridge: метод "seed.getState" возвращает {status, seedVersion, createdAt, error?} после awaitDecision(); в capabilities добавлять "seed" только если seed есть в assets (manifest.json читается и версия поддерживается). Статусы: applying, importing, completed, skipped, error.
- JsHandler: подписка на SeedCoordinator.state, отправка {"event":"seed.state","data":{...}} через window.__nativeRpc.onMessage так же, как download.progress. События до загрузки JS теряются, поэтому JS сам опрашивает seed.getState.
- Этап 2 использует существующие события download.progress.
- WebView можно создавать и загружать во время применения seed: веб сам ждёт выхода из applying в initStorage() (таймаут 30 с). Нативную заставку держи до вызова setWebViewVisible(true) / hideLaunchScreen как сейчас.

## ЧАСТЬ 5. Тесты и приёмка

Юнит-тесты (JVM, по образцу NativeDbDaoTest и DownloadManagerTest) на фикстуре seed:
- чистая БД: все таблицы заполнены, last_sync_prayers и last_sync_saints равны createdAt, last_sync_download_calendar/molitvoslov равны createdAt (не текущему времени), модули downloaded;
- второй запуск и «обновление приложения» (метка есть): ничего не пишется;
- БД не пуста: метка skipped, строки не тронуты;
- после download.delete молитвослова и перезапуска seed не применяется повторно;
- падение посреди этапа 2: продолжается с чекпоинта, resumeInterrupted не запускает сетевую загрузку;
- паритет: одна и та же страница через воркер и через seed даёт одинаковые строки;
- ошибка на этапе 1: откат, статус error.

Ручная проверка: чистая установка на устройство в авиарежиме после первого запуска (календарь и молитвослов открываются), WebView грузится из /native/ (проверить chrome://inspect: URL и отсутствие сетевых запросов за статикой), Service Worker не регистрируется, обновление поверх старой версии, deep link https://app.valaam.ru/webview/#calendar:/days/20261018.

## НЕ ДЕЛАТЬ

Не менять формат seed и контракт; не добавлять seed для иконок, святых, spiritualLiterature и liturgicalBooks; не запускать npm из Gradle; не трогать виджет и календарные события.
В конце кратко опиши изменённые файлы и результаты тестов.

---

## Контракт seed (кратко, полная версия в docs\native-bridge-protocol.md)

Папка `native-seed/` в веб-проекте, генерируется `npm run seed:fetch` (веб-проект, не нативка). В нативку попадает в assets/seed/.

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
  "calendarRange": { "from": "20260114", "to": "20270113" },
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
