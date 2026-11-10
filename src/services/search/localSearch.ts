/**
 * Локальный (офлайн) поиск только по названиям из индексов молитвослова и святых.
 * Результат имеет ту же форму, что и ответ `/api/search`, поэтому UI один и тот же.
 */
import type { SearchData, SearchItem, SearchItemType } from '@/services/api/SearchApi';
import { BIBLE_SECTION_ID, BOOKS_SECTION_ID } from '@/stores/prayers';
import type { PrayerElement, PrayerSection } from '@/stores/prayers';
import type { SaintIndex } from '@/stores/saints';
import { buildPlainTextIndex } from '@/text-processing-v3/textSearch';

/** Как и на сервере, для частых слов выдача упирается в 500. */
const MAX_LOCAL_RESULTS = 500;

const IBLOCK_BY_TYPE: Record<SearchItemType, number> = {
  prayers: 28,
  saints: 34,
  calendar: 30,
};

export interface LocalSearchEntry {
  item: Omit<SearchItem, 'name' | 'text'>;
  /** Исходное название (без HTML). */
  name: string;
  /** Название в нижнем регистре, без ударений. */
  plain: string;
}

function createEntry(
  id: number,
  type: SearchItemType,
  typeName: string,
  name: string,
  href: string,
  path: string[],
): LocalSearchEntry {
  return {
    item: { id, iblock_id: IBLOCK_BY_TYPE[type], type, type_name: typeName, href, path },
    name,
    plain: buildPlainTextIndex(name).plain,
  };
}

/**
 * Путь по разделам, как у сервера: от корня книги вниз, а если книги нет —
 * один ближайший раздел.
 */
function createPathResolver(sectionById: Map<number, PrayerSection>) {
  return (startSectionId: number | null): string[] => {
    const chain: string[] = [];
    const visited = new Set<number>();
    let id = startSectionId;

    while (id != null && !visited.has(id)) {
      visited.add(id);
      const section = sectionById.get(id);
      if (!section) break;
      chain.push(section.name);
      if (section.book_root) return chain.reverse();
      id = section.parent;
    }

    return chain.length > 0 ? [chain[0]] : [];
  };
}

/** Лежит ли раздел (или он сам) внутри «Книг» или Библии. */
function createBookResolver(sectionById: Map<number, PrayerSection>) {
  const cache = new Map<number, boolean>();

  const isBookSection = (sectionId: number | null): boolean => {
    const visited: number[] = [];
    let id = sectionId;
    let result = false;

    while (id != null) {
      const cached = cache.get(id);
      if (cached !== undefined) {
        result = cached;
        break;
      }
      if (id === BOOKS_SECTION_ID || id === BIBLE_SECTION_ID) {
        result = true;
        break;
      }
      if (visited.includes(id)) break;
      visited.push(id);
      id = sectionById.get(id)?.parent ?? null;
    }

    for (const visitedId of visited) cache.set(visitedId, result);
    return result;
  };

  return isBookSection;
}

export function buildLocalSearchIndex(source: {
  elements: readonly PrayerElement[];
  sections: readonly PrayerSection[];
  saints: readonly SaintIndex[];
}): LocalSearchEntry[] {
  const sectionById = new Map(source.sections.map((s) => [s.id, s]));
  const getPath = createPathResolver(sectionById);
  const isBookSection = createBookResolver(sectionById);
  const typeNameOf = (sectionId: number | null) => (isBookSection(sectionId) ? 'Книги' : 'Молитвослов');

  const entries: LocalSearchEntry[] = [];

  for (const section of source.sections) {
    entries.push(
      createEntry(section.id, 'prayers', typeNameOf(section.id), section.name, section.url, getPath(section.parent)),
    );
  }
  for (const element of source.elements) {
    entries.push(
      createEntry(element.id, 'prayers', typeNameOf(element.parent), element.name, element.url, getPath(element.parent)),
    );
  }
  for (const saint of source.saints) {
    entries.push(createEntry(saint.id, 'saints', 'Святые', saint.name, `/saints/${saint.id}?mode=search`, []));
  }

  return entries;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Название с `<mark>` вокруг слов запроса. Слова, идущие подряд (через пробелы),
 * подсвечиваются одним блоком, как на сервере. Ударения сохраняются.
 */
export function highlightName(name: string, words: readonly string[]): string {
  const { plain, starts, ends } = buildPlainTextIndex(name);

  const ranges: Array<[number, number]> = [];
  for (const word of words) {
    let from = 0;
    while (true) {
      const idx = plain.indexOf(word, from);
      if (idx === -1) break;
      ranges.push([starts[idx], ends[idx + word.length - 1]]);
      from = idx + word.length;
    }
  }
  if (ranges.length === 0) return escapeHtml(name);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [ranges[0]];
  for (const [start, end] of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1] || /^\s*$/.test(name.slice(last[1], start))) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  let html = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    html += escapeHtml(name.slice(cursor, start));
    html += `<mark>${escapeHtml(name.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + escapeHtml(name.slice(cursor));
}

/** Слова запроса без ударений и регистра. Все они должны встретиться в названии. */
function queryWords(query: string): string[] {
  const { plain } = buildPlainTextIndex(query);
  return [...new Set(plain.split(/\s+/).filter(Boolean))];
}

export function searchLocal(
  entries: readonly LocalSearchEntry[],
  query: string,
  page: number,
  pageSize: number,
): SearchData {
  const words = queryWords(query);
  if (words.length === 0) return { total: 0, items: [] };

  const phrase = words.join(' ');
  const found = entries.filter((entry) => words.every((word) => entry.plain.includes(word)));

  // Названия, начинающиеся с фразы, выше остальных; внутри группы порядок индекса сохраняется.
  const ranked = [
    ...found.filter((entry) => entry.plain.startsWith(phrase)),
    ...found.filter((entry) => !entry.plain.startsWith(phrase)),
  ].slice(0, MAX_LOCAL_RESULTS);

  const from = (Math.max(page, 1) - 1) * pageSize;
  const items = ranked.slice(from, from + pageSize).map((entry) => ({
    ...entry.item,
    name: highlightName(entry.name, words),
    text: '',
  }));

  return { total: ranked.length, items };
}
