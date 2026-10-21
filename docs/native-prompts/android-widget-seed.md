# Промпт для Android: данные и иконки виджета из seed

Промпт целиком передаётся агенту в репозитории Android. Источник контракта: `docs/native-bridge-protocol.md`, раздел «Seed», ключ `widget`. При расхождении прав протокол.

---

Репозиторий: C:\Users\Vladimir\StudioProjects\valaam-prayers-android (Kotlin, модули app, repository, database, model, widget, widget_api).
Веб-проект: C:\Users\Vladimir\CursorWorkspace\valaam-prayers\valaam-prayers. Прочитай docs\native-bridge-protocol.md, раздел «Seed», ключ `widget`. Краткий контракт в конце этого промпта.

## ЦЕЛЬ

После установки без сети виджет показывает дни церковного года. Тексты берутся из seed, иконки ближайших дней уже лежат в том кэше, откуда виджет их читает.

## ЖЁСТКИЕ РЕШЕНИЯ

- Виджет пишется в свою базу через `Storage.storeWidgetItemsSync` и `ApiWidgetItem.toItem()`. В таблицы веб-сида (`calendar_days`, `prayer_details`, индексы) эти страницы не попадают.
- `SeedCoordinator` не читает ключ `widget` и не меняет из-за него `seed_state`.
- Иконки копируются в `filesDir/valaam_cache/` — каталог `FileCacheManager`. Сетевой `downloadAndCacheFile` для файлов из seed не вызывается.
- Повторно seed виджета не применяется. Метка живёт в `WidgetInfoPreferences`, не в metadata веб-БД.

## ЧАСТЬ 1. Откуда брать файлы

`syncWebAssets` уже копирует весь `native-seed/` в `assets/seed/`. Отдельная Gradle-задача не нужна. В каталоге есть `manifest.json`, `widget-days-001.json` … и `upload/...`.

Прочитай `assets/seed/manifest.json`. Работай только с `widget`. Нет ключа, `seedVersion` больше 1 или `widget.files` пуст — ничего не пиши и метку не ставь.

## ЧАСТЬ 2. Когда применять

Запуск из `App.onCreate` на `Dispatchers.IO`, рядом с `SeedCoordinator.start()`, не внутри него. WebView не ждать.

Метка в `WidgetInfoPreferences`, ключ `widget_seed_state`, значение `{status, seedVersion, createdAt}`. Пишется один раз.

- Метка `completed` или `skipped` — выйти.
- В таблице виджета уже есть хотя бы одна строка — записать `skipped` и выйти. Существующие дни не затирать.
- Иначе применить seed и записать `completed`.

Падение посередине: метку не писать. `storeWidgetItemsSync` идемпотентен, следующий запуск дописывает то же самое.

## ЧАСТЬ 3. Дни

Файлы из `widget.files` по порядку списка. Каждый файл — конверт `{seedVersion, createdAt, createdAtTs, request, response}`. В базу берётся только `response`, тем же Moshi, что у Retrofit (`widget_api.moshi`, `ApiWidgetListResponse`). Дальше существующий `toItem()` и `storeWidgetItemsSync`. Второй модели дня не заводить.

`id` в JSON — число, в `ApiWidgetItem` поле `String?`. Если текущий адаптер число не принимает, поправь этот адаптер так, чтобы сеть и seed разбирались одним кодом.

`icon` и `icon_desc` бывают `null`. Такой день сохраняется.

После успешной записи всех страниц выставь `WidgetInfoPreferences.setLastSyncTimestamp` в `manifest.createdAtTs` (секунды из манифеста, не `System.currentTimeMillis()`). Следующий `WidgetDataSyncWorker` возьмёт этот момент как `modified_since`. Старые строки `deleteOldWidgetItemsSync` во время seed не удаляй.

## ЧАСТЬ 4. Иконки

`widget.icons` — относительные пути без ведущего слэша: `upload/webp/api/iblock/.../file.webp`. Файл в assets: `seed/` + этот путь. На диске: `filesDir/valaam_cache/` + этот путь. Это тот же файл, который находит `FileCacheManager.getLocalFilePath`.

- Путь с `..`, обратным слэшем или абсолютный — пропустить.
- Файл в кэше уже есть и его длина больше нуля — не перезаписывать.
- Файла нет в assets — пропустить эту иконку, дни из-за неё не откатывать.
- После копирования вызови `getLocalFilePath`, чтобы сработала та же регистрация, что после сетевой загрузки.

В seed около 30 иконок, начиная с дня сборки seed и вперёд. Остальные дни года в JSON есть, их картинки докачает `WidgetDataSyncWorker` по сети, как сейчас.

## ЧАСТЬ 5. Тесты

Юнит-тест на фикстуре (временный каталог и assets):

- пустая база: дни из конверта записаны через тот же маппинг, что у воркера, иконка лежит в `valaam_cache` по пути из манифеста, `lastSyncTimestamp` равен `createdAtTs`;
- второй запуск: строк и файлов не прибавляется;
- база уже не пуста: статус `skipped`, строки прежние;
- путь `upload/../secret.webp` не копируется;
- таблицы веб-сида не открываются и не меняются.

## НЕ ДЕЛАТЬ

Не класть `widget` в `indexes` и в `modules`. Не менять `SeedCoordinator`, мост и `WidgetDataSyncWorker`, кроме чтения уже подготовленной базы. Не скачивать иконки seed по HTTP. Не копировать в кэш дни вне списка `widget.icons`.

В конце кратко опиши изменённые файлы и результаты тестов.

---

## Контракт (кратко)

`native-seed/manifest.json`, ключ рядом с `modules`:

```json
"widget": {
  "files": [{ "file": "widget-days-001.json", "bytes": 120000 }],
  "icons": ["upload/webp/api/iblock/5cb/414_q75/file.webp"]
}
```

`widget-days-*.json` — страницы `GET /days/widget/list` за церковный год (14 января – 13 января следующего), конверт как у остальных файлов seed. `response` — тело API без изменений: `{status, data: {items, nav: {page_count}}}`. В `indexes` виджета нет.
