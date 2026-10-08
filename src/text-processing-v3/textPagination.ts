/**
 * Пагинация HTML-текста колонками размером со страницу читалки.
 *
 * Кусок HTML вставляется в контейнер с column-width/высотой колонки, равными
 * контентной области страницы. Граница страницы — первая позиция, чей rect
 * уже в следующей колонке (TreeWalker + Range). Если разрыв внутри слова
 * или на мягком переносе, в конец страницы, в тот же тег, пишется «-».
 * Тег переноса берётся через Selection API.
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
const INLINE_BREAK_TAGS = new Set(["BR", "HR"]);
const KEEP_EMPTY_TAGS = new Set(["BR", "IMG", "HR", "WBR"]);

const SOFT_HYPHEN = "\u00AD";
const HYPHEN = "-";

const YIELD_AFTER_MS = 50;
const MIN_PAGE_HEIGHT_PX = 50;
const MAX_PAGES = 10000;

type PageStart = {
  node: Text;
  offset: number;
};

type BreakPoint =
  | { kind: "text"; node: Text; offset: number }
  | { kind: "before"; node: Node }
  | { kind: "after"; node: Node }
  | { kind: "end"; container: HTMLElement };

type ChunkPage = {
  html: string;
  headers: PaginationHeader[];
  hyphenTag: string | null;
};

type ColumnMetrics = {
  contentLeft: number;
  stride: number;
  columnAt: (range: Range, node: Text, offset: number) => number | null;
};

const yieldToMainThread = (): Promise<void> => {
  const scheduler = (
    window as Window & { scheduler?: { yield?: () => Promise<void> } }
  ).scheduler;
  if (scheduler?.yield) {
    return scheduler.yield();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const isSpace = (ch: string): boolean => /\s/.test(ch);

const isWordChar = (ch: string | null): boolean =>
  !!ch && ch !== SOFT_HYPHEN && !isSpace(ch);

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

/** Соседние текстовые узлы — части одного слова: <strong>П</strong>реславную. */
const nodesJoinAsWord = (prev: Text, next: Text): boolean => {
  if (!prev.data.length || !next.data.length) return false;
  if (isSpace(prev.data[prev.data.length - 1]) || prev.data[prev.data.length - 1] === SOFT_HYPHEN) {
    return false;
  }
  if (isSpace(next.data[0]) || next.data[0] === SOFT_HYPHEN) return false;

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

const getPageSize = (
  container?: HTMLElement
): { width: number; height: number } => {
  if (container) {
    return { width: container.clientWidth, height: container.clientHeight };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

const columnIndexOf = (
  range: Range,
  node: Text,
  offset: number,
  contentLeft: number,
  stride: number
): number | null => {
  if (offset < 0 || offset >= node.data.length || stride <= 0) return null;
  range.setStart(node, offset);
  range.setEnd(node, offset + 1);
  const rects = range.getClientRects();
  let box: DOMRect | null = null;
  for (let i = 0; i < rects.length; i += 1) {
    if (rects[i].width > 0 || rects[i].height > 0) {
      box = rects[i];
      break;
    }
  }
  if (!box) return null;
  const center = box.left + box.width / 2;
  const index = Math.floor((center - contentLeft) / stride);
  return index < 0 ? 0 : index;
};

/**
 * Контейнер той же ширины, высоты и текстовых стилей, что страница читалки.
 * Колонка равна контентной области: паддинг .text-page не должен съедать место.
 */
const createColumnContainer = (
  pageWidth: number,
  pageHeight: number,
  cssClasses?: string
): { element: HTMLElement; metrics: ColumnMetrics } => {
  const element = document.createElement("div");
  if (cssClasses) {
    element.className = cssClasses;
  }

  Object.assign(element.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${pageWidth}px`,
    height: `${pageHeight}px`,
    boxSizing: "border-box",
    overflow: "visible",
    pointerEvents: "none",
    columnGap: "0px",
    columnFill: "auto",
    widows: "1",
    orphans: "1",
  });
  element.style.setProperty("-webkit-column-gap", "0px");
  element.style.setProperty("-webkit-column-fill", "auto");

  document.body.appendChild(element);

  const style = window.getComputedStyle(element);
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const borderX =
    (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
  const borderY =
    (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  const contentWidth = Math.max(pageWidth - padX - borderX, 1);
  const contentHeight = Math.max(pageHeight - padY - borderY, MIN_PAGE_HEIGHT_PX);

  element.style.columnWidth = `${contentWidth}px`;
  element.style.setProperty("-webkit-column-width", `${contentWidth}px`);
  element.style.height = `${contentHeight + padY + borderY}px`;

  const rect = element.getBoundingClientRect();
  const laidOut = window.getComputedStyle(element);
  const usedColumn = parseFloat(laidOut.columnWidth);
  const stride = Number.isFinite(usedColumn) && usedColumn > 0 ? usedColumn : contentWidth;
  const contentLeft =
    rect.left +
    (parseFloat(laidOut.borderLeftWidth) || 0) +
    (parseFloat(laidOut.paddingLeft) || 0);

  const metrics: ColumnMetrics = {
    contentLeft,
    stride,
    columnAt: (range, node, offset) => {
      if (offset < 0 || offset >= node.data.length) return null;
      // Буква сразу после мягкого переноса: Range этой буквы часто попадает
      // в дефис на предыдущей строке. Если следующая буква уже в другой
      // колонке, разрыв был на мягком переносе, и эта буква уходит с ней.
      if (
        offset > 0 &&
        node.data[offset - 1] === SOFT_HYPHEN &&
        offset + 1 < node.data.length
      ) {
        const nextCh = node.data[offset + 1];
        if (!isSpace(nextCh) && nextCh !== SOFT_HYPHEN) {
          const beforeCol = columnIndexOf(
            range,
            node,
            offset - 2,
            contentLeft,
            stride
          );
          const nextCol = columnIndexOf(
            range,
            node,
            offset + 1,
            contentLeft,
            stride
          );
          if (beforeCol !== null && nextCol !== null && nextCol > beforeCol) {
            return nextCol;
          }
        }
      }
      return columnIndexOf(range, node, offset, contentLeft, stride);
    },
  };

  return { element, metrics };
};

const markUnsplittableHeadings = (root: ParentNode): void => {
  root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    heading.classList.add("no-break");
  });
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
      (boundary.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    if (following && !boundary.contains(node) && node.data.length > 0) {
      return node;
    }
    node = walker.nextNode() as Text | null;
  }
  return null;
};

/** Пробелы и мягкий перенос в начале страницы не показываем: дефис уже на предыдущей. */
const skipLeadingGap = (
  container: HTMLElement,
  start: PageStart
): PageStart | null => {
  let { node, offset } = start;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  walker.currentNode = node;

  while (node) {
    while (
      offset < node.data.length &&
      (isSpace(node.data[offset]) || node.data[offset] === SOFT_HYPHEN)
    ) {
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

const applyBreakEnd = (range: Range, end: BreakPoint, container: HTMLElement): void => {
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

const isRangeEmpty = (
  start: PageStart,
  end: BreakPoint,
  container: HTMLElement
): boolean => {
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  applyBreakEnd(range, end, container);
  if (range.collapsed) return true;
  return range.toString().replace(/\u00AD/g, "").trim().length === 0;
};

const nextStartAfterBreak = (
  container: HTMLElement,
  end: BreakPoint
): PageStart | null => {
  if (end.kind === "text") {
    return skipLeadingGap(container, { node: end.node, offset: end.offset });
  }
  if (end.kind === "before") {
    const inside = firstTextNode(end.node);
    if (inside) return skipLeadingGap(container, { node: inside, offset: 0 });
    const after = firstTextNodeAfter(container, end.node);
    return after ? { node: after, offset: 0 } : null;
  }
  if (end.kind === "after") {
    const after = firstTextNodeAfter(container, end.node);
    return after ? skipLeadingGap(container, { node: after, offset: 0 }) : null;
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

const ensureContinuationBlock = (fragment: DocumentFragment, start: PageStart): void => {
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

/** Блок, часть которого есть на этой странице и который продолжается на следующей. */
const cutBlockAtEnd = (start: PageStart, end: BreakPoint): HTMLElement | null => {
  if (end.kind !== "text") return null;
  const block = closestElement(end.node, SPLITTABLE_TAGS);
  if (!block || !block.contains(end.node)) return null;

  const taken = document.createRange();
  if (block.contains(start.node)) {
    taken.setStart(start.node, start.offset);
  } else {
    const blockStart = firstTextNode(block);
    if (!blockStart) return null;
    taken.setStart(blockStart, 0);
  }
  taken.setEnd(end.node, end.offset);
  if (!taken.toString().replace(/[\s\u00AD]/g, "")) return null;

  const rest = document.createRange();
  rest.setStart(end.node, end.offset);
  rest.setEnd(block, block.childNodes.length);
  if (!rest.toString().replace(/[\s\u00AD]/g, "")) return null;
  return block;
};

/**
 * Последняя строка первой части разрезанного блока выравнивается по ширине.
 * cloneContents внутри одного текстового узла не возвращает сам тег — тогда
 * срез заворачивается в его копию. Узлы вне блока не заворачиваются.
 */
const justifyCutBlock = (
  fragment: DocumentFragment,
  block: HTMLElement,
  start: PageStart
): void => {
  const parts = fragment.querySelectorAll(block.tagName);
  let target = (parts[parts.length - 1] as HTMLElement | undefined) ?? null;
  if (!target) {
    if (!block.contains(start.node)) return;
    target = block.cloneNode(false) as HTMLElement;
    while (fragment.firstChild) target.appendChild(fragment.firstChild);
    fragment.appendChild(target);
  }
  target.classList.add("justify-last");
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

  const cutBlock = cutBlockAtEnd(start, end);
  if (cutBlock) {
    justifyCutBlock(fragment, cutBlock, start);
  }

  wrap.replaceChildren(fragment);

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

const charsAround = (
  container: HTMLElement,
  node: Text,
  offset: number
): { before: string | null; after: string | null; beforeNode: Text | null } => {
  let before: string | null = null;
  let beforeNode: Text | null = null;
  let after: string | null = null;

  if (offset > 0) {
    before = node.data[offset - 1];
    beforeNode = node;
  } else {
    const prev = adjacentTextInBlock(container, node, "prev");
    if (prev && nodesJoinAsWord(prev, node)) {
      before = prev.data[prev.data.length - 1];
      beforeNode = prev;
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

  return { before, after, beforeNode };
};

/**
 * Разрыв колонки внутри слова или на мягком переносе.
 * На пробеле, границе блока и внутри заголовка дефис не ставится.
 */
const needsColumnHyphen = (
  container: HTMLElement,
  node: Text,
  offset: number
): boolean => {
  if (closestElement(node, UNSPLITTABLE_TAGS)) return false;
  const { before, after, beforeNode } = charsAround(container, node, offset);
  if (!before || !after) return false;
  if (beforeNode && closestElement(beforeNode, UNSPLITTABLE_TAGS)) return false;
  if (before === SOFT_HYPHEN || after === SOFT_HYPHEN) return true;
  return isWordChar(before) && isWordChar(after);
};

/** Тег, внутрь которого попадёт дефис: конец страницы, не начало следующей. */
const hyphenAnchor = (
  container: HTMLElement,
  node: Text,
  offset: number
): { node: Text; offset: number } => {
  if (offset > 0) return { node, offset };
  const prev = adjacentTextInBlock(container, node, "prev");
  if (prev && nodesJoinAsWord(prev, node)) {
    return { node: prev, offset: prev.data.length };
  }
  return { node, offset: 0 };
};

const tagFromSelection = (node: Text, offset: number): string | null => {
  const parentTag = node.parentElement?.tagName ?? null;
  const sel = document.getSelection();
  if (!sel) return parentTag;

  const saved: Range[] = [];
  for (let i = 0; i < sel.rangeCount; i += 1) {
    saved.push(sel.getRangeAt(i).cloneRange());
  }
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const caret = Math.min(Math.max(offset, 0), node.data.length);
  const range = document.createRange();
  range.setStart(node, caret);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  const anchor = sel.anchorNode;
  const tag =
    anchor?.nodeType === Node.TEXT_NODE
      ? anchor.parentElement?.tagName ?? parentTag
      : anchor instanceof Element
        ? anchor.tagName
        : parentTag;

  sel.removeAllRanges();
  for (const item of saved) sel.addRange(item);
  if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
    window.scrollTo(scrollX, scrollY);
  }
  return tag;
};

/**
 * Колонка буквы. Пробел и мягкий перенос не смотрим: их rect часто оказывается
 * на границе следующей колонки, хотя следующая буква ещё в текущей.
 */
const glyphColumn = (
  node: Text,
  offset: number,
  range: Range,
  metrics: ColumnMetrics
): number | null => {
  let index = offset;
  while (
    index < node.data.length &&
    (isSpace(node.data[index]) || node.data[index] === SOFT_HYPHEN)
  ) {
    index += 1;
  }
  if (index >= node.data.length) return null;
  return metrics.columnAt(range, node, index);
};

const lastGlyphColumn = (
  node: Text,
  from: number,
  range: Range,
  metrics: ColumnMetrics
): number | null => {
  for (let index = node.data.length - 1; index >= from; index -= 1) {
    const ch = node.data[index];
    if (isSpace(ch) || ch === SOFT_HYPHEN) continue;
    return metrics.columnAt(range, node, index);
  }
  return null;
};

const firstOffsetPastColumn = (
  node: Text,
  from: number,
  column: number,
  range: Range,
  metrics: ColumnMetrics
): number | null => {
  const last = node.data.length - 1;
  if (from > last) return null;

  const tailCol = lastGlyphColumn(node, from, range, metrics);
  if (tailCol === null || tailCol <= column) return null;

  let lo = from;
  let hi = last;
  let found: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const col = glyphColumn(node, mid, range, metrics);
    if (col !== null && col > column) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return found;
};

const advanceOne = (container: HTMLElement, start: PageStart): PageStart | null => {
  if (start.offset < start.node.data.length) {
    return skipLeadingGap(container, {
      node: start.node,
      offset: start.offset + 1,
    });
  }
  const after = firstTextNodeAfter(container, start.node);
  return after ? skipLeadingGap(container, { node: after, offset: 0 }) : null;
};

const findColumnBreak = (
  container: HTMLElement,
  start: PageStart,
  metrics: ColumnMetrics,
  range: Range
): { end: BreakPoint; hyphenTag: string | null } => {
  const startCol = glyphColumn(start.node, start.offset, range, metrics) ?? 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  walker.currentNode = start.node;

  let node: Text | null = start.node;
  let from = start.offset;

  while (node) {
    if (!node.data.length) {
      node = walker.nextNode() as Text | null;
      from = 0;
      continue;
    }

    const breakOffset = firstOffsetPastColumn(node, from, startCol, range, metrics);
    if (breakOffset !== null) {
      return resolveBreak(container, start, node, breakOffset);
    }

    node = walker.nextNode() as Text | null;
    from = 0;
  }

  return { end: { kind: "end", container }, hyphenTag: null };
};

const resolveBreak = (
  container: HTMLElement,
  start: PageStart,
  node: Text,
  offset: number
): { end: BreakPoint; hyphenTag: string | null } => {
  const heading = closestElement(node, UNSPLITTABLE_TAGS);
  if (heading && offset > 0) {
    const beforeHeading: BreakPoint = { kind: "before", node: heading };
    if (!isRangeEmpty(start, beforeHeading, container)) {
      return { end: beforeHeading, hyphenTag: null };
    }
    return { end: { kind: "after", node: heading }, hyphenTag: null };
  }

  const end: BreakPoint = { kind: "text", node, offset };
  if (isRangeEmpty(start, end, container)) {
    return { end, hyphenTag: null };
  }
  if (!needsColumnHyphen(container, node, offset)) {
    return { end, hyphenTag: null };
  }

  const anchor = hyphenAnchor(container, node, offset);
  return { end, hyphenTag: tagFromSelection(anchor.node, anchor.offset) };
};

const samePoint = (start: PageStart, end: BreakPoint): boolean =>
  end.kind === "text" && end.node === start.node && end.offset === start.offset;

const paginateHtmlChunk = function* (
  html: string,
  pageWidth: number,
  pageHeight: number,
  cssClasses?: string,
  pageIndexOffset: number = 0
): Generator<ChunkPage> {
  const { element: measureEl, metrics } = createColumnContainer(
    pageWidth,
    pageHeight,
    cssClasses
  );
  const serializeWrap = document.createElement("div");
  const range = document.createRange();

  try {
    measureEl.innerHTML = html;
    markUnsplittableHeadings(measureEl);
    void measureEl.offsetHeight;

    const first = firstTextNode(measureEl);
    if (!first) return;

    let pageStart: PageStart | null = skipLeadingGap(measureEl, { node: first, offset: 0 });
    let committed = 0;
    let guard = 0;

    while (pageStart && guard < MAX_PAGES) {
      guard += 1;
      let { end, hyphenTag } = findColumnBreak(measureEl, pageStart, metrics, range);

      if (samePoint(pageStart, end) || isRangeEmpty(pageStart, end, measureEl)) {
        const heading = closestElement(pageStart.node, UNSPLITTABLE_TAGS);
        if (heading) {
          end = { kind: "after", node: heading };
          hyphenTag = null;
        } else {
          const forced = advanceOne(measureEl, pageStart);
          if (!forced) break;
          end = { kind: "text", node: forced.node, offset: forced.offset };
          hyphenTag = null;
        }
        if (isRangeEmpty(pageStart, end, measureEl)) {
          pageStart = nextStartAfterBreak(measureEl, end) ?? advanceOne(measureEl, pageStart);
          continue;
        }
      }

      const collapseFirstMargin = pageIndexOffset + committed > 0;
      const pageHtml = serializePage(
        measureEl,
        pageStart,
        end,
        serializeWrap,
        collapseFirstMargin
      );

      const next = nextStartAfterBreak(measureEl, end);
      if (pageHtml) {
        committed += 1;
        yield {
          html: pageHtml,
          headers: collectHeadersFromRoot(serializeWrap, committed),
          hyphenTag,
        };
        serializeWrap.replaceChildren();
      }

      if (next && pageStart && next.node === pageStart.node && next.offset === pageStart.offset) {
        pageStart = advanceOne(measureEl, pageStart);
      } else {
        pageStart = next;
      }
    }

    if (pageStart) {
      const remainder = serializePage(
        measureEl,
        pageStart,
        { kind: "end", container: measureEl },
        serializeWrap,
        pageIndexOffset + committed > 0
      );
      if (remainder) {
        committed += 1;
        yield {
          html: remainder,
          headers: collectHeadersFromRoot(serializeWrap, committed),
          hyphenTag: null,
        };
        serializeWrap.replaceChildren();
      }
    }
  } finally {
    measureEl.remove();
  }
};

/**
 * Дефис в последний текстовый узел страницы внутри тега, найденного Selection.
 * Хвостовой мягкий перенос заменяется на «-», а не остаётся рядом с ним.
 */
const applyColumnHyphen = (html: string, tagName: string): string => {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
  let fallback: Text | null = null;
  let tagged: Text | null = null;
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node.data.length > 0) {
      fallback = node;
      if (node.parentElement?.closest(tagName)) {
        tagged = node;
      }
    }
    node = walker.nextNode() as Text | null;
  }

  const target = tagged ?? fallback;
  if (!target) return html;

  const stripped = target.data.replace(new RegExp(`${SOFT_HYPHEN}+$`), "");
  target.data = stripped.endsWith(HYPHEN) ? stripped : `${stripped}${HYPHEN}`;
  return wrap.innerHTML;
};

export const paginateText = async (
  html: string,
  container?: HTMLElement,
  cssClasses?: string,
  progressCb?: (progress: number) => void
): Promise<PaginationResult> => {
  const startTime = performance.now();
  const { width: pageWidth, height: pageHeight } = getPageSize(container);
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
  let lastYieldAt = performance.now();
  // Доля по символам исходного HTML, а не по числу страниц: куски разной длины,
  // и оценка «страниц на кусок» то занижает, то завышает полосу.
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
  let consumedChars = 0;
  let reportedProgress = 0;
  const reportProgress = (ratio: number) => {
    const next = Math.min(1, Math.max(reportedProgress, ratio));
    if (next === reportedProgress) return;
    reportedProgress = next;
    progressCb?.(next);
  };

  for (let i = 0; i < chunks.length; i += 1) {
    const isLastChunk = i === chunks.length - 1;
    const chunkPages: ChunkPage[] = [];
    const pageIndexOffset = pages.length;
    const chunkChars = chunks[i].length;
    const chunkStart = consumedChars / totalChars;
    const chunkSpan = chunkChars / totalChars;
    const expectedPages = Math.max(1, chunkChars / Math.max(1, charsPerChunk / PAGES_PER_CHUNK));
    let pagesInChunk = 0;

    for (const item of paginateHtmlChunk(
      leftover + chunks[i],
      pageWidth,
      pageHeight,
      cssClasses,
      pageIndexOffset
    )) {
      chunkPages.push(item);
      pagesInChunk += 1;
      if (performance.now() - lastYieldAt >= YIELD_AFTER_MS) {
        await yieldToMainThread();
        lastYieldAt = performance.now();
        reportProgress(chunkStart + chunkSpan * Math.min(1, pagesInChunk / expectedPages));
      }
    }

    leftover = "";

    if (!isLastChunk && chunkPages.length > 0) {
      const dropped = chunkPages.pop() as ChunkPage;
      leftover = dropped.html;
    }

    consumedChars += chunkChars;
    reportProgress(consumedChars / totalChars);

    const pageOffset = pages.length;
    for (const page of chunkPages) {
      pages.push(page.hyphenTag ? applyColumnHyphen(page.html, page.hyphenTag) : page.html);
      for (const header of page.headers) {
        headers.push({ ...header, page: header.page + pageOffset });
      }
    }
  }

  progressCb?.(1);

  if (process.env.NODE_ENV === "development") {
    const elapsed = performance.now() - startTime;
    console.log(
      `Text pagination v3 completed in ${elapsed.toFixed(2)}ms, pages: ${pages.length}, chunks: ${chunks.length}`
    );
  }

  return {
    pages: pages.length > 0 ? pages : [""],
    headers,
  };
};
