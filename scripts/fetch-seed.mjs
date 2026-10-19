#!/usr/bin/env node
/**
 * Скачивает начальные данные (seed) для нативных приложений в формате ответов API.
 * Контракт: docs/native-bridge-protocol.md, раздел "Seed".
 *
 *   npm run seed:fetch -- [--out native-seed] [--years 2026] [--concurrency 4] [--base https://app.valaam.ru/api]
 *
 * Папка с seed лежит вне www/, src/ и public/, поэтому на сервер (scripts/deploy.cmd копирует только www/) не попадает.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = {
    out: "native-seed",
    years: [new Date().getFullYear()],
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
      case "--years":
        options.years = value.split(",").map((year) => Number(year.trim()));
        if (options.years.some((year) => !Number.isInteger(year) || year < 2000 || year > 2100)) {
          fail(`Неверный --years: ${value}`);
        }
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
  const fromDate = `${Math.min(...options.years)}0101`;
  const toDate = `${Math.max(...options.years)}1231`;

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

    const stripItems = ({ items, ...file }) => file;
    const manifest = {
      seedVersion: SEED_VERSION,
      createdAt,
      createdAtTs,
      webVersion,
      years: options.years,
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
    };

    // Самопроверка до публикации: нативка не должна получить битый seed
    const itemTotals = {
      calendar: { got: sum(calendarFiles, (f) => f.items), expected: daysCount.count },
      molitvoslov: { got: sum(molitvoslovFiles, (f) => f.items), expected: sum(sectionCounts, (s) => s.count) },
    };
    await verifySeed(tmpDir, manifest, itemTotals);

    // manifest.json пишется последним: без него seed считается неготовым
    await writeFile(path.join(tmpDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
    await rename(tmpDir, outDir);

    const totalBytes = sum(
      [...indexes, ...calendarFiles, ...molitvoslovFiles],
      (file) => file.bytes
    );
    console.log(
      `Готово: ${path.relative(projectRoot, outDir) || outDir}, файлов ${indexes.length + calendarFiles.length + molitvoslovFiles.length + 1}, ` +
        `${(totalBytes / 1048576).toFixed(1)} МБ`
    );
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

function sum(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}

async function verifySeed(dir, manifest, itemTotals) {
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

  for (const [name, { got, expected }] of Object.entries(itemTotals)) {
    if (got !== expected) warnings.push(`${name}: элементов ${got}, а /count вернул ${expected}`);
  }

  for (const warning of warnings) console.warn(`Предупреждение: ${warning}`);
  if (problems.length > 0) throw new Error(`Самопроверка seed не пройдена:\n  ${problems.join("\n  ")}`);
  console.log("Самопроверка пройдена");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
