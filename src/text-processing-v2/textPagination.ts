/**
 * Пагинация HTML-текста через Range API.
 *
 * Длинный HTML сначала режется на куски ~N страниц (срез перед `<p>` /
 * `<blockquote>`). Последнюю страницу куска добираем из следующего, чтобы
 * на стыке не оставался короткий разрыв. Каждый кусок вставляется в скрытый
 * контейнер один раз: дальше DOM не меняется, границы страниц ищем чтением
 * getBoundingClientRect по Range, а HTML страницы получаем через
 * Range.cloneContents() — браузер сам закрывает/открывает вложенные строчные
 * теги на разрыве.
 */

import { waitForFontsLoaded } from "@/js/utils";
import {
  estimateCharsForPages,
  splitHtmlByCharBudget,
  PAGES_PER_CHUNK,
} from "./splitHtmlChunks";

export interface PaginationHeader {
  level: number;
  text: string;
  page: number;
}

export interface PaginationResult {
  pages: string[];
  headers: PaginationHeader[];
}

const UNSPLITTABLE_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const SPLITTABLE_TAGS = new Set(["P", "BLOCKQUOTE"]);

/** Субпиксельный запас: сравнение bottom с лимитом страницы. */
const FIT_EPSILON_PX = 0.5;
const MAX_PAGES_PER_YIELD = 10;
const MIN_PAGE_HEIGHT_PX = 50;

type PageStart = {
  node: Text;
  offset: number;
};

type BreakPoint =
  | { kind: "text"; node: Text; offset: number }
  | { kind: "before"; node: Node }
  | { kind: "after"; node: Node }
  | { kind: "end"; container: HTMLElement };

const yieldToMainThread = (): Promise<void> =>
  new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });

/** Граница слова для разрыва страницы: только пробелы, не мягкий перенос. */
const isBreakChar = (ch: string): boolean => /\s/.test(ch);

const closestElement = (node: Node, tags: Set<string>): HTMLElement | null => {
  let el: HTMLElement | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  while (el) {
    if (tags.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
};

/**
 * Шаг 1. Скрытый контейнер той же ширины и с теми же текстовыми стилями,
 * что у страницы читалки. Высота auto — весь документ одним потоком.
 * Вертикальные паддинги страницы обнуляем: в непрерывном потоке их нет,
 * их добавит каждая реальная страница. Горизонтальные оставляем, чтобы
 * ширина колонки совпала с читалкой.
 */
const createMeasureContainer = (
  pageWidth: number,
  cssClasses?: string
): HTMLElement => {
  const element = document.createElement("div");
  if (cssClasses) {
    element.className = cssClasses;
  }

  Object.assign(element.style, {
    position: "absolute",
    visibility: "hidden",
    left: "0",
    top: "0",
    width: `${pageWidth}px`,
    height: "auto",
    overflow: "visible",
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: "-1",
  });
  element.style.paddingTop = "0";
  element.style.paddingBottom = "0";

  document.body.appendChild(element);
  return element;
};

const getPageSize = (
  container?: HTMLElement
): { width: number; height: number } => {
  if (container) {
    return { width: container.clientWidth, height: container.clientHeight };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

/**
 * Высота контентной области одной страницы (clientHeight минус вертикальные
 * паддинги/бордеры `.text-page`). Это maxHeight для нарезки потока.
 */
const measureMaxHeight = (
  pageWidth: number,
  pageHeight: number,
  cssClasses?: string
): number => {
  const probe = document.createElement("div");
  if (cssClasses) {
    probe.className = cssClasses;
  }
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    width: `${pageWidth}px`,
    height: `${pageHeight}px`,
    boxSizing: "border-box",
  });
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const verticalChrome =
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom) +
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0);
  document.body.removeChild(probe);
  // 2px — субпиксельное округление getBoundingClientRect vs scrollHeight.
  return Math.max(pageHeight - verticalChrome - 2, MIN_PAGE_HEIGHT_PX);
};

const insertHtml = (container: HTMLElement, html: string): void => {
  container.innerHTML = html;
};

const firstTextNode = (root: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node.data.length > 0) return node;
    node = walker.nextNode() as Text | null;
  }
  return null;
};

const firstTextNodeAfter = (root: Node, boundary: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const following =
      (boundary.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !==
      0;
    if (following && !boundary.contains(node) && node.data.length > 0) {
      return node;
    }
    node = walker.nextNode() as Text | null;
  }
  return null;
};

/**
 * Сдвигает старт страницы вперёд через пробелы, чтобы следующая страница
 * не начиналась с пробела, уже учтённого на предыдущей.
 */
