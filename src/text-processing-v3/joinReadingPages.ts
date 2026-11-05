/**
 * Склейка уже посчитанных страниц в сплошной поток.
 *
 * Страница — срез колонки: абзац может быть разрезан, на разрыве стоит дефис.
 * В вертикальном режиме эти срезы стоят друг за другом без полей и линейки.
 * Продолжение абзаца (класс splitted) вливается в предыдущий блок, дефис
 * колонки снимается. Номер страницы остаётся на data-flow-page: у начала
 * блока — на самом блоке, у середины слова — на пустом span, чтобы не гасить
 * буквицу ::first-letter.
 */

export const FLOW_PAGE_ANCHOR_CLASS = "flow-page-anchor";
export const FLOW_CHUNK_TARGET_PAGES = 16;
export const FLOW_CHUNK_HARD_MAX_PAGES = 48;

export interface FlowChunkPlan {
  pageStart: number;
  pageEnd: number;
  headerStart: number;
  headerCount: number;
}

export interface JoinedReadingPages {
  html: string;
  headerCount: number;
}

const OPEN_TAG_RE = /^\s*<([a-z0-9]+)\b([^>]*)>/i;

const headerText = (element: Element): string =>
  (element.textContent || "").replace(/\u00AD/g, "").trim();

export const pageIsContinuation = (html: string): boolean => {
  const match = OPEN_TAG_RE.exec(html);
  if (!match) return false;
  return /\bsplitted\b/.test(match[2]);
};

export const countReadingHeaders = (html: string): number => {
  if (!/<h[23]\b/i.test(html)) return 0;
  const root = document.createElement("div");
  root.innerHTML = html;
  let count = 0;
  root.querySelectorAll("h2, h3").forEach((element) => {
    if (headerText(element)) count += 1;
  });
  return count;
};

/**
 * Куски виртуального списка. Граница куска — только между абзацами, пока кусок
 * не длиннее целевого. Разрезанный абзац не делится, пока не упрётся в предел:
 * иначе в потоке появится шов посередине фразы.
 */
export const planFlowChunks = (pages: readonly string[]): FlowChunkPlan[] => {
  const headerCounts = pages.map((html) => countReadingHeaders(html));
  const plans: FlowChunkPlan[] = [];
  let cursor = 0;
  let headerCursor = 0;

  while (cursor < pages.length) {
    let end = cursor + 1;
    while (end < pages.length && end - cursor < FLOW_CHUNK_HARD_MAX_PAGES) {
      const closesParagraph = !pageIsContinuation(pages[end]);
      if (closesParagraph && end - cursor >= FLOW_CHUNK_TARGET_PAGES) break;
      end += 1;
    }

    let headerCount = 0;
    for (let index = cursor; index < end; index += 1) {
      headerCount += headerCounts[index];
    }
    plans.push({
      pageStart: cursor,
      pageEnd: end,
      headerStart: headerCursor,
      headerCount,
    });
    headerCursor += headerCount;
    cursor = end;
  }

  return plans;
};

const firstElement = (root: ParentNode): HTMLElement | null => {
  for (const child of Array.from(root.childNodes)) {
    if (child instanceof HTMLElement) return child;
  }
  return null;
};

const lastText = (root: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node.data.length > 0) last = node;
    node = walker.nextNode() as Text | null;
  }
  return last;
};

const firstLetter = (root: Node): string | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    for (const ch of node.data) {
      if (ch === "\u00AD" || /\s/.test(ch)) continue;
      return ch;
    }
    node = walker.nextNode() as Text | null;
  }
  return null;
};

const WORD_JOINER = "\u2060";

/**
 * Снимает дефис, который пагинация дописала на границе колонки.
 * true — разрыв был внутри слова, пробел между частями не нужен.
 */
const stripColumnHyphen = (previous: Element, next: Node): boolean => {
  const nextChar = firstLetter(next);
  if (!nextChar || !/\p{L}/u.test(nextChar)) return false;
  const text = lastText(previous);
  if (!text) return false;
  const stripped = text.data.replace(/\u00AD+$/g, "");
  if (!/(?<=\p{L})-$/u.test(stripped)) return false;
  text.data = stripped.slice(0, -1);
  return true;
};

/** Пробел в начале следующей страницы пагинация не переносит. */
const ensureWordGap = (previous: Element, next: Node): void => {
  const prev = lastText(previous);
  const nextText = firstText(next);
  if (!prev || !nextText) return;
  prev.data = prev.data.replace(/\u00AD+$/g, "");
  if (/\s$/.test(prev.data) || /^\s/.test(nextText.data)) return;
  prev.data += " ";
};

const firstText = (root: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node.data.length > 0) return node;
    node = walker.nextNode() as Text | null;
  }
  return null;
};

const continuationAnchor = (pageIndex: number): HTMLSpanElement => {
  const anchor = document.createElement("span");
  anchor.className = FLOW_PAGE_ANCHOR_CLASS;
  anchor.dataset.flowPage = String(pageIndex);
  anchor.textContent = WORD_JOINER;
  return anchor;
};

export const joinReadingPages = (
  pages: readonly string[],
  startPageIndex: number,
  headerStart: number,
): JoinedReadingPages => {
  const root = document.createElement("div");

  pages.forEach((html, offset) => {
    const pageIndex = startPageIndex + offset;
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const first = firstElement(holder);
    const canMerge = !!first?.classList.contains("splitted") && !!root.lastElementChild;

    if (canMerge && first && root.lastElementChild) {
      const target = root.lastElementChild;
      const hyphenJoined = stripColumnHyphen(target, first);
      if (!hyphenJoined) ensureWordGap(target, first);
      target.classList.remove("justify-last");
      target.appendChild(continuationAnchor(pageIndex));
      while (first.firstChild) target.appendChild(first.firstChild);
      first.remove();
      while (holder.firstChild) root.appendChild(holder.firstChild);
      return;
    }

    if (first) {
      first.style.removeProperty("margin-top");
      if (!first.getAttribute("style")) first.removeAttribute("style");
      first.dataset.flowPage = String(pageIndex);
    } else {
      root.appendChild(continuationAnchor(pageIndex));
    }
    while (holder.firstChild) root.appendChild(holder.firstChild);
  });

  let headerCount = 0;
  root.querySelectorAll("h2, h3").forEach((element) => {
    if (!headerText(element)) return;
    element.setAttribute("data-header-index", String(headerStart + headerCount));
    headerCount += 1;
  });

  return { html: root.innerHTML, headerCount };
};
