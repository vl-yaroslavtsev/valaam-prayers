const PAGES_PER_CHUNK = 20;
const MIN_CONTENT_PX = 50;
const BLOCK_OPEN_RE_SOURCE = "<(p|blockquote)\\b";

const findNextBlockStart = (html: string, from: number): number => {
  const re = new RegExp(BLOCK_OPEN_RE_SOURCE, "gi");
  re.lastIndex = from;
  const match = re.exec(html);
  return match ? match.index : html.length;
};

/**
 * Сколько символов примерно влезает на `pageCount` страниц при текущей ширине,
 * высоте и шрифте контейнера читалки.
 */
export const estimateCharsForPages = (
  pageWidth: number,
  pageHeight: number,
  cssClasses: string,
  pageCount: number = PAGES_PER_CHUNK
): number => {
  const probe = document.createElement("div");
  probe.className = cssClasses;
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    left: "0",
    top: "0",
    width: `${pageWidth}px`,
    height: `${pageHeight}px`,
    boxSizing: "border-box",
    pointerEvents: "none",
  });
  probe.textContent = "о";
  document.body.appendChild(probe);

  const style = window.getComputedStyle(probe);
  const fontSize = parseFloat(style.fontSize) || 16;
  const computedLineHeight = parseFloat(style.lineHeight);
  const lineHeightPx = Number.isFinite(computedLineHeight)
    ? computedLineHeight
    : fontSize * 1.2;
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const borderY =
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0);
  const contentWidth = Math.max(pageWidth - padX, MIN_CONTENT_PX);
  const contentHeight = Math.max(pageHeight - padY - borderY, MIN_CONTENT_PX);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let avgCharWidth = fontSize * 0.5;
  if (ctx) {
    ctx.font = style.font;
    const sample = "оентинсаврклмпдь";
    avgCharWidth = ctx.measureText(sample).width / sample.length;
  }

  document.body.removeChild(probe);

  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidth / Math.max(avgCharWidth, 1))
  );
  const linesPerPage = Math.max(1, Math.floor(contentHeight / lineHeightPx));
  return charsPerLine * linesPerPage * pageCount;
};

/**
 * Режет HTML на куски ~pageCount страниц: прыжок на N символов, затем срез
 * перед следующим `<p>` или `<blockquote>`.
 */
export const splitHtmlByCharBudget = (
  html: string,
  charsPerChunk: number
): string[] => {
  if (html.length === 0) return [];
  if (charsPerChunk <= 0 || html.length <= charsPerChunk) return [html];

  const chunks: string[] = [];
  let start = 0;

  while (start < html.length) {
    const remaining = html.length - start;
    if (remaining <= charsPerChunk) {
      chunks.push(html.slice(start));
      break;
    }

    const cut = findNextBlockStart(html, start + charsPerChunk);
    if (cut <= start) {
      chunks.push(html.slice(start));
      break;
    }

    chunks.push(html.slice(start, cut));
    start = cut;
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
};

export { PAGES_PER_CHUNK };