const skipLeadingWhitespace = (
  container: HTMLElement,
  start: PageStart
): PageStart | null => {
  let { node, offset } = start;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  walker.currentNode = node;

  while (node) {
    while (offset < node.data.length && isBreakChar(node.data[offset])) {
      offset += 1;
    }
    if (offset < node.data.length) {
      return { node, offset };
    }
    const next = walker.nextNode() as Text | null;
    if (!next) return null;
    node = next;
    offset = 0;
  }
  return null;
};

const rangeBottomAtOffset = (range: Range, node: Text, endOffset: number): number => {
  if (endOffset <= 0) {
    range.setStart(node, 0);
    range.collapse(true);
    return range.getBoundingClientRect().bottom;
  }
  // Один символ в конце диапазона: bottom = низ строки, на которой он рисуется.
  range.setStart(node, endOffset - 1);
  range.setEnd(node, endOffset);
  const rects = range.getClientRects();
  if (rects.length === 0) {
    return range.getBoundingClientRect().bottom;
  }
  return rects[rects.length - 1].bottom;
};

/**
 * Точки разрыва по словам: после каждого пробельного промежутка
 * (начало следующего слова) и конец узла.
 */
const collectWordBreakOffsets = (text: string, from: number): number[] => {
  const offsets: number[] = [];
  let i = from;
  while (i < text.length) {
    while (i < text.length && !isBreakChar(text[i])) i += 1;
    while (i < text.length && isBreakChar(text[i])) i += 1;
    offsets.push(i);
  }
  return offsets;
};

/**
 * Бинарный поиск по границам слов. Мягкий перенос не считается границей:
 * слово уходит на следующую страницу целиком. Если первое слово не влезает,
 * возвращаем `from` — разрыв перед ним.
 */
