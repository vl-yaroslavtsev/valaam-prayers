#!/usr/bin/env node
/**
 * Скачивает начальные данные (seed) для нативных приложений в формате ответов API.
 * Контракт: docs/native-bridge-protocol.md, раздел "Seed".
 *
 *   npm run seed:fetch -- [--out native-seed] [--concurrency 4] [--base https://app.valaam.ru/api]
 *
 * Папка с seed лежит вне www/, src/ и public/, поэтому на сервер (scripts/deploy.cmd копирует только www/) не попадает.
 * Виджет — ключ manifest.widget рядом с modules, не запись в indexes: его забирает отдельная база.
 * Страницы /days/widget/list за церковный год (14 января – 13 января) и до 30 иконок с сегодняшнего дня в upload/.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SEED_VERSION = 1;
const PAGE_SIZE = 100;
const MOLITVOSLOV_ROOT_SECTION_ID = 842;
const LITURGICAL_BOOKS_SECTION_ID = 937;
/** Запас от рассинхронизации часов и пересечения с запросом: modified_since = createdAt заберёт всё изменённое после съёма */
const CREATED_AT_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const REQUEST_ATTEMPTS = 5;
/**
 * Нативке не нужно держать в памяти больше одной страницы. Страницы с длинными текстами (раздел 901) весят до 8 МБ,
 * заметно больше означает, что формат пора пересмотреть
 */
const FILE_SIZE_WARN_BYTES = 10 * 1024 * 1024;
const FORBIDDEN_OUT_DIRS = ["www", "src", "public"];
const ICON_COUNT = 30;
const DATE_RE = /^\d{8}$/;
const DAY_MS = 86_400_000;
const ICON_PATH_RE = /^\/upload\/[A-Za-z0-9._/-]+$/;
const PROBLEM_LIMIT = 30;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Церковный год начинается 14 января. 1–13 января ещё относятся к предыдущему году. */
export function churchYearRange(now = new Date()) {
  const year = now.getFullYear();
  const startYear = now.getMonth() === 0 && now.getDate() < 14 ? year - 1 : year;
  return { from: `${startYear}0114`, to: `${startYear + 1}0113` };
}

/**
 * Диапазон календаря: тот же, что нативка запрашивает с modified_since (src/services/download/calendarRange.ts).
 * Дни вне seed с modified_since не придут, пока не изменятся на сервере, поэтому seed обязан покрывать весь диапазон.
 * 1–13 января: два года, с 14 января прошлого по 13 января следующего. Дальше: с 14 января текущего по 13 января следующего.
 */
export function calendarDownloadRange(now = new Date()) {
  const year = now.getFullYear();
  const startYear = now.getMonth() === 0 && now.getDate() <= 13 ? year - 1 : year;
  return { from: `${startYear}0114`, to: `${year + 1}0113` };
}

export function formatDateCode(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}${month}${day}`;
}

export function isRealDateCode(code) {
  if (!DATE_RE.test(code)) return false;
  const year = Number(code.slice(0, 4));
  const month = Number(code.slice(4, 6));
  const day = Number(code.slice(6, 8));
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function nextDateCode(code) {
  const utc = new Date(Date.UTC(Number(code.slice(0, 4)), Number(code.slice(4, 6)) - 1, Number(code.slice(6, 8))) + DAY_MS);
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}${month}${day}`;
}

export function inclusiveDayCount(from, to) {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(4, 6)) - 1, Number(from.slice(6, 8)));
  const end = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(4, 6)) - 1, Number(to.slice(6, 8)));
  return Math.round((end - start) / DAY_MS) + 1;
}

/** Путь внутри каталога seed без ведущего слэша. null, если на диск его класть нельзя. */
export function safeIconRelative(icon) {
  if (typeof icon !== "string" || !icon.startsWith("/upload/") || icon.includes("..") || icon.includes("\\") || icon.includes("//")) {
    return null;
  }
  if (!ICON_PATH_RE.test(icon)) return null;
  return icon.slice(1);
}

