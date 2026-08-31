/**
 * Измерение текста через canvas вместо реального DOM (без layout/reflow).
 *
 * Идея: ширина текста меряется через CanvasRenderingContext2D.measureText с тем же
 * font-family/size/weight/style, что и в реальном CSS (снимается один раз через
 * getComputedStyle). Кэш ширин амортизирует повторяющиеся слова.
 */

export type StyleKey = "normal" | "bold" | "italic" | "boldItalic";

export interface BlockFontMetrics {
  marginTop: number;
  marginBottom: number;
  lineHeight: number;
  fonts: Record<StyleKey, string>;
}

export type FontMetricsByTag = Record<string, BlockFontMetrics>;

// Блочные теги, для которых снимаются отступы/line-height/шрифты
export const BLOCK_TAGS = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE"] as const;

export const SOFT_HYPHEN = "\u00AD";

export function getStyleKey(bold: boolean, italic: boolean): StyleKey {
  if (bold && italic) return "boldItalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

export function stripSoftHyphens(text: string): string {
  return text.indexOf(SOFT_HYPHEN) === -1 ? text : text.replace(/\u00AD/g, "");
}

let canvasEl: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;

const getCtx = (): CanvasRenderingContext2D => {
  if (!canvasCtx) {
    canvasEl = document.createElement("canvas");
    const ctx = canvasEl.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context недоступен — измерение текста невозможно");
    }
    canvasCtx = ctx;
  }
  return canvasCtx;
};

let widthCache = new Map<string, number>();
let lastFontSet = "";

/**
 * Ширина строки с заданным canvas font-строкой. Кэшируется по (font, text) —
 * церковные тексты сильно повторяются, кэш почти всегда даёт O(1) после прогрева.
 */
export const measureTextWidth = (text: string, font: string): number => {
  if (!text) return 0;
  const key = font + "\u0000" + text;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;

  const ctx = getCtx();
  if (font !== lastFontSet) {
    ctx.font = font;
    lastFontSet = font;
  }
  const width = ctx.measureText(text).width;
  widthCache.set(key, width);
  return width;
};

/** Очищает кэш измеренных ширин (например, при смене шрифта/кегля пагинации) */
export const clearMeasureCache = (): void => {
  widthCache = new Map<string, number>();
  lastFontSet = "";
};

const buildFontString = (cs: CSSStyleDeclaration): string => {
  const style = cs.fontStyle && cs.fontStyle !== "normal" ? cs.fontStyle : "normal";
  const weight = cs.fontWeight || "400";
  const size = cs.fontSize || "16px";
  const family = cs.fontFamily || "sans-serif";
  return `${style} ${weight} ${size} ${family}`;
};

/**
 * Снимает отступы/line-height/шрифты (normal/bold/italic/bold+italic) для тегов
 * h1..h6, p, blockquote через getComputedStyle на реально вложенных скрытых
 * элементах внутри measureEl. Делается один раз при построении кэша пагинации.
 */
export const collectFontMetrics = (measureEl: HTMLElement): FontMetricsByTag => {
  const container = document.createElement("div");
  const refs: Record<string, { normal: HTMLElement; bold: HTMLElement; italic: HTMLElement; boldItalic: HTMLElement }> = {};

  BLOCK_TAGS.forEach((tag) => {
    const el = document.createElement(tag);
    const b = document.createElement("b");
    const i = document.createElement("i");
    const bi = document.createElement("b");
    const biInner = document.createElement("i");
    bi.appendChild(biInner);
    // Текстовое содержимое не нужно для getComputedStyle, но некоторые браузеры
    // аккуратнее считают line-height у непустых элементов
    el.appendChild(document.createTextNode("A"));
    b.appendChild(document.createTextNode("A"));
    i.appendChild(document.createTextNode("A"));
    biInner.appendChild(document.createTextNode("A"));
    el.appendChild(b);
    el.appendChild(i);
    el.appendChild(bi);
    container.appendChild(el);
    refs[tag] = { normal: el, bold: b, italic: i, boldItalic: biInner };
  });

  measureEl.appendChild(container);

  const metrics: FontMetricsByTag = {};
  BLOCK_TAGS.forEach((tag) => {
    const { normal, bold, italic, boldItalic } = refs[tag];
    const csNormal = window.getComputedStyle(normal);
    const marginTop = parseFloat(csNormal.marginTop) || 0;
    const marginBottom = parseFloat(csNormal.marginBottom) || 0;
    const lineHeightRaw = parseFloat(csNormal.lineHeight);
    const fontSize = parseFloat(csNormal.fontSize) || 16;
    const lineHeight = Number.isFinite(lineHeightRaw) && lineHeightRaw > 0 ? lineHeightRaw : fontSize * 1.2;

    metrics[tag] = {
      marginTop,
      marginBottom,
      lineHeight,
      fonts: {
        normal: buildFontString(csNormal),
        bold: buildFontString(window.getComputedStyle(bold)),
        italic: buildFontString(window.getComputedStyle(italic)),
        boldItalic: buildFontString(window.getComputedStyle(boldItalic)),
      },
    };
  });

  measureEl.removeChild(container);
  return metrics;
};