const findBreakOffset = (
  node: Text,
  from: number,
  limitBottom: number,
  range: Range
): number => {
  const text = node.data;
  if (from >= text.length) return from;

  const fits = (end: number): boolean =>
    rangeBottomAtOffset(range, node, end) <= limitBottom + FIT_EPSILON_PX;

  const wordOffsets = collectWordBreakOffsets(text, from);
  if (wordOffsets.length === 0) {
    return from;
  }

  let bestWord = from;
  let left = 0;
  let right = wordOffsets.length - 1;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const offset = wordOffsets[mid];
    if (fits(offset)) {
      bestWord = offset;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return bestWord;
};

const endOfWord = (text: string, from: number): number => {
  let i = from;
  while (i < text.length && !isBreakChar(text[i])) i += 1;
  return i > from ? i : Math.min(from + 1, text.length);
};

const isRangeEmpty = (
  start: PageStart,
  end: BreakPoint,
  container: HTMLElement
): boolean => {
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  applyBreakEnd(range, end, container);
  if (range.collapsed) return true;
  return range.toString().trim().length === 0;
};

const applyBreakEnd = (
  range: Range,
  end: BreakPoint,
  container: HTMLElement
): void => {
  if (end.kind === "text") {
    range.setEnd(end.node, end.offset);
    return;
  }
  if (end.kind === "before") {
    range.setEndBefore(end.node);
    return;
  }
  if (end.kind === "after") {
    range.setEndAfter(end.node);
    return;
  }
  range.setEnd(container, container.childNodes.length);
};

const nextStartAfterBreak = (
  container: HTMLElement,
  end: BreakPoint
): PageStart | null => {
  if (end.kind === "text") {
    return skipLeadingWhitespace(container, { node: end.node, offset: end.offset });
  }
  if (end.kind === "before") {
    const inside = firstTextNode(end.node);
    if (inside) return skipLeadingWhitespace(container, { node: inside, offset: 0 });
    const after = firstTextNodeAfter(container, end.node);
    return after ? { node: after, offset: 0 } : null;
  }
  if (end.kind === "after") {
    const after = firstTextNodeAfter(container, end.node);
    return after ? skipLeadingWhitespace(container, { node: after, offset: 0 }) : null;
  }
  return null;
};

const isBlockContinuation = (start: PageStart): boolean => {
  const block = closestElement(start.node, SPLITTABLE_TAGS);
  if (!block) return false;
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(start.node, start.offset);
  return range.toString().length > 0;
};

const pruneEmptyElements = (root: ParentNode): void => {
  const empty: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as Element | null;
  while (node) {
    if (!node.textContent && node.childElementCount === 0) {
      empty.push(node);
    }
    node = walker.nextNode() as Element | null;
  }
  empty.forEach((el) => el.remove());
};

const collectHeadersFromRoot = (
  root: ParentNode,
  pageNumber: number
): PaginationHeader[] => {
  const headers: PaginationHeader[] = [];
  root.querySelectorAll("h2, h3").forEach((el) => {
    const text = (el.textContent || "").replace(/\u00AD/g, "").trim();
    if (!text) return;
    headers.push({
      level: el.tagName === "H2" ? 2 : 3,
      text,
      page: pageNumber,
    });
  });
  return headers;
};

/**
 * Шаг 5. cloneContents() копирует срез дерева: браузер закрывает открытые
 * <b>/<i>/<a> на границе и заново открывает их в фрагменте следующей страницы.
 */
const serializePage = (
  container: HTMLElement,
  start: PageStart,
  end: BreakPoint,
  wrap: HTMLElement,
  collapseFirstMargin: boolean
): string | null => {
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  applyBreakEnd(range, end, container);
  if (range.collapsed) return null;

  const fragment = range.cloneContents();
  pruneEmptyElements(fragment);

  const continuation = isBlockContinuation(start);
  if (continuation) {
    const first = fragment.firstElementChild;
    if (first && SPLITTABLE_TAGS.has(first.tagName)) {
      first.classList.add("splitted");
    }
  }

  wrap.replaceChildren(fragment);

  // В непрерывном потоке margin-top первого блока этой страницы уже «прожит»
  // выше границы разрыва. В отдельной странице он появился бы сверху заново.
  if (collapseFirstMargin && !continuation) {
    const first = wrap.firstElementChild as HTMLElement | null;
    if (first) {
      first.style.marginTop = "0";
    }
  }

  const html = wrap.innerHTML;
  if (!html.trim()) {
    wrap.replaceChildren();
    return null;
  }

  return html;
};

/**
 * Пагинация одного HTML-куска. Синхронный генератор: по странице за yield,
 * без yieldToMainThread — паузу делает paginateText.
 */
const paginateHtmlChunk = function* (
  html: string,
  pageWidth: number,
  maxHeight: number,
  cssClasses?: string
): Generator<{ html: string; headers: PaginationHeader[] }> {
  const measureEl = createMeasureContainer(pageWidth, cssClasses);
  const serializeWrap = document.createElement("div");

  try {
    insertHtml(measureEl, html);

    // Форсируем один layout после вставки. Дальше только чтение Range.
    const containerRect = measureEl.getBoundingClientRect();
    void measureEl.offsetHeight;

    const first = firstTextNode(measureEl);
    if (!first) return;

    const measureRange = document.createRange();
    const walker = document.createTreeWalker(measureEl, NodeFilter.SHOW_TEXT);

    let pageStart: PageStart | null = { node: first, offset: 0 };
    let currentPageLimit = maxHeight;
    let limitBottom = containerRect.top + currentPageLimit;
    let committed = 0;

    const commitPage = (
      start: PageStart,
      end: BreakPoint
    ): {
      next: PageStart | null;
      page: { html: string; headers: PaginationHeader[] } | null;
    } => {
      const pageHtml = serializePage(
        measureEl,
        start,
        end,
        serializeWrap,
        committed > 0
      );
      let page: { html: string; headers: PaginationHeader[] } | null = null;
      if (pageHtml) {
        committed += 1;
        page = {
          html: pageHtml,
          headers: collectHeadersFromRoot(serializeWrap, committed),
        };
        serializeWrap.replaceChildren();
        currentPageLimit += maxHeight;
        limitBottom = containerRect.top + currentPageLimit;
      }

      const next = nextStartAfterBreak(measureEl, end);
      if (next && next.node === start.node && next.offset === start.offset) {
        if (next.offset < next.node.data.length) {
          return {
            next: skipLeadingWhitespace(measureEl, {
              node: next.node,
              offset: next.offset + 1,
            }),
            page,
          };
        }
        const after = firstTextNodeAfter(measureEl, next.node);
        return {
          next: after
            ? skipLeadingWhitespace(measureEl, { node: after, offset: 0 })
            : null,
          page,
        };
      }
      return { next, page };
    };

    let node: Text | null = first;
    walker.currentNode = first;

    const advanceTo = (next: PageStart | null): boolean => {
      pageStart = next;
      if (!next) return false;
      walker.currentNode = next.node;
      node = next.node;
      return true;
    };

    while (node && pageStart) {
      if (!node.data.length) {
        node = walker.nextNode() as Text | null;
        continue;
      }

      measureRange.selectNodeContents(node);
      const rect = measureRange.getBoundingClientRect();

      // Узел целиком помещается на текущую страницу — идём дальше.
      if (rect.bottom <= limitBottom + FIT_EPSILON_PX) {
        node = walker.nextNode() as Text | null;
        continue;
      }

      const heading = closestElement(node, UNSPLITTABLE_TAGS);

      if (heading) {
        const breakBefore: BreakPoint = { kind: "before", node: heading };
        const canMoveToNextPage = !isRangeEmpty(pageStart, breakBefore, measureEl);
        const end: BreakPoint = canMoveToNextPage
          ? breakBefore
          : { kind: "after", node: heading };
        const { next, page } = commitPage(pageStart, end);
        if (page) yield page;
        if (!advanceTo(next)) break;
        continue;
      }

      const from = node === pageStart.node ? pageStart.offset : 0;
      const breakOffset = findBreakOffset(node, from, limitBottom, measureRange);

      let end: BreakPoint;
      if (breakOffset <= from) {
        const breakBeforeNode: BreakPoint = { kind: "text", node, offset: from };
        if (isRangeEmpty(pageStart, breakBeforeNode, measureEl)) {
          // Страница пуста, а слово не влезает — берём его целиком, иначе цикл.
          end = { kind: "text", node, offset: endOfWord(node.data, from) };
        } else {
          end = breakBeforeNode;
        }
      } else {
        end = { kind: "text", node, offset: breakOffset };
      }

      const { next, page } = commitPage(pageStart, end);
      if (page) yield page;
      if (!advanceTo(next)) break;
    }

    if (pageStart) {
      const remainder = serializePage(
        measureEl,
        pageStart,
        { kind: "end", container: measureEl },
        serializeWrap,
        committed > 0
      );
      if (remainder) {
        committed += 1;
        yield {
          html: remainder,
          headers: collectHeadersFromRoot(serializeWrap, committed),
        };
        serializeWrap.replaceChildren();
      }
    }
  } finally {
    measureEl.remove();
  }
};

/**
 * HTML-строка → страницы. Длинный текст режется на куски ~N страниц
 * (срез перед `<p>` / `<blockquote>`). Последнюю страницу куска не фиксируем:
 * её HTML идёт в начало следующего, чтобы добрать высоту и не рвать текст
 * на стыке кусков.
 */
export const paginateText = async (
  html: string,
  container?: HTMLElement,
  cssClasses?: string,
  progressCb?: (progress: number) => void
): Promise<PaginationResult> => {
  const startTime = performance.now();
  const { width: pageWidth, height: pageHeight } = getPageSize(container);
  const maxHeight = measureMaxHeight(pageWidth, pageHeight, cssClasses);
  const charsPerChunk = estimateCharsForPages(
    pageWidth,
    pageHeight,
    cssClasses || "",
    PAGES_PER_CHUNK
  );
  const chunks = splitHtmlByCharBudget(html, charsPerChunk);

  if (chunks.length === 0) {
    progressCb?.(1);
    return { pages: [""], headers: [] };
  }

  await waitForFontsLoaded();

  const pages: string[] = [];
  const headers: PaginationHeader[] = [];
  let leftover = "";
  let pagesSinceYield = 0;
  let processedPages = 0;
  const estimatedPages = Math.max(chunks.length * PAGES_PER_CHUNK, 1);

  for (let i = 0; i < chunks.length; i++) {
    const isLastChunk = i === chunks.length - 1;
    const chunkPages: string[] = [];
    const chunkHeaders: PaginationHeader[] = [];

    for (const item of paginateHtmlChunk(
      leftover + chunks[i],
      pageWidth,
      maxHeight,
      cssClasses
    )) {
      chunkPages.push(item.html);
      chunkHeaders.push(...item.headers);
      pagesSinceYield += 1;
      processedPages += 1;
      if (pagesSinceYield >= MAX_PAGES_PER_YIELD) {
        await yieldToMainThread();
        pagesSinceYield = 0;
        progressCb?.(Math.min(1, processedPages / estimatedPages));
      }
    }

    leftover = "";

    if (!isLastChunk && chunkPages.length > 0) {
      leftover = chunkPages.pop() as string;
      const droppedPage = chunkPages.length + 1;
      for (let h = chunkHeaders.length - 1; h >= 0; h--) {
        if (chunkHeaders[h].page === droppedPage) {
          chunkHeaders.splice(h, 1);
        }
      }
    }

    const pageOffset = pages.length;
    pages.push(...chunkPages);
    for (const header of chunkHeaders) {
      headers.push({ ...header, page: header.page + pageOffset });
    }
  }

  progressCb?.(1);

  if (process.env.NODE_ENV === "development") {
    const elapsed = performance.now() - startTime;
    console.log(
      `Text pagination v2 completed in ${elapsed.toFixed(2)}ms, pages: ${pages.length}, chunks: ${chunks.length}`
    );
  }

  return {
    pages: pages.length > 0 ? pages : [""],
    headers,
  };
};
