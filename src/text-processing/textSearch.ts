/**
 * Утилиты для поиска по тексту молитвы
 *
 * Поиск делается постранично (по уже разбитым на страницы `pages` из paginateText),
 * т.к. пагинация не разрывает слова между страницами (см. moveLastWordBetweenElements
 * в textUtils.ts) — это избавляет от необходимости маппить позиции между исходным
 * текстом и страницами.
 */
import { getTextNodes } from './textUtils';

export interface PageSentence {
  text: string;
}

export interface PageSentenceIndex {
  page: number; // 1-based номер страницы
  sentences: PageSentence[];
}

export interface SearchMatch {
  id: number; // сквозной индекс по всему документу
  page: number; // 1-based номер страницы
  ordinalOnPage: number; // индекс совпадения внутри страницы (для подсветки active)
  snippet: string; // фраза-контекст без HTML
  matchStart: number; // смещение найденного слова в snippet
  matchLength: number;
}

const MAX_SNIPPET_LENGTH = 160;
const SNIPPET_CONTEXT = 60;

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, blockquote';

// Церковнославянские (и не только) тексты содержат внутри слов невидимые
// символы — мягкие переносы (U+00AD, категория Unicode Cf) и диакритику
// ударения (например, U+0301, категория Mn). Их нужно игнорировать при
// сопоставлении, иначе поиск не найдёт слово, набранное пользователем без них.
const IGNORED_CHAR_REGEX = /[\p{Mn}\p{Cf}]/u;

interface PlainTextIndex {
  plain: string; // текст в нижнем регистре, без диакритики/мягких переносов
  starts: number[]; // starts[i] — позиция символа plain[i] в исходном тексте
  ends: number[]; // ends[i] — позиция конца символа plain[i] (включая "прилипшие" к нему невидимые символы)
}

function buildPlainTextIndex(text: string): PlainTextIndex {
  const plain: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (IGNORED_CHAR_REGEX.test(ch)) {
      if (ends.length > 0) ends[ends.length - 1] = i + 1;
      continue;
    }
    plain.push(ch.toLowerCase());
    starts.push(i);
    ends.push(i + 1);
  }

  return { plain: plain.join(''), starts, ends };
}

/**
 * Находит все непересекающиеся вхождения query в text (регистронезависимо,
 * с игнорированием диакритики и мягких переносов внутри слов)
 */
function findAllMatches(text: string, query: string): { start: number; length: number }[] {
  const queryPlain = buildPlainTextIndex(query).plain;
  if (!queryPlain) return [];

  const { plain, starts, ends } = buildPlainTextIndex(text);
  const result: { start: number; length: number }[] = [];

  let fromIndex = 0;
  while (fromIndex <= plain.length) {
    const idx = plain.indexOf(queryPlain, fromIndex);
    if (idx === -1) break;

    const lastIdx = idx + queryPlain.length - 1;
    const start = starts[idx];
    const end = ends[lastIdx];
    result.push({ start, length: end - start });

    fromIndex = idx + queryPlain.length;
  }

  return result;
}

/**
 * Разбивает текст блочного элемента на предложения (по . ! ?)
 */
function splitIntoSentences(blockText: string): string[] {
  const normalized = blockText.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Строит индекс предложений для каждой страницы. Дорогая DOM-операция —
 * вызывать только при изменении массива страниц, не на каждое нажатие клавиши.
 */
export function buildPageSentenceIndex(pages: readonly string[]): PageSentenceIndex[] {
  return pages.map((html, i) => {
    const container = document.createElement('div');
    container.innerHTML = html;

    const blocks = container.querySelectorAll(BLOCK_SELECTOR);
    const sourceBlocks: Element[] = blocks.length > 0 ? Array.from(blocks) : [container];

    const sentences: PageSentence[] = [];
    sourceBlocks.forEach((block) => {
      const blockText = block.textContent || '';
      splitIntoSentences(blockText).forEach((text) => sentences.push({ text }));
    });

    return { page: i + 1, sentences };
  });
}

function buildSnippet(sentence: string, matchStart: number, matchLength: number): { text: string; matchStart: number } {
  if (sentence.length <= MAX_SNIPPET_LENGTH) {
    return { text: sentence, matchStart };
  }

  const start = Math.max(0, matchStart - SNIPPET_CONTEXT);
  const end = Math.min(sentence.length, matchStart + matchLength + SNIPPET_CONTEXT);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < sentence.length ? '…' : '';

  return {
    text: prefix + sentence.slice(start, end) + suffix,
    matchStart: matchStart - start + prefix.length,
  };
}

/**
 * Ищет query в предпостроенном индексе предложений. Дешёвая строковая операция —
 * можно вызывать на каждое изменение запроса.
 */
export function searchInSentenceIndex(index: PageSentenceIndex[], query: string): SearchMatch[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const matches: SearchMatch[] = [];
  let globalId = 0;

  index.forEach(({ page, sentences }) => {
    let ordinalOnPage = 0;

    sentences.forEach(({ text: sentence }) => {
      findAllMatches(sentence, trimmedQuery).forEach(({ start, length }) => {
        const snippet = buildSnippet(sentence, start, length);
        matches.push({
          id: globalId++,
          page,
          ordinalOnPage: ordinalOnPage++,
          snippet: snippet.text,
          matchStart: snippet.matchStart,
          matchLength: length,
        });
      });
    });
  });

  return matches;
}

/**
 * Оборачивает найденные совпадения query в <mark> внутри HTML страницы, не трогая
 * структуру тегов. Совпадение, разорванное инлайновым тегом (<strong>) посередине
 * слова, не подсвечивается — редкий кейс для данного контента.
 *
 * activeOrdinalOnPage — если задан, совпадение с этим порядковым номером на странице
 * получает дополнительный класс search-highlight-active.
 */
export function highlightPageHtml(html: string, query: string, activeOrdinalOnPage?: number): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  let ordinal = 0;

  getTextNodes(container).forEach((textNode) => {
    const text = textNode.textContent || '';
    const nodeMatches = findAllMatches(text, trimmedQuery);
    if (nodeMatches.length === 0) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;

    nodeMatches.forEach(({ start, length }) => {
      if (start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      }

      const mark = document.createElement('mark');
      mark.className = ordinal === activeOrdinalOnPage
        ? 'search-highlight search-highlight-active'
        : 'search-highlight';
      mark.textContent = text.slice(start, start + length);
      frag.appendChild(mark);

      cursor = start + length;
      ordinal += 1;
    });

    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    textNode.parentNode?.replaceChild(frag, textNode);
  });

  return container.innerHTML;
}
