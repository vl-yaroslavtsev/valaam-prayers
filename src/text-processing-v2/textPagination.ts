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
// Теги, чей margin-top может быть обнулён при "collapseFirstMargin".
const FIRST_MARGIN_TOP_TAGS = new Set([
  ...UNSPLITTABLE_TAGS,
  ...SPLITTABLE_TAGS,
]);

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

const INLINE_BREAK_TAGS = new Set(["BR", "HR"]);

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

const adjacentTextInBlock = (
  container: HTMLElement,
  node: Text,
  direction: "prev" | "next"
): Text | null => {
  const block = closestElement(node, SPLITTABLE_TAGS);
  if (!block) return null;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  walker.currentNode = node;
  let n = (
    direction === "next" ? walker.nextNode() : walker.previousNode()
  ) as Text | null;
  while (n) {
    if (!block.contains(n)) return null;
    if (n.data.length > 0) return n;
    n = (
      direction === "next" ? walker.nextNode() : walker.previousNode()
    ) as Text | null;
  }
  return null;
};

/**
 * Два соседних текстовых узла — части одного слова: нет пробела на стыке
 * и нет <br> между ними. Типичный случай: <strong>П</strong>реславную.
 */
const nodesJoinAsWord = (prev: Text, next: Text): boolean => {
  if (isBreakChar(prev.data[prev.data.length - 1])) return false;
  if (isBreakChar(next.data[0])) return false;

  const range = document.createRange();
  range.setStart(prev, prev.data.length);
  range.setEnd(next, 0);
  if (range.toString().length > 0) return false;

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT
  );
  let el = walker.nextNode() as Element | null;
  while (el) {
    if (INLINE_BREAK_TAGS.has(el.tagName) && range.intersectsNode(el)) {
      return false;
    }
    el = walker.nextNode() as Element | null;
  }
  return true;
};

const startOfCurrentWord = (
  container: HTMLElement,
  node: Text,
  offset: number
): PageStart => {
  let n = node;
  let o = offset;
  while (true) {
    while (o > 0 && !isBreakChar(n.data[o - 1])) o -= 1;
    if (o > 0) return { node: n, offset: o };
    const prev = adjacentTextInBlock(container, n, "prev");
    if (!prev || !nodesJoinAsWord(prev, n)) {
      return { node: n, offset: 0 };
    }
    n = prev;
    o = prev.data.length;
  }
};

const endOfWordAcrossNodes = (
  container: HTMLElement,
  node: Text,
  from: number
): BreakPoint => {
  let n = node;
  let o = from;
  while (true) {
    while (o < n.data.length && !isBreakChar(n.data[o])) o += 1;
    if (o < n.data.length) {
      return { kind: "text", node: n, offset: o };
    }
    const next = adjacentTextInBlock(container, n, "next");
    if (!next || !nodesJoinAsWord(n, next)) {
      return { kind: "text", node: n, offset: n.data.length };
    }
    n = next;
    o = 0;
  }
};

const isWordChar = (ch: string | null): boolean =>
  ch !== null && !isBreakChar(ch);

