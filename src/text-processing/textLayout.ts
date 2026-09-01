/**
 * Построчная вёрстка блоков (h1..h6, p, blockquote) без обращения к реальному DOM.
 *
 * Разбирает HTML-фрагмент в дерево "блок -> раны" (текстовые куски с флагами
 * bold/italic/href), затем считает, на какие строки разобьётся каждый блок при
 * заданной ширине — через measureTextWidth (canvas), с ручной эмуляцией мягких
 * переносов (`\u00AD`, CSS `hyphens: manual`), которые canvas сам не обрабатывает.
 *
 * Строки хранятся не как готовый HTML, а как диапазоны символов [start, end) в
 * "плоском" тексте блока — реальный HTML для конкретного среза строк собирается
 * по требованию (см. sliceBlockHtml), чтобы не портить переносы/пробелы на стыках.
 */

import {
  type BlockFontMetrics,
  type FontMetricsByTag,
  type StyleKey,
  getStyleKey,
  measureTextWidth,
  SOFT_HYPHEN,
} from "./textMeasure";

export interface FlatSegment {
  text: string;
  boldTag: "b" | "strong" | null;
  italicTag: "i" | "em" | null;
  href: string | null;
  isBreak?: boolean;
}

export interface LineInfo {
  start: number;
  end: number;
  endsWithHyphen: boolean;
}

export interface LayoutBlock {
  tag: string; // 'H1'..'H6' | 'P' | 'BLOCKQUOTE'
  splittable: boolean;
  marginTop: number;
  marginBottom: number;
  lineHeight: number;
  segments: FlatSegment[];
  totalLength: number;
  lines: LineInfo[];
}

const BLOCK_TAG_SET = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE"]);
const NON_SPLITTABLE_TAG_SET = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

interface ExtractState {
  boldTag: "b" | "strong" | null;
  italicTag: "i" | "em" | null;
  href: string | null;
}

const extractSegments = (node: Node, state: ExtractState, out: FlatSegment[]): void => {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) {
        out.push({ text, boldTag: state.boldTag, italicTag: state.italicTag, href: state.href });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") {
        out.push({ text: "", boldTag: null, italicTag: null, href: null, isBreak: true });
      } else if (tag === "b" || tag === "strong") {
        extractSegments(el, { ...state, boldTag: tag }, out);
      } else if (tag === "i" || tag === "em") {
        extractSegments(el, { ...state, italicTag: tag }, out);
      } else if (tag === "a") {
        extractSegments(el, { ...state, href: el.getAttribute("href") || "" }, out);
      } else {
        // Неизвестный вложенный тег — не теряем текст, просто игнорируем обёртку
        extractSegments(el, state, out);
      }
    }
  });
};

/** Разбирает фрагмент HTML в список блоков верхнего уровня с их плоскими ранами */
export const parseBlocksFromFragment = (
  fragment: DocumentFragment
): Array<{ tag: string; segments: FlatSegment[]; splittable: boolean }> => {
  const blocks: Array<{ tag: string; segments: FlatSegment[]; splittable: boolean }> = [];
  fragment.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (!BLOCK_TAG_SET.has(tag)) return;
    const segments: FlatSegment[] = [];
    extractSegments(el, { boldTag: null, italicTag: null, href: null }, segments);
    blocks.push({ tag, segments, splittable: !NON_SPLITTABLE_TAG_SET.has(tag) });
  });
  return blocks;
};

// --- Токенизация: слова/пробелы/принудительные переносы строк (<br>) ---

interface WordPart {
  text: string;
  bold: boolean;
  italic: boolean;
}

interface WordToken {
  kind: "word";
  start: number;
  end: number;
  parts: WordPart[];
  hyphenOffsets: number[];
}

interface SpaceToken {
  kind: "space";
  start: number;
  end: number;
}

interface BreakToken {
  kind: "break";
  start: number;
  end: number;
}

type Token = WordToken | SpaceToken | BreakToken;

// Пробелы, кроме неразрывного \u00A0 (он не должен становиться точкой переноса)
const BREAKABLE_WS_SPLIT_RE = /([^\S\u00A0]+)/;
const BREAKABLE_WS_TEST_RE = /^[^\S\u00A0]+$/;

