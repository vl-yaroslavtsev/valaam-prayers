# Промпт для iOS: данные и иконки виджета из seed

Промпт целиком передаётся агенту в репозитории iOS. Источник контракта: `docs/native-bridge-protocol.md`, раздел «Seed», ключ `widget`. При расхождении прав протокол. Логика совпадает с Android (`android-widget-seed.md`): своя база виджета, не база веб-бандла.

---

Репозиторий: C:\Users\Vladimir\CursorWorkspace\valaam-prayers-ios (приложение Valaam, виджет ValaamWidget, Shared, пакет Packages/ValaamOffline).
Веб-проект: C:\Users\Vladimir\CursorWorkspace\valaam-prayers\valaam-prayers. Прочитай docs\native-bridge-protocol.md, раздел «Seed», ключ `widget`. Краткий контракт в конце этого промпта.

## ЦЕЛЬ

После установки без сети виджет показывает дни церковного года. Тексты лежат в `CalendarDays.sqlite` группы приложения, иконки ближайших дней — в `ImageCache`, откуда `ValaamWidget` уже читает `ImageFileCache`.

## ЖЁСТКИЕ РЕШЕНИЯ

- Дни пишет `CalendarDayStore.upsert`. Разбор страницы — тот же `WidgetDayListResponse`, что у `CalendarSyncService.fetchPage`. В GRDB веб-сида (`ValaamOffline`) эти страницы не попадают.
- `SeedCoordinator` ключ `widget` не читает.
- Ресурс `seed/` остаётся только в таргете приложения. В таргет виджета его не добавлять: расширение читает App Group.
- `CalendarSyncBookmark.markFullSuccess()` из seed не вызывать. Иначе сутки не качаются иконки дней, которых в seed нет.
- Метка seed виджета — отдельный ключ в `AppGroup.userDefaults`, не `calendarFullSyncCompletedAt` и не `seed_state` веб-базы.

## ЧАСТЬ 1. Откуда брать файлы

Run Script уже копирует `native-seed/` в ресурс `seed/` приложения. Второе копирование не добавлять. Внутри: `manifest.json`, `widget-days-001.json` … и `upload/...`.

Прочитай `manifest.json` из подкаталога `seed`. Работай только с `widget`. Нет ключа, `seedVersion` больше 1 или `widget.files` пуст — ничего не пиши и метку не ставь.

## ЧАСТЬ 2. Когда применять

Запуск из приложения при старте, до сетевого `CalendarSyncService`, и без сети тоже. База — `CalendarDayStore` в App Group.

Метка `widgetSeedState`: `{status, seedVersion, createdAt}`. Пишется один раз.

- `completed` или `skipped` — выйти.
- В `CalendarDays` уже есть хотя бы один день — записать `skipped` и выйти. Существующие дни не затирать и `deleteDays` не вызывать.
- Иначе применить seed и записать `completed`.

Падение посередине: метку не писать. `upsert` идемпотентен по дате, следующий запуск дописывает то же самое.

## ЧАСТЬ 3. Дни

Файлы из `widget.files` по порядку. Файл — конверт `{seedVersion, createdAt, createdAtTs, request, response}`. В базу берётся `response`, декодером `WidgetDayListResponse`, затем `CalendarDayStore.upsert`. Второй модели дня не заводить.

`icon` и `icon_desc` в API бывают `null`. Сейчас `WidgetData` ждёт строки и из-за одного такого дня отбрасывает всю страницу. Ослабь этот декодер (пустая строка или optional) — им пользуются и сеть, и seed. Отдельный тип для seed не создавать. День с пустой иконкой сохраняется.

`CalendarSyncBookmark` не трогать. Когда появится сеть, обычный sync докачает обновления и остальные иконки.

## ЧАСТЬ 4. Иконки

`widget.icons` — пути без ведущего слэша: `upload/webp/api/iblock/.../file.webp`. Байты читать из ресурса `seed/` + путь. Класть через `ImageFileCache.save`, чтобы файл оказался в `{AppGroup}/ImageCache/` + путь. Виджет читает его `ImageFileCache.data`.

- Путь с `..` не копировать (`ImageFileCache.fileURL` такие сегменты уже выбрасывает — не обходи это).
- Файл в `ImageCache` уже есть — не перезаписывать, как `downloadIfMissing`.
- Файла нет в ресурсе — пропустить иконку, дни не откатывать.

В seed около 30 иконок, начиная с дня сборки seed и вперёд. Тексты есть на весь церковный год. Остальные картинки качает существующий sync по сети.

## ЧАСТЬ 5. Тесты

XCTest на фикстуре во временном каталоге (sqlite и каталог картинок подменить, App Group не обязателен):

- пустая база: дни из `response` записаны тем же `upsert`, файл иконки лежит по пути из манифеста;
- второй запуск ничего не меняет;
- в базе уже есть день: статус `skipped`;
- путь `upload/../secret.webp` не копируется;
- `CalendarSyncBookmark.lastFullSuccess` остаётся пустым;
- пакет `ValaamOffline` не открывается.

## НЕ ДЕЛАТЬ

Не добавлять `seed` в таргет виджета. Не класть страницы виджета в веб-базу. Не вызывать `markFullSuccess` и `deleteDays` из seed. Не скачивать иконки seed по HTTP. Не заводить вторую модель дня параллельно `WidgetData`.

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