/** Разрыв (node, offset) стоит внутри слова, в том числе на стыке узлов. */
const breakSplitsWord = (
  container: HTMLElement,
  node: Text,
  offset: number
): boolean => {
  let before: string | null = null;
  let after: string | null = null;
  if (offset > 0) {
    before = node.data[offset - 1];
  } else {
    const prev = adjacentTextInBlock(container, node, "prev");
    if (prev && nodesJoinAsWord(prev, node)) {
      before = prev.data[prev.data.length - 1];
    }
  }
  if (offset < node.data.length) {
    after = node.data[offset];
  } else {
    const next = adjacentTextInBlock(container, node, "next");
    if (next && nodesJoinAsWord(node, next)) {
      after = next.data[0];
    }
  }
  return isWordChar(before) && isWordChar(after);
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
  // clientHeight уже без бордеров: это padding+content, как у реальной .text-page.
  const contentHeight =
    probe.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  document.body.removeChild(probe);
  return Math.max(contentHeight, MIN_PAGE_HEIGHT_PX);
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

const SOFT_HYPHEN = "\u00AD";

const rangeBottomAtOffset = (range: Range, node: Text, endOffset: number): number => {
  // Пробел (и мягкий перенос) после слова, севшего впритык к правому краю,
  // даёт нулевой client rect и на следующей строке. Низ этого rect нельзя
  // считать «слово не влезло» — буквы слова остаются на текущей строке.
  let end = endOffset;
  while (
    end > 0 &&
    (isBreakChar(node.data[end - 1]) || node.data[end - 1] === SOFT_HYPHEN)
  ) {
    end -= 1;
  }
  if (end <= 0) {
    range.setStart(node, 0);
    range.collapse(true);
    return range.getBoundingClientRect().bottom;
  }
  range.setStart(node, end - 1);
  range.setEnd(node, end);
  const rects = range.getClientRects();
  if (rects.length === 0) {
    return range.getBoundingClientRect().bottom;
  }
  for (let i = rects.length - 1; i >= 0; i--) {
    if (rects[i].width > 0) return rects[i].bottom;
  }
  return rects[0].bottom;
};

/**
 * Точки разрыва по словам: после каждого пробельного промежутка
 * (начало следующего слова) и конец узла.
 * Мягкий перенос не считается границей: слово уходит на следующую
 * страницу целиком.
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
  range: Range,
  container: HTMLElement
): number => {
  const text = node.data;
  if (from >= text.length) return from;

  const fits = (end: number): boolean =>
    rangeBottomAtOffset(range, node, end) <= limitBottom + FIT_EPSILON_PX;

  const wordOffsets = collectWordBreakOffsets(text, from);
  // Конец узла — граница слова, только если следующее слово не продолжается
  // в соседнем узле (<strong>П</strong>реславную).
  if (
    wordOffsets.length > 0 &&
    wordOffsets[wordOffsets.length - 1] === text.length
  ) {
    const next = adjacentTextInBlock(container, node, "next");
    if (next && nodesJoinAsWord(node, next)) {
      wordOffsets.pop();
    }
  }
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

const snapBreakToWordBoundary = (
  container: HTMLElement,
  start: PageStart,
  end: BreakPoint
): BreakPoint => {
  if (end.kind !== "text") return end;
  if (!breakSplitsWord(container, end.node, end.offset)) return end;

  const wordStart = startOfCurrentWord(container, end.node, end.offset);
  const snapped: BreakPoint = {
    kind: "text",
    node: wordStart.node,
    offset: wordStart.offset,
  };
  if (!isRangeEmpty(start, snapped, container)) {
    return snapped;
  }
  return endOfWordAcrossNodes(container, end.node, end.offset);
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

// cloneContents может оставить пустые <strong>/<em>. Не трогаем void-теги:
// <br> имеет пустой textContent, но задаёт разрыв строки.
const KEEP_EMPTY_TAGS = new Set(["BR", "IMG", "HR", "WBR"]);

const pruneEmptyElements = (root: ParentNode): void => {
  const empty: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as Element | null;
  while (node) {
    if (
      !KEEP_EMPTY_TAGS.has(node.tagName) &&
      !node.textContent &&
      node.childElementCount === 0
    ) {
      empty.push(node);
    }
    node = walker.nextNode() as Element | null;
  }
  empty.forEach((el) => el.remove());
};

/** Continuation, целиком внутри текстового узла: cloneContents не создаёт <p>. */
const ensureContinuationBlock = (
  fragment: DocumentFragment,
  start: PageStart
): void => {
  const first = fragment.firstElementChild;
  if (first && SPLITTABLE_TAGS.has(first.tagName)) {
    first.classList.add("splitted");
    return;
  }
  const block = closestElement(start.node, SPLITTABLE_TAGS);
  if (!block) return;
  const wrapEl = block.cloneNode(false) as HTMLElement;
  wrapEl.classList.add("splitted");
  while (fragment.firstChild) wrapEl.appendChild(fragment.firstChild);
  fragment.appendChild(wrapEl);
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
    ensureContinuationBlock(fragment, start);
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
  cssClasses?: string,
  pageIndexOffset: number = 0
): Generator<{ html: string; headers: PaginationHeader[] }> {
  const measureEl = createMeasureContainer(pageWidth, cssClasses);
  const midLineProbe = createMeasureContainer(pageWidth, cssClasses);
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

    /**
     * Страницы сериализуются отдельно и рисуются с y=0, поэтому лимит нельзя
     * ставить сеткой n*maxHeight в непрерывном потоке: недобор на разрыве
     * (заголовок, граница слова) «перетекает» в следующую страницу и на
     * реальном боксе даёт вылезание за padding.
     * Первая страница: origin = верх контейнера, чтобы margin-top первого
     * блока вошёл в бюджет. Дальше collapseFirstMargin обнуляет его —
     * origin = верх первой строки этой страницы.
     */
    const pageOriginTop = (start: PageStart, isFirstPage: boolean): number => {
      if (isFirstPage) {
        return containerRect.top;
      }
      const { node, offset } = start;
      if (offset < node.data.length) {
        measureRange.setStart(node, offset);
        measureRange.setEnd(node, offset + 1);
        return measureRange.getBoundingClientRect().top;
      }
      measureRange.setStart(node, offset);
      measureRange.collapse(true);
      return measureRange.getBoundingClientRect().top;
    };

    /**
     * В непрерывном потоке слово, которое мы целиком унесли на следующую
     * страницу (мягкий перенос не граница), может всё ещё начинаться в хвосте
     * предыдущей строки. На реальной странице оно рисуется с левого края
     * колонки — на одну строку компактнее, чем measure.
     */
    const isStartMidLine = (start: PageStart): boolean => {
      const { node, offset } = start;
      if (offset >= node.data.length) return false;
      measureRange.setStart(node, offset);
      measureRange.setEnd(node, offset + 1);
      const charRect = measureRange.getBoundingClientRect();
      if (charRect.height === 0) return false;
      const block =
        closestElement(start.node, FIRST_MARGIN_TOP_TAGS) ?? node.parentElement;
      if (!block) return false;
      const cs = window.getComputedStyle(block);
      const contentLeft =
        block.getBoundingClientRect().left + (parseFloat(cs.paddingLeft) || 0);
      return charRect.left > contentLeft + 1;
    };

    const lineSpan = (rects: DOMRectList | DOMRect[]): number => {
      let top = Infinity;
      let bottom = -Infinity;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.height <= 0) continue;
        if (r.top < top) top = r.top;
        if (r.bottom > bottom) bottom = r.bottom;
      }
      return bottom > top ? bottom - top : 0;
    };

    /**
     * Mid-line старт на реальной странице переносится влево. Высоту считаем
     * по префиксу, который влезает в maxHeight в measure: полный хвост блока
     * даёт «+строка» даже когда внутри окна страницы каскад переносов
     * делает префикс выше, а не ниже.
     */
    const continuationReflowExtra = (start: PageStart): number => {
      if (!isStartMidLine(start)) return 0;
      const block = closestElement(start.node, SPLITTABLE_TAGS);
      if (!block) return 0;

      const { node, offset } = start;
      if (offset >= node.data.length) return 0;
      measureRange.setStart(node, offset);
      measureRange.setEnd(node, offset + 1);
      const originTop = measureRange.getBoundingClientRect().top;
      const trialLimit = originTop + maxHeight;
      const endOffset = findBreakOffset(
        node,
        offset,
        trialLimit,
        measureRange,
        measureEl
      );
      if (endOffset <= offset) return 0;

      measureRange.setStart(node, offset);
      measureRange.setEnd(node, endOffset);
      const fragment = measureRange.cloneContents();
      ensureContinuationBlock(fragment, start);
      midLineProbe.replaceChildren(fragment);
      void midLineProbe.offsetHeight;
      const probeRange = document.createRange();
      probeRange.selectNodeContents(midLineProbe);
      const probeH = lineSpan(probeRange.getClientRects());
      midLineProbe.replaceChildren();
      if (probeH <= 0) return 0;

      const extra = maxHeight - probeH;
      const lineHeight = parseFloat(getComputedStyle(block).lineHeight) || 26;
      if (Math.abs(extra) <= 1) return 0;
      if (extra > 0) return Math.min(extra, lineHeight + 1);
      return Math.max(extra, -lineHeight - 1);
    };

    const getLimitBottom = (start: PageStart, globalPageIndex: number): number => {
      const isFirstOverall = globalPageIndex === 0;
      const originTop = pageOriginTop(start, isFirstOverall);
      // serializePage обнуляет marginTop первого блока на не-первых страницах,
      // если старт не continuation. Origin уже верх первой строки, а не
      // край margin — прибавлять marginTop к лимиту нельзя: это даёт
      // вылезание примерно на величину отступа заголовка.
      if (!isFirstOverall && isBlockContinuation(start)) {
        return originTop + maxHeight + continuationReflowExtra(start);
      }
      return originTop + maxHeight;
    };

    let pageStart: PageStart | null = { node: first, offset: 0 };
    let committed = 0;
    let limitBottom = getLimitBottom(pageStart, pageIndexOffset + committed);

    const commitPage = (
      start: PageStart,
      end: BreakPoint
    ): {
      next: PageStart | null;
      page: { html: string; headers: PaginationHeader[] } | null;
    } => {
      const collapseFirstMargin = pageIndexOffset + committed > 0;
      const pageHtml = serializePage(
        measureEl,
        start,
        end,
        serializeWrap,
        collapseFirstMargin
      );
      let page: { html: string; headers: PaginationHeader[] } | null = null;
      if (pageHtml) {
        committed += 1;
        page = {
          html: pageHtml,
          headers: collectHeadersFromRoot(serializeWrap, committed),
        };
        serializeWrap.replaceChildren();
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
      limitBottom = getLimitBottom(next, pageIndexOffset + committed);
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
      const breakOffset = findBreakOffset(
        node,
        from,
        limitBottom,
        measureRange,
        measureEl
      );

      let end: BreakPoint;
      if (breakOffset <= from) {
        const breakBeforeNode: BreakPoint = { kind: "text", node, offset: from };
        if (isRangeEmpty(pageStart, breakBeforeNode, measureEl)) {
          // Страница пуста, а слово не влезает — берём его целиком, иначе цикл.
          end = endOfWordAcrossNodes(measureEl, node, from);
        } else {
          end = breakBeforeNode;
        }
      } else {
        end = { kind: "text", node, offset: breakOffset };
      }

      // Если страница закончилась заметно раньше limitBottom, можно
      // "дотянуть" конец: попробовать взять часть следующего фрагмента
      // (без доп. рендеров, только Range-измерения).
      if (end.kind === "text") {
        let attempts = 0;
        while (attempts < 4) {
          const endBottom = rangeBottomAtOffset(
            measureRange,
            end.node,
            end.offset
          );
          const gap = limitBottom - endBottom;
          if (gap <= 5) break;

          const nextStart = nextStartAfterBreak(measureEl, end);
          if (!nextStart) break;

          const nextHeading = closestElement(nextStart.node, UNSPLITTABLE_TAGS);
          if (nextHeading) break;

          const extOffset = findBreakOffset(
            nextStart.node,
            nextStart.offset,
            limitBottom,
            measureRange,
            measureEl
          );
          if (extOffset <= nextStart.offset) break;

          end = { kind: "text", node: nextStart.node, offset: extOffset };
          attempts += 1;
        }
      }

      end = snapBreakToWordBoundary(measureEl, pageStart, end);

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
    midLineProbe.remove();
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
  console.log('pageHeight', pageHeight);
  console.log('maxHeight', maxHeight);
  console.log('cssClasses', cssClasses);
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
    const pageIndexOffset = pages.length;

    for (const item of paginateHtmlChunk(
      leftover + chunks[i],
      pageWidth,
      maxHeight,
      cssClasses,
      pageIndexOffset
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