const tokenize = (segments: FlatSegment[]): { tokens: Token[]; totalLength: number } => {
  const tokens: Token[] = [];
  let offset = 0;
  let currentWord: WordToken | null = null;

  const flushWord = () => {
    if (currentWord) {
      tokens.push(currentWord);
      currentWord = null;
    }
  };

  segments.forEach((seg) => {
    if (seg.isBreak) {
      flushWord();
      tokens.push({ kind: "break", start: offset, end: offset });
      return;
    }

    const pieces = seg.text.split(BREAKABLE_WS_SPLIT_RE);
    pieces.forEach((piece) => {
      if (!piece) return;
      const start = offset;
      const end = offset + piece.length;
      offset = end;

      if (BREAKABLE_WS_TEST_RE.test(piece)) {
        flushWord();
        tokens.push({ kind: "space", start, end });
        return;
      }

      if (!currentWord) {
        currentWord = { kind: "word", start, end, parts: [], hyphenOffsets: [] };
      }
      currentWord.end = end;
      currentWord.parts.push({ text: piece, bold: !!seg.boldTag, italic: !!seg.italicTag });
      for (let k = 0; k < piece.length; k++) {
        if (piece[k] === SOFT_HYPHEN) currentWord.hyphenOffsets.push(start + k);
      }
    });
  });
  flushWord();

  return { tokens, totalLength: offset };
};

// --- Измерение слов с учётом мягких переносов ---

const fontFor = (fonts: Record<StyleKey, string>, bold: boolean, italic: boolean): string =>
  fonts[getStyleKey(bold, italic)];

const measurePartsWidth = (parts: WordPart[], fonts: Record<StyleKey, string>): number => {
  let width = 0;
  for (const part of parts) {
    const clean = part.text.indexOf(SOFT_HYPHEN) === -1 ? part.text : part.text.replace(/\u00AD/g, "");
    if (!clean) continue;
    width += measureTextWidth(clean, fontFor(fonts, part.bold, part.italic));
  }
  return width;
};

/** Ширина префикса слова (в исходных смещениях, мягкие переносы вырезаются) */
const measureWordPrefixWidth = (word: WordToken, uptoOffsetExclusive: number, fonts: Record<StyleKey, string>): number => {
  let width = 0;
  let pos = word.start;
  for (const part of word.parts) {
    const partStart = pos;
    const partEnd = pos + part.text.length;
    pos = partEnd;
    if (partStart >= uptoOffsetExclusive) break;
    const sliceEnd = Math.min(partEnd, uptoOffsetExclusive) - partStart;
    let sliceText = part.text.slice(0, Math.max(0, sliceEnd));
    sliceText = sliceText.indexOf(SOFT_HYPHEN) === -1 ? sliceText : sliceText.replace(/\u00AD/g, "");
    if (sliceText) {
      width += measureTextWidth(sliceText, fontFor(fonts, part.bold, part.italic));
    }
  }
  return width;
};

const fontAtOffset = (word: WordToken, offset: number, fonts: Record<StyleKey, string>): string => {
  let pos = word.start;
  for (const part of word.parts) {
    const partEnd = pos + part.text.length;
    if (offset < partEnd) return fontFor(fonts, part.bold, part.italic);
    pos = partEnd;
  }
  return fonts.normal;
};

/**
 * Ищет самую правую точку мягкого переноса внутри слова, такую что
 * "префикс + видимый дефис" укладывается в maxWidth. Возвращает смещение
 * символа \u00AD (не включая его) или null, если ни одна точка не подходит.
 */
const findHyphenBreak = (word: WordToken, maxWidth: number, fonts: Record<StyleKey, string>): number | null => {
  for (let i = word.hyphenOffsets.length - 1; i >= 0; i--) {
    const hyphenOffset = word.hyphenOffsets[i];
    if (hyphenOffset <= word.start) continue;
    const prefixWidth = measureWordPrefixWidth(word, hyphenOffset, fonts);
    const dashWidth = measureTextWidth("-", fontAtOffset(word, hyphenOffset - 1, fonts));
    if (prefixWidth + dashWidth <= maxWidth) {
      return hyphenOffset;
    }
  }
  return null;
};

/** Жёсткий посимвольный перенос — последнее средство, если слово не влезает даже целиком на пустой строке */
const findHardCharBreak = (word: WordToken, maxWidth: number, fonts: Record<StyleKey, string>): number => {
  let offset = word.start + 1;
  for (let pos = word.start + 1; pos <= word.end; pos++) {
    if (measureWordPrefixWidth(word, pos, fonts) > maxWidth) break;
    offset = pos;
  }
  return Math.max(offset, word.start + 1);
};