export function isImageBuffer(bytes) {
  if (!bytes || bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function selectUpcomingIcons(items, today, limit = ICON_COUNT) {
  const sorted = [...items].sort((a, b) => String(a?.date ?? "").localeCompare(String(b?.date ?? "")));
  const picked = [];
  const seen = new Set();
  for (const item of sorted) {
    if (typeof item?.date !== "string" || item.date < today) continue;
    const relative = safeIconRelative(item.icon);
    if (!relative || seen.has(relative)) continue;
    seen.add(relative);
    picked.push(relative);
    if (picked.length >= limit) break;
  }
  return picked;
}

function pushProblem(problems, message) {
  if (problems.length < PROBLEM_LIMIT) problems.push(message);
  else if (problems.length === PROBLEM_LIMIT) problems.push("дальнейшие ошибки скрыты");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkPart(part, label, problems) {
  if (!isRecord(part)) {
    pushProblem(problems, `${label}: ожидался объект`);
    return;
  }
  if (typeof part.t !== "string") pushProblem(problems, `${label}: поле t должно быть строкой`);
  if (typeof part.name !== "boolean") pushProblem(problems, `${label}: поле name должно быть boolean`);
  if (typeof part.bold !== "boolean") pushProblem(problems, `${label}: поле bold должно быть boolean`);
}

function checkSaint(saint, label, problems) {
  if (!isRecord(saint)) {
    pushProblem(problems, `${label}: ожидался объект`);
    return;
  }
  if (!(saint.sign === null || typeof saint.sign === "string")) pushProblem(problems, `${label}: sign должен быть строкой или null`);
  if (typeof saint.big !== "boolean") pushProblem(problems, `${label}: big должен быть boolean`);
  if (!Array.isArray(saint.parts)) {
    pushProblem(problems, `${label}: parts должен быть массивом`);
    return;
  }
  saint.parts.forEach((part, index) => checkPart(part, `${label}.parts[${index}]`, problems));
}

export function validateWidgetItems(items, range) {
  const problems = [];
  if (!Array.isArray(items)) return ["widget: ожидался список дней"];
  const expectedCount = inclusiveDayCount(range.from, range.to);
  if (items.length !== expectedCount) {
    pushProblem(problems, `widget: дней ${items.length}, в диапазоне ${range.from}–${range.to} их ${expectedCount}`);
  }

  const sorted = [...items].sort((a, b) => String(a?.date ?? "").localeCompare(String(b?.date ?? "")));
  const dates = new Set();
  let expectedDate = range.from;
  let dateWalkBroken = false;
  sorted.forEach((item, index) => {
    const label = `widget[${index}]`;
    if (!isRecord(item)) {
      pushProblem(problems, `${label}: ожидался объект`);
      dateWalkBroken = true;
      return;
    }
    if (!(typeof item.id === "number" || (typeof item.id === "string" && item.id.length > 0))) {
      pushProblem(problems, `${label}: id должен быть числом или непустой строкой`);
    }
    if (typeof item.date !== "string" || !isRealDateCode(item.date)) {
      pushProblem(problems, `${label}: date должен быть датой YYYYMMDD`);
      dateWalkBroken = true;
    } else {
      if (dates.has(item.date)) pushProblem(problems, `${label}: повтор даты ${item.date}`);
      dates.add(item.date);
      if (!dateWalkBroken && item.date !== expectedDate) {
        pushProblem(problems, `${label}: дата ${item.date}, ожидалась ${expectedDate}`);
        dateWalkBroken = true;
      } else if (!dateWalkBroken) {
        expectedDate = nextDateCode(item.date);
      }
    }
    if (typeof item.date_old !== "string" || !isRealDateCode(item.date_old)) {
      pushProblem(problems, `${label}: date_old должен быть датой YYYYMMDD`);
    }
    if (typeof item.week !== "string") pushProblem(problems, `${label}: week должен быть строкой`);
    if (!(item.tone === null || Number.isInteger(item.tone))) pushProblem(problems, `${label}: tone должен быть целым числом или null`);
    if (item.icon !== null && !safeIconRelative(item.icon)) pushProblem(problems, `${label}: icon должен быть путём /upload/... или null`);
    if (!(item.icon_desc === null || typeof item.icon_desc === "string")) {
      pushProblem(problems, `${label}: icon_desc должен быть строкой или null`);
    }
    const fasting = item.fasting;
    if (!isRecord(fasting) || typeof fasting.type !== "string" || typeof fasting.title !== "string" || !isRecord(fasting.rules)) {
      pushProblem(problems, `${label}: fasting должен содержать type, title и rules`);
    } else {
      const monastic = fasting.rules.monastic;
      if (!isRecord(monastic) || typeof monastic.code !== "string" || typeof monastic.title !== "string") {
        pushProblem(problems, `${label}: fasting.rules.monastic должен содержать code и title`);
      }
    }
    if (!Array.isArray(item.saints_items)) pushProblem(problems, `${label}: saints_items должен быть массивом`);
    else item.saints_items.forEach((saint, saintIndex) => checkSaint(saint, `${label}.saints_items[${saintIndex}]`, problems));
    if (item.saints_or_week_parts != null) {
      if (!Array.isArray(item.saints_or_week_parts)) pushProblem(problems, `${label}: saints_or_week_parts должен быть массивом`);
      else item.saints_or_week_parts.forEach((part, partIndex) => checkPart(part, `${label}.saints_or_week_parts[${partIndex}]`, problems));
    }
  });
  return problems;
}

function iconDestination(root, relative) {
  if (typeof relative !== "string" || !relative.startsWith("upload/") || relative.includes("..") || relative.includes("\\") || relative.includes("//")) {
    throw new Error(`Небезопасный путь иконки: ${relative}`);
  }
  const dest = path.resolve(root, ...relative.split("/"));
  const back = path.relative(root, dest);
  if (back.startsWith("..") || path.isAbsolute(back)) throw new Error(`Путь иконки выходит за пределы каталога: ${relative}`);
  return dest;
}

async function downloadIcon(origin, relative, root) {
  const url = `${origin}/${relative}`;
  let lastError;
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (new URL(res.url).protocol !== "https:") throw new Error("ответ пришёл не по https");
      const bytes = Buffer.from(await res.arrayBuffer());
      if (!isImageBuffer(bytes)) throw new Error("ответ не изображение");
      const dest = iconDestination(root, relative);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
      return bytes.length;
    } catch (err) {
      lastError = err;
      if (attempt < REQUEST_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`${url}: ${lastError?.message ?? lastError}`);
}

async function readWidgetItems(dir, files) {
  const items = [];
  for (const file of files) {
    const envelope = JSON.parse(await readFile(path.join(dir, file.file), "utf8"));
    const pageItems = envelope.response?.data?.items;
    if (!Array.isArray(pageItems)) throw new Error(`${file.file}: нет data.items`);
    items.push(...pageItems);
  }
  return items;
}

function parseArgs(argv) {
  const options = {
    out: "native-seed",
    concurrency: 4,
    base: "https://app.valaam.ru/api",
  };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    const value = argv[i + 1];
    if (!name.startsWith("--") || value === undefined) fail(`Неверный аргумент: ${name}`);
    i++;
    switch (name) {
      case "--out":
        options.out = value;
        break;
      case "--concurrency":
        options.concurrency = Number(value);
        if (!Number.isInteger(options.concurrency) || options.concurrency < 1) fail(`Неверный --concurrency: ${value}`);
        break;
      case "--base":
        options.base = value.replace(/\/+$/, "");
        break;
      default:
        fail(`Неизвестный аргумент: ${name}`);
    }
  }
  return options;
}

function fail(message) {
  console.error(`Ошибка: ${message}`);
  process.exit(1);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** Seed не должен попасть на сервер и не должен затереть исходники или сборку */
function resolveOutDir(out) {
  const outDir = path.resolve(projectRoot, out);

  if (isInside(outDir, projectRoot)) fail(`--out не может совпадать с корнем проекта или его родителем: ${outDir}`);
  for (const forbidden of FORBIDDEN_OUT_DIRS) {
    if (isInside(path.join(projectRoot, forbidden), outDir)) {
      fail(`--out не может лежать в ${forbidden}/: оттуда файлы попадут на сервер или в исходники`);
    }
  }
  if (existsSync(outDir)) {
    const hasManifest = existsSync(path.join(outDir, "manifest.json"));
    if (!hasManifest && (!statSync(outDir).isDirectory() || readdirSync(outDir).length > 0)) {
      fail(`${outDir} существует и не похожа на папку seed (нет manifest.json): не буду её перезаписывать`);
    }
  }
  return outDir;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function createClient(base) {
  /** Возвращает { body, response, serverDate }. body это распарсенное тело API, проверено на status=success */
  async function request(endpoint) {
    const url = `${base}${endpoint}`;
    let lastError;
    for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (body?.status !== "success" || body.data == null) {
          throw new Error(`Ответ API не success: ${JSON.stringify(body?.errors ?? body).slice(0, 200)}`);
        }
        return { body, serverDate: res.headers.get("date") };
      } catch (err) {
        lastError = err;
        if (attempt < REQUEST_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
      }
    }
    throw new Error(`${endpoint}: ${lastError?.message ?? lastError}`);
  }
  return { request };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolveOutDir(options.out);
  const tmpDir = `${outDir}.tmp-${process.pid}`;
  const client = createClient(options.base);
  const webVersion = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")).version;
  const { from: fromDate, to: toDate } = calendarDownloadRange();

  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });

  try {
    // Первый запрос идёт до всех остальных: его Date задаёт createdAt
    const prayers = await client.request("/prayers");
    const serverMs = prayers.serverDate ? Date.parse(prayers.serverDate) : NaN;
    if (Number.isNaN(serverMs)) console.warn("Предупреждение: у ответа нет заголовка Date, createdAt берётся из часов компьютера");
    const createdMs = (Number.isNaN(serverMs) ? Date.now() : serverMs) - CREATED_AT_MARGIN_MS;
    const createdAt = new Date(createdMs).toISOString();
    const createdAtTs = Math.floor(createdMs / 1000);
    console.log(`createdAt = ${createdAt}`);

    const writeEnvelope = async (file, endpoint, body) => {
      const envelope = { seedVersion: SEED_VERSION, createdAt, createdAtTs, request: endpoint, response: body };
      const text = JSON.stringify(envelope);
      await writeFile(path.join(tmpDir, file), text, "utf8");
      const bytes = Buffer.byteLength(text, "utf8");
      if (bytes > FILE_SIZE_WARN_BYTES) console.warn(`Предупреждение: ${file} занимает ${(bytes / 1048576).toFixed(1)} МБ`);
      return bytes;
    };

    const molitvoslovSections = prayers.body.data.sections
      .filter((section) => section.parent === MOLITVOSLOV_ROOT_SECTION_ID && section.id !== LITURGICAL_BOOKS_SECTION_ID)
      .map((section) => section.id);
    if (molitvoslovSections.length === 0) throw new Error("В /prayers нет разделов молитвослова");

    const indexes = [];
    indexes.push({ name: "prayers", file: "prayers.json", bytes: await writeEnvelope("prayers.json", "/prayers", prayers.body) });
    console.log("prayers.json");

    const saints = await client.request("/saints");
    indexes.push({ name: "saints", file: "saints-index.json", bytes: await writeEnvelope("saints-index.json", "/saints", saints.body) });
    console.log("saints-index.json");

    const markers = await client.request("/days/calendar");
    indexes.push({
      name: "calendarMarkers",
      file: "calendar-markers.json",
      bytes: await writeEnvelope("calendar-markers.json", "/days/calendar", markers.body),
    });
    console.log("calendar-markers.json");

    /** Все страницы постраничного списка: первая определяет число страниц, остальные идут параллельно */
    const fetchPages = async (listPath, params, fileName, extra) => {
      const endpointFor = (page) => {
        const search = new URLSearchParams({ ...params, page: String(page), page_size: String(PAGE_SIZE) });
        return `${listPath}?${search.toString()}`;
      };
      const writePage = async (page, result, totalPages) => {
        const file = fileName(page);
        const bytes = await writeEnvelope(file, endpointFor(page), result.body);
        console.log(file);
        return { file, bytes, ...extra, page, totalPages, items: result.body.data.items?.length ?? 0 };
      };

      const first = await client.request(endpointFor(1));
      const totalPages = first.body.data.nav?.page_count ?? 1;
      const files = [await writePage(1, first, totalPages)];
      const rest = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const others = await mapLimit(rest, options.concurrency, async (page) => {
        const result = await client.request(endpointFor(page));
        return writePage(page, result, totalPages);
      });
      return [...files, ...others];
    };

    const pad = (page) => String(page).padStart(3, "0");

    const daysCount = (await client.request(`/days/count?from_date=${fromDate}&to_date=${toDate}`)).body.data;
    const calendarFiles = await fetchPages(
      "/days/list",
      { from_date: fromDate, to_date: toDate },
      (page) => `calendar-days-${pad(page)}.json`,
      {}
    );

    const sectionCounts = await mapLimit(molitvoslovSections, options.concurrency, async (sectionId) => ({
      sectionId,
      ...(await client.request(`/prayers/count?section_id=${sectionId}`)).body.data,
    }));
    const molitvoslovFiles = [];
    for (const sectionId of molitvoslovSections) {
      molitvoslovFiles.push(
        ...(await fetchPages(
          "/prayers/list",
          { section_id: String(sectionId) },
          (page) => `molitvoslov-${sectionId}-${pad(page)}.json`,
          { sectionId }
        ))
      );
    }

    const widgetRange = churchYearRange();
    const today = formatDateCode();
    console.log(`виджет ${widgetRange.from}–${widgetRange.to}, иконки с ${today}`);
    const widgetFiles = await fetchPages(
      "/days/widget/list",
      { from_date: widgetRange.from, to_date: widgetRange.to },
      (page) => `widget-days-${pad(page)}.json`,
      {}
    );
    const widgetItems = await readWidgetItems(tmpDir, widgetFiles);
    const widgetProblems = validateWidgetItems(widgetItems, widgetRange);
    if (widgetProblems.length > 0) throw new Error(`Проверка виджета не пройдена:\n  ${widgetProblems.join("\n  ")}`);
    const icons = selectUpcomingIcons(widgetItems, today);
    if (icons.length === 0) throw new Error(`Нет иконок виджета с ${today} по ${widgetRange.to}`);
    if (icons.length < ICON_COUNT) console.warn(`Предупреждение: иконок с ${today} вперёд ${icons.length}, лимит ${ICON_COUNT}`);
    const origin = new URL(options.base).origin;
    await mapLimit(icons, options.concurrency, async (relative, index) => {
      const size = await downloadIcon(origin, relative, tmpDir);
      console.log(`иконка ${index + 1}/${icons.length}: ${relative} (${size} байт)`);
    });

    const stripItems = ({ items, ...file }) => file;
    const manifest = {
      seedVersion: SEED_VERSION,
      createdAt,
      createdAtTs,
      webVersion,
      calendarRange: { from: fromDate, to: toDate },
      indexes,
      modules: {
        calendar: {
          apiSize: daysCount.size,
          files: calendarFiles.map(stripItems),
        },
        molitvoslov: {
          apiSize: sectionCounts.reduce((sum, section) => sum + section.size, 0),
          sections: molitvoslovSections,
          files: molitvoslovFiles.map(stripItems),
        },
      },
      widget: {
        files: widgetFiles.map(({ file, bytes }) => ({ file, bytes })),
        icons,
      },
    };

    // Самопроверка до публикации: нативка не должна получить битый seed
    const itemTotals = {
      calendar: { got: sum(calendarFiles, (f) => f.items), expected: daysCount.count },
      molitvoslov: { got: sum(molitvoslovFiles, (f) => f.items), expected: sum(sectionCounts, (s) => s.count) },
    };
    await verifySeed(tmpDir, manifest, itemTotals, widgetRange);

    // manifest.json пишется последним: без него seed считается неготовым
    await writeFile(path.join(tmpDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
    await rename(tmpDir, outDir);

    const totalBytes = sum(
      [...indexes, ...calendarFiles, ...molitvoslovFiles, ...widgetFiles],
      (file) => file.bytes
    );
    const fileCount = indexes.length + calendarFiles.length + molitvoslovFiles.length + widgetFiles.length + 1;
    console.log(
      `Готово: ${path.relative(projectRoot, outDir) || outDir}, файлов ${fileCount}, ` +
        `${(totalBytes / 1048576).toFixed(1)} МБ, иконок виджета ${icons.length}`
    );
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

function sum(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}

async function verifySeed(dir, manifest, itemTotals, widgetRange) {
  const problems = [];
  const warnings = [];

  const readEnvelope = async (entry) => {
    const text = await readFile(path.join(dir, entry.file), "utf8");
    if (Buffer.byteLength(text, "utf8") !== entry.bytes) problems.push(`${entry.file}: размер не совпал с manifest`);
    const envelope = JSON.parse(text);
    if (envelope.seedVersion !== SEED_VERSION) problems.push(`${entry.file}: неверный seedVersion`);
    if (envelope.createdAt !== manifest.createdAt || envelope.createdAtTs !== manifest.createdAtTs) {
      problems.push(`${entry.file}: createdAt не совпал с manifest`);
    }
    if (envelope.response?.status !== "success") problems.push(`${entry.file}: response.status не success`);
    return envelope;
  };

  for (const entry of manifest.indexes) await readEnvelope(entry);

  const checkModule = async (name, files, groupKey) => {
    const groups = new Map();
    for (const entry of files) {
      await readEnvelope(entry);
      const key = groupKey(entry);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    for (const [key, entries] of groups) {
      const pages = entries.map((entry) => entry.page).sort((a, b) => a - b);
      const totalPages = entries[0].totalPages;
      const expected = Array.from({ length: totalPages }, (_, i) => i + 1);
      if (pages.join() !== expected.join()) problems.push(`${name} ${key}: страницы ${pages.join(",")} вместо 1..${totalPages}`);
    }
    if (files.length === 0) problems.push(`${name}: нет файлов`);
  };
  await checkModule("calendar", manifest.modules.calendar.files, () => "all");
  await checkModule("molitvoslov", manifest.modules.molitvoslov.files, (entry) => `section ${entry.sectionId}`);

  if (manifest.indexes.some((entry) => entry.name === "widget" || entry.name === "widgetData")) {
    problems.push("widget указан в indexes");
  }
  const widget = manifest.widget;
  if (!widget || !Array.isArray(widget.files) || widget.files.length === 0) {
    problems.push("widget: нет файлов");
  } else {
    const items = [];
    const pages = [];
    let pageCount = null;
    for (const entry of widget.files) {
      const envelope = await readEnvelope(entry);
      const page = Number(new URL(envelope.request, "https://app.valaam.ru").searchParams.get("page"));
      const declared = envelope.response?.data?.nav?.page_count;
      if (!Number.isInteger(page) || page < 1) problems.push(`${entry.file}: в request нет page`);
      else pages.push(page);
      if (!Number.isInteger(declared)) problems.push(`${entry.file}: нет page_count`);
      else if (pageCount == null) pageCount = declared;
      else if (pageCount !== declared) problems.push(`${entry.file}: page_count ${declared} вместо ${pageCount}`);
      if (!Array.isArray(envelope.response?.data?.items)) problems.push(`${entry.file}: нет data.items`);
      else items.push(...envelope.response.data.items);
    }
    const sortedPages = [...pages].sort((a, b) => a - b);
    const expectedPages = Array.from({ length: widget.files.length }, (_, index) => index + 1);
    if (sortedPages.join() !== expectedPages.join()) {
      problems.push(`widget: страницы ${sortedPages.join(",")} вместо 1..${widget.files.length}`);
    }
    if (pageCount != null && pageCount !== widget.files.length) {
      problems.push(`widget: файлов ${widget.files.length}, page_count = ${pageCount}`);
    }
    problems.push(...validateWidgetItems(items, widgetRange));
    if (!Array.isArray(widget.icons)) problems.push("widget.icons должен быть массивом");
    else {
      for (const icon of widget.icons) {
        try {
          const dest = iconDestination(dir, icon);
          if (!existsSync(dest) || statSync(dest).size === 0) problems.push(`widget.icons: нет файла ${icon}`);
        } catch (err) {
          problems.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  for (const [name, { got, expected }] of Object.entries(itemTotals)) {
    if (got !== expected) warnings.push(`${name}: элементов ${got}, а /count вернул ${expected}`);
  }

  for (const warning of warnings) console.warn(`Предупреждение: ${warning}`);
  if (problems.length > 0) throw new Error(`Самопроверка seed не пройдена:\n  ${problems.join("\n  ")}`);
  console.log("Самопроверка пройдена");
}

const isDirectRun = process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