// Небольшой допуск только на погрешность округления float — при корректно
// загруженных шрифтах canvas.measureText совпадает с реальным рендером
// браузера почти до сотых пикселя (проверено вручную). Допуск в 1-2px (как
// было раньше) даёт обратный эффект: строка, которая в реальном браузере не
// влезает буквально на десятые доли пикселя, у нас "влезает" — из-за этого
// перенос по мягкому дефису сдвигается на строку раньше, чем в браузере, и
// расхождение накапливается дальше по абзацу (см. историю страницы 7 "Молитвы
// на сон грядущим" — итоговая строка-вдова "возстави").
const WRAP_TOLERANCE = 0.5;

const sliceWordFrom = (word: WordToken, fromOffset: number): WordToken => {
  const parts: WordPart[] = [];
  let pos = word.start;
  for (const part of word.parts) {
    const partStart = pos;
    const partEnd = pos + part.text.length;
    pos = partEnd;
    if (partEnd <= fromOffset) continue;
    const sliceStart = Math.max(0, fromOffset - partStart);
    const text = part.text.slice(sliceStart);
    if (text) parts.push({ text, bold: part.bold, italic: part.italic });
  }
  return {
    kind: "word",
    start: fromOffset,
    end: word.end,
    parts,
    hyphenOffsets: word.hyphenOffsets.filter((o) => o >= fromOffset),
  };
};

/**
 * Жадный word-wrap блока в строки. Возвращает список [start, end) диапазонов
 * символов (в "плоском" тексте блока) — без материализации HTML на этом шаге.
 */
export const layoutBlockLines = (
  segments: FlatSegment[],
  metrics: BlockFontMetrics,
  maxWidth: number
): { lines: LineInfo[]; totalLength: number } => {
  const { tokens, totalLength } = tokenize(segments);
  const fonts = metrics.fonts;
  const spaceWidth = measureTextWidth(" ", fonts.normal);

  const lines: LineInfo[] = [];
  let lineStart = 0;
  let lineEnd = 0;
  let lineWidth = 0;
  let hasContent = false;
  let spacePending = false;

  const resetLine = (newStart: number) => {
    lineStart = newStart;
    lineEnd = newStart;
    lineWidth = 0;
    hasContent = false;
    spacePending = false;
  };

  const commitLine = (end: number, endsWithHyphen: boolean, nextStart: number) => {
    lines.push({ start: lineStart, end, endsWithHyphen });
    resetLine(nextStart);
  };

  tokens.forEach((token) => {
    if (token.kind === "break") {
      commitLine(lineEnd, false, token.end);
      return;
    }
    if (token.kind === "space") {
      if (hasContent) spacePending = true;
      return;
    }

    let word: WordToken | null = token;
    let guard = 0;
    while (word) {
      guard++;
      if (guard > 10000) break; // защита от зацикливания на аномальных данных

      const extra = hasContent && spacePending ? spaceWidth : 0;
      const wordWidth = measurePartsWidth(word.parts, fonts);

      if (hasContent && lineWidth + extra + wordWidth > maxWidth + WRAP_TOLERANCE) {
        // Слово целиком не влезает на текущую (непустую) строку — пробуем
        // перенести его часть по мягкому переносу в оставшееся место (как
        // делает браузер с hyphens: manual), а не сразу уносить целиком
        const remaining = maxWidth + WRAP_TOLERANCE - lineWidth - extra;
        const hyphenOffset = word.hyphenOffsets.length > 0 ? findHyphenBreak(word, remaining, fonts) : null;
        if (hyphenOffset !== null && hyphenOffset > word.start) {
          lines.push({ start: lineStart, end: hyphenOffset, endsWithHyphen: true });
          resetLine(hyphenOffset + 1);
          word = sliceWordFrom(word, hyphenOffset + 1);
          continue;
        }

        commitLine(lineEnd, false, spacePending ? word.start : lineEnd);
        continue; // тот же word теперь обрабатывается как первое слово пустой строки
      }

      if (!hasContent && wordWidth > maxWidth + WRAP_TOLERANCE) {
        // Слово не влезает целиком даже на пустую строку
        const hyphenOffset = word.hyphenOffsets.length > 0 ? findHyphenBreak(word, maxWidth, fonts) : null;
        if (hyphenOffset !== null && hyphenOffset > word.start) {
          lines.push({ start: lineStart, end: hyphenOffset, endsWithHyphen: true });
          resetLine(hyphenOffset + 1);
          word = sliceWordFrom(word, hyphenOffset + 1);
          continue;
        }

        const hardBreak = findHardCharBreak(word, maxWidth, fonts);
        if (hardBreak > word.start && hardBreak < word.end) {
          lines.push({ start: lineStart, end: hardBreak, endsWithHyphen: false });
          resetLine(hardBreak);
          word = sliceWordFrom(word, hardBreak);
          continue;
        }
        // Ни перенос, ни жёсткий разрыв не помогли (очень узкая страница) —
        // размещаем слово целиком, чтобы не зациклиться
      }

      lineEnd = word.end;
      lineWidth += extra + wordWidth;
      hasContent = true;
      spacePending = false;
      word = null;
    }
  });

  if (hasContent || lines.length === 0) {
    lines.push({ start: lineStart, end: Math.max(lineEnd, lineStart), endsWithHyphen: false });
  }

  return { lines, totalLength };
};

/** Строит LayoutBlock (метрики + посчитанные строки) для одного блока верхнего уровня */
export const buildLayoutBlock = (
  block: { tag: string; segments: FlatSegment[]; splittable: boolean },
  metricsByTag: FontMetricsByTag,
  maxWidth: number
): LayoutBlock => {
  const metrics = metricsByTag[block.tag];
  const { lines, totalLength } = layoutBlockLines(block.segments, metrics, maxWidth);
  return {
    tag: block.tag,
    splittable: block.splittable,
    marginTop: metrics.marginTop,
    marginBottom: metrics.marginBottom,
    lineHeight: metrics.lineHeight,
    segments: block.segments,
    totalLength,
    lines,
  };
};

/**
 * Пересчитывает построчную разбивку остатка блока начиная с символа
 * fromOffset (используется, когда нужно "переразбить" хвост блока, не
 * трогая уже готовые строки до этой точки — см. avoidHyphenAtPageBreak
 * в textPagination.ts). Возвращает строки в тех же (абсолютных) координатах
 * плоского текста блока, что и block.lines.
 */
export const rewrapBlockLinesFrom = (
  block: LayoutBlock,
  fromOffset: number,
  metrics: BlockFontMetrics,
  maxWidth: number
): LineInfo[] => {
  const segments = sliceSegments(block.segments, fromOffset, block.totalLength);
  const { lines } = layoutBlockLines(segments, metrics, maxWidth);
  return lines.map((l) => ({ start: l.start + fromOffset, end: l.end + fromOffset, endsWithHyphen: l.endsWithHyphen }));
};

// --- Сборка HTML для диапазона строк блока ---

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (text: string): string => escapeHtml(text).replace(/"/g, "&quot;");

/** Вырезает сегменты блока в диапазоне [start, end) символов плоского текста */
const sliceSegments = (segments: FlatSegment[], start: number, end: number): FlatSegment[] => {
  const result: FlatSegment[] = [];
  let pos = 0;
  for (const seg of segments) {
    if (seg.isBreak) continue; // <br> внутри диапазона строк не переносим — переносы строк уже отражены в разбиении на lines
    const segStart = pos;
    const segEnd = pos + seg.text.length;
    pos = segEnd;
    if (segEnd <= start || segStart >= end) continue;
    const sliceStart = Math.max(start, segStart) - segStart;
    const sliceEnd = Math.min(end, segEnd) - segStart;
    const text = seg.text.slice(sliceStart, sliceEnd);
    if (text) result.push({ ...seg, text });
  }
  return result;
};

const segmentsToHtml = (segments: FlatSegment[]): string => {
  let html = "";
  for (const seg of segments) {
    let text = escapeHtml(seg.text);
    if (seg.boldTag) text = `<${seg.boldTag}>${text}</${seg.boldTag}>`;
    if (seg.italicTag) text = `<${seg.italicTag}>${text}</${seg.italicTag}>`;
    if (seg.href !== null) text = `<a href="${escapeAttr(seg.href)}">${text}</a>`;
    html += text;
  }
  return html;
};

/**
 * Собирает HTML блока (или его среза по строкам [fromLine, toLineExclusive)).
 * `isContinuation` добавляет класс "splitted" (для CSS-правила first-letter).
 */
export const sliceBlockHtml = (
  block: LayoutBlock,
  fromLine: number,
  toLineExclusive: number
): string => {
  const startOffset = block.lines[fromLine]?.start ?? 0;
  const lastLineIdx = toLineExclusive - 1;
  const lastLine = block.lines[lastLineIdx];
  const endOffset = lastLine ? lastLine.end : block.totalLength;

  const segments = sliceSegments(block.segments, startOffset, endOffset);
  let html = segmentsToHtml(segments);
  if (lastLine?.endsWithHyphen) html += "-";

  const tagName = block.tag.toLowerCase();
  const cls = fromLine > 0 ? ' class="splitted"' : "";
  return `<${tagName}${cls}>${html}</${tagName}>`;
};
