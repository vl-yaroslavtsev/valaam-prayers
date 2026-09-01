/**
 * Модуль для разбиения HTML-текста на страницы как в читалке
 *
 * Поддерживает HTML-теги: h1..h6, p, a, blockquote, strong, em, b, i
 * Большие элементы (p, blockquote) могут разбиваться между страницами
 *
 * Перенос строк и подсчёт высоты блоков считается математически через
 * canvas measureText (без обращения к реальному DOM/layout) — см. textLayout.ts
 * и textMeasure.ts. Реальный DOM используется только (1) один раз, чтобы снять
 * getComputedStyle для отступов/шрифтов, и (2) один раз на страницу — чтобы
 * провалидировать и при необходимости чуть подправить границу (см.
 * validateAndCorrectPage), поскольку часть CSS-поведения (hyphens: manual,
 * схлопывание отступов, кернинг) не на 100% отделима от реального рендера.
 *
 * @example
 * ```typescript
 * import { paginateText } from '@/text-processing/textPagination';
 *
 * const htmlText = '<h2>Заголовок</h2><p>Длинный текст...</p>';
 * const container = document.querySelector('.reader-container');
 * const cssClasses = 'text-page reading-text prayer-text theme-grey';
 * const result = await paginateText(htmlText, container, cssClasses);
 *
 * result.pages.forEach((page, index) => {
 *   console.log(`Страница ${index + 1}:`, page);
 * });
 *
 * result.headers.forEach((header) => {
 *   console.log(`${header.tag}: ${header.text} на странице ${header.page + 1}`);
 * });
 * ```
 */

import { waitForFontsLoaded } from "@/js/utils";
import {
  collectFontMetrics,
  clearMeasureCache,
  stripSoftHyphens,
  type FontMetricsByTag,
} from "./textMeasure";
import {
  parseBlocksFromFragment,
  buildLayoutBlock,
  sliceBlockHtml,
  rewrapBlockLinesFrom,
  type LayoutBlock,
} from "./textLayout";

// Кэш для хранения вычисленных значений
interface PaginationCache {
  pageWidth: number;
  pageHeight: number;
  availableHeight: number;
  contentWidth: number;
  fontMetrics: FontMetricsByTag;
  cssClasses: string;
  containerKey: string;
}

const maxPagesPerYield = 10;

const paginationCache = new Map<string, PaginationCache>();

// Функция для создания ключа кэша
const createCacheKey = (
  container?: HTMLElement,
  cssClasses?: string
): string => {
  const containerKey = container
    ? `${container.clientWidth}x${container.clientHeight}`
    : `${window.innerWidth}x${window.innerHeight}`;
  return `${containerKey}_${cssClasses || "default"}`;
};

// Функция для создания временного элемента для измерения высоты
const createMeasureElement = (
  width: number,
  cssClasses?: string
): HTMLElement => {
  const element = document.createElement("div");
  if (cssClasses) {
    element.className = cssClasses;
  }

  // Оптимизированные стили для измерения
  Object.assign(element.style, {
    position: "absolute",
    visibility: "hidden",
    top: "-9999px",
    left: "0",
    width: `${width}px`,
    height: "auto",
    boxSizing: "border-box",
    overflow: "hidden",
    whiteSpace: "normal",
    contain: "layout style size", // Оптимизация для браузера
    willChange: "contents",
  });

  document.body.appendChild(element);
  return element;
};

// Функция для получения высоты страницы
const getPageHeight = (container?: HTMLElement): number => {
  if (container) {
    return container.clientHeight;
  }
  const paginatorContainer = document.querySelector(
    ".text-paginator"
  ) as HTMLElement;
  return paginatorContainer
    ? paginatorContainer.clientHeight
    : window.innerHeight;
};

const getPageWidth = (container?: HTMLElement): number => {
  if (container) {
    return Math.round(container.clientWidth);
  }
  const paginatorContainer = document.querySelector(
    ".text-paginator"
  ) as HTMLElement;
  return paginatorContainer
    ? Math.round(paginatorContainer.clientWidth)
    : Math.round(window.innerWidth);
};

// Функция для получения реальной доступной высоты с кэшированием
const getAvailableHeight = (
  container?: HTMLElement,
  cssClasses?: string,
  cache?: PaginationCache
): number => {
  if (cache && cache.availableHeight > 0) {
    return cache.availableHeight;
  }

  const containerHeight = getPageHeight(container);

  // Создаем временный элемент для измерения реальных отступов
  const testElement = document.createElement("div");
  if (cssClasses) {
    testElement.className = cssClasses;
  }

  Object.assign(testElement.style, {
    position: "absolute",
    visibility: "hidden",
    top: "-9999px",
    width: "100%",
    height: `${containerHeight}px`,
    boxSizing: "border-box",
    contain: "layout style",
  });

  testElement.innerHTML = "<p>Test content</p>";
  document.body.appendChild(testElement);

  // Получаем доступную высоту для контента
  const computedStyle = window.getComputedStyle(testElement);
  const paddingTop = parseFloat(computedStyle.paddingTop);
  const paddingBottom = parseFloat(computedStyle.paddingBottom);
  const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
  const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

  const availableHeight =
    containerHeight - paddingTop - paddingBottom - borderTop - borderBottom;

  document.body.removeChild(testElement);

  return Math.max(availableHeight, 100); // Минимум 100px
};

// Функция для разбора HTML и создания DOM-элементов
const parseHTML = (html: string): DocumentFragment => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
};

/**
 * Ждём загрузки шрифтов — важно как для canvas measureText (иначе он мерит
 * запасной системный шрифт), так и для финальной DOM-валидации страницы
 * @param measureEl
 */
const loadFonts = async (measureEl: HTMLElement) => {
  const div = document.createElement("div");
  div.innerHTML = `
  Обычный текст...
   <strong>
    Жирный текст...
  </strong>
   <strong>
    <em>Жирный косой текст...</em>
  </strong>
  <em>Это просто косой тест.</em>`;
  measureEl.appendChild(div);
  await waitForFontsLoaded();
  measureEl.removeChild(div);
};

/**
 * Функция для создания задержки и передачи управления основному потоку
 */
const yieldToMainThread = (): Promise<void> => {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
};

interface Header {
  level: number;
  text: string;
  page: number;
}

interface PaginationResult {
  pages: string[];
  headers: Header[];
}

/** Снимает ширину контента (без паддингов страницы) + шрифты/отступы блоков */
const buildCache = (
  pageWidth: number,
  pageHeight: number,
  container: HTMLElement | undefined,
  cssClasses: string | undefined,
  cacheKey: string
): PaginationCache => {
  const measureEl = createMeasureElement(pageWidth, cssClasses);

  const cs = window.getComputedStyle(measureEl);
  const paddingLeft = parseFloat(cs.paddingLeft) || 0;
  const paddingRight = parseFloat(cs.paddingRight) || 0;
  const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
  const borderRight = parseFloat(cs.borderRightWidth) || 0;
  const contentWidth = Math.max(
    pageWidth - paddingLeft - paddingRight - borderLeft - borderRight,
    50
  );

  const fontMetrics = collectFontMetrics(measureEl);
  document.body.removeChild(measureEl);
  clearMeasureCache();

  return {
    pageWidth,
    pageHeight,
    availableHeight: getAvailableHeight(container, cssClasses),
    contentWidth,
    fontMetrics,
    cssClasses: cssClasses || "",
    containerKey: cacheKey,
  };
};

// --- Линейный проход по блокам: подбор содержимого одной страницы ---

interface Placement {
  blockIndex: number;
  fromLine: number;
  toLineExclusive: number;
}

/**
 * Считает, что помещается на одну страницу, начиная с позиции
 * (startBlockIndex, startLineIndex), чисто математически (без DOM).
 * Отступы между соседними блоками схлопываются (max, а не сумма), как в CSS.
 */
// Пробел, по которому можно перенести строку (не \u00A0 — неразрывный пробел)
const BREAKABLE_SPACE_RE = /[^\S\u00A0]/;

const getBlockFlatText = (block: LayoutBlock): string => block.segments.map((s) => s.text).join("");

/**
 * Если разрыв страницы попал на строку, обрывающуюся мягким переносом (слово
 * разбито по слогам ровно на границе), убираем на следующую страницу только
 * само это слово, а не всю строку целиком — иначе слова перед ним на той же
 * строке без нужды теряют место на текущей странице. Ищем ближайший пробел
 * перед точкой переноса и переразбиваем остаток блока с начала слова (ширина
 * и шрифт от страницы не зависят, так что переразбивка детерминирована).
 * Возвращает true, если получилось обойтись без переноса всей строки.
 */
const avoidHyphenAtPageBreak = (
  placements: Placement[],
  blocks: LayoutBlock[],
  fontMetrics: FontMetricsByTag,
  contentWidth: number
): boolean => {
  if (placements.length === 0) return false;
  const last = placements[placements.length - 1];
  const block = blocks[last.blockIndex];
  if (!block.splittable) return false;

  const lineIdx = last.toLineExclusive - 1;
  const line = block.lines[lineIdx];
  if (!line?.endsWithHyphen) return true; // переноса и не было — трогать нечего

  const flatText = getBlockFlatText(block);
  let spacePos = -1;
  for (let i = line.end - 1; i >= line.start; i--) {
    if (BREAKABLE_SPACE_RE.test(flatText[i])) {
      spacePos = i;
      break;
    }
  }
  if (spacePos < 0) return false; // строка — одно слово целиком, откатывать на уровне слова некуда

  const wordStart = spacePos + 1;
  const metrics = fontMetrics[block.tag];
  const tailLines = rewrapBlockLinesFrom(block, wordStart, metrics, contentWidth);

  block.lines = [
    ...block.lines.slice(0, lineIdx),
    { start: line.start, end: spacePos, endsWithHyphen: false },
    ...tailLines,
  ];
  return true;
};

const buildOnePageMath = (
  blocks: LayoutBlock[],
  startBlockIndex: number,
  startLineIndex: number,
  availableHeight: number
): { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number } => {
  const placements: Placement[] = [];
  let currentHeight = 0;
  let pendingMarginBottom = 0;
  let blockIndex = startBlockIndex;
  let lineIndex = startLineIndex;

  while (blockIndex < blocks.length) {
    const block = blocks[blockIndex];

    if (!block.splittable) {
      const ownHeight = block.lines.length * block.lineHeight;
      const gap =
        placements.length === 0
          ? block.marginTop
          : Math.max(pendingMarginBottom, block.marginTop);

      if (placements.length > 0 && currentHeight + gap + ownHeight > availableHeight) {
        break; // переносим целиком на следующую страницу
      }

      currentHeight += gap + ownHeight;
      pendingMarginBottom = block.marginBottom;
      placements.push({ blockIndex, fromLine: 0, toLineExclusive: block.lines.length });
      blockIndex++;
      lineIndex = 0;
      continue;
    }

    // Сплиттуемый блок (p/blockquote) — построчно, отступ применяется один раз
    // на весь помещённый диапазон, а не на каждую строку
    const placementStart = lineIndex;
    const gapForPlacement =
      placements.length === 0
        ? block.marginTop
        : Math.max(pendingMarginBottom, block.marginTop);

    let linesFitted = 0;
    let heightIfFits = currentHeight;
    while (lineIndex < block.lines.length) {
      const extra = linesFitted === 0 ? gapForPlacement : 0;
      const candidateHeight = heightIfFits + extra + block.lineHeight;
      const isFirstLineOfEmptyPage = placements.length === 0 && linesFitted === 0;
      if (candidateHeight > availableHeight && !isFirstLineOfEmptyPage) {
        break;
      }
      heightIfFits = candidateHeight;
      linesFitted++;
      lineIndex++;
    }

    if (linesFitted > 0) {
      currentHeight = heightIfFits;
      const isBlockFinished = lineIndex >= block.lines.length;
      pendingMarginBottom = isBlockFinished ? block.marginBottom : 0;
      placements.push({ blockIndex, fromLine: placementStart, toLineExclusive: lineIndex });
    }

    if (lineIndex >= block.lines.length) {
      blockIndex++;
      lineIndex = 0;
      continue;
    }

    break; // блок не влез целиком — страница заполнена
  }

  return { placements, nextBlockIndex: blockIndex, nextLineIndex: lineIndex };
};

/**
 * Резервный вариант avoidHyphenAtPageBreak — когда перенести только слово
 * нельзя (оно одно занимает всю строку), откатываем строку(и) целиком, как
 * раньше. Работает поверх уже готового результата (после дожима), а не
 * внутри buildOnePageMath — иначе дожим, добавляя/убирая строки независимо
 * от переносов, мог заново поставить разрыв страницы на слово с переносом.
 */
const trimTrailingHyphenLines = (
  placements: Placement[],
  blocks: LayoutBlock[],
  blockIndex: number,
  lineIndex: number
): { blockIndex: number; lineIndex: number } => {
  while (
    placements.length > 0 &&
    placements[placements.length - 1].blockIndex === blockIndex &&
    blocks[blockIndex]?.lines[lineIndex - 1]?.endsWithHyphen
  ) {
    const last = placements[placements.length - 1];
    const lastPlacementLines = last.toLineExclusive - last.fromLine;
    const canTrim = lastPlacementLines > 1 || placements.length > 1;
    if (!canTrim) break;
    lineIndex -= 1;
    if (lastPlacementLines === 1) {
      placements.pop();
    } else {
      last.toLineExclusive -= 1;
    }
  }
  return { blockIndex, lineIndex };
};

/**
 * Финальная проверка на перенос слова по границе страницы — вызывается один
 * раз на уже полностью готовый (после дожима) результат страницы, чтобы ни
 * математика, ни DOM-коррекция не оставили слово разбитым мягким переносом
 * ровно на стыке страниц.
 */
const finalizeHyphenAtPageBreak = (
  result: { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number },
  blocks: LayoutBlock[],
  fontMetrics: FontMetricsByTag,
  contentWidth: number
): { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number } => {
  const { placements } = result;
  if (placements.length === 0) return result;

  const last = placements[placements.length - 1];
  const block = blocks[last.blockIndex];
  const line = block.lines[last.toLineExclusive - 1];
  if (!line?.endsWithHyphen) return result;

  if (avoidHyphenAtPageBreak(placements, blocks, fontMetrics, contentWidth)) {
    return result; // содержимое строки подрезано на месте, границы страниц не меняются
  }

  const { blockIndex: hyphenBlockIndex, lineIndex: hyphenLineIndex } = trimTrailingHyphenLines(
    placements,
    blocks,
    result.nextBlockIndex,
    result.nextLineIndex
  );
  return { placements, nextBlockIndex: hyphenBlockIndex, nextLineIndex: hyphenLineIndex };
};

const placementsToHtml = (placements: Placement[], blocks: LayoutBlock[]): string =>
  placements
    .map((p) => sliceBlockHtml(blocks[p.blockIndex], p.fromLine, p.toLineExclusive))
    .join("");

const getBlockPlainText = (block: LayoutBlock): string =>
  block.segments.map((s) => s.text).join("");

const removeLastLine = (
  placements: Placement[],
  blocks: LayoutBlock[]
): { placements: Placement[]; blockIndex: number; lineIndex: number } | null => {
  if (placements.length === 0) return null;
  const last = placements[placements.length - 1];
  const block = blocks[last.blockIndex];

  if (!block.splittable || last.toLineExclusive - last.fromLine <= 1) {
    return {
      placements: placements.slice(0, -1),
      blockIndex: last.blockIndex,
      lineIndex: last.fromLine,
    };
  }

  const trimmed: Placement = { ...last, toLineExclusive: last.toLineExclusive - 1 };
  return {
    placements: [...placements.slice(0, -1), trimmed],
    blockIndex: last.blockIndex,
    lineIndex: trimmed.toLineExclusive,
  };
};

/**
 * "Висячая строка" (вдова) — единственное слово на последней строке страницы,
 * оставшееся там только из-за разрыва по высоте (не конец абзаца). Дальше
 * слов на этой строке физически быть не может: строка выше уже заняла всю
 * ширину, иначе слово перенеслось бы туда — а не сюда — при построчной
 * раскладке. Единственный способ убрать "сироту" — перенести всю строку на
 * следующую страницу целиком.
 */
const avoidWidowLastLine = (
  result: { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number },
  blocks: LayoutBlock[]
): { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number } => {
  const { placements } = result;
  if (placements.length === 0) return result;

  const last = placements[placements.length - 1];
  const block = blocks[last.blockIndex];
  if (!block.splittable) return result;

  // Строка — собственный конец абзаца (не разрыв страницы): короткая
  // последняя строка абзаца — обычное дело, трогать не нужно.
  if (last.toLineExclusive >= block.lines.length) return result;

  // Единственная строка на всей странице — переносить её некуда.
  if (placements.length === 1 && last.toLineExclusive - last.fromLine <= 1) return result;

  const line = block.lines[last.toLineExclusive - 1];
  const lineText = getBlockFlatText(block).slice(line.start, line.end).trim();
  if (!lineText || BREAKABLE_SPACE_RE.test(lineText)) return result; // не одно слово

  const rolledBack = removeLastLine(placements, blocks);
  if (!rolledBack) return result;

  return {
    placements: rolledBack.placements,
    nextBlockIndex: rolledBack.blockIndex,
    nextLineIndex: rolledBack.lineIndex,
  };
};

/** Ширина строки текста через реальный (не canvas) DOM-рендер — временно
 * добавляет элемент нужного тега в measureEl (уже стилизован под страницу,
 * см. createMeasureElement), меряет и убирает. */
const measureLineWidthDOM = (measureEl: HTMLElement, tag: string, text: string): number => {
  const el = document.createElement(tag.toLowerCase());
  el.style.whiteSpace = "nowrap";
  el.style.display = "inline-block";
  el.style.margin = "0";
  el.style.padding = "0";
  el.textContent = text;
  measureEl.appendChild(el);
  const width = el.getBoundingClientRect().width;
  measureEl.removeChild(el);
  return width;
};

const DOM_TOP_OFF_MAX_WORDS = 5;

/**
 * Финальная точечная докрутка: пробуем "дотянуть" последнюю строку страницы
 * словами из начала следующей строки того же блока — той, что иначе целиком
 * ушла бы на следующую страницу. Это защита от остаточных расхождений
 * canvas-модели с реальным рендером (после дожима по высоте и защиты от
 * вдовы): здесь единственный источник истины — сам DOM, а не canvas.measureText,
 * поэтому слово переносится только тогда, когда оно ФАКТИЧЕСКИ влезает в
 * ширину страницы у браузера. Не трогает перенос по мягкому дефису и не
 * переходит на другой блок (следующий блок может быть, например, заголовком).
 */
const domTopOffLastLine = (
  result: { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number },
  blocks: LayoutBlock[],
  measureEl: HTMLElement,
  fontMetrics: FontMetricsByTag,
  contentWidth: number
): void => {
  const { placements } = result;
  if (placements.length === 0) return;

  const last = placements[placements.length - 1];
  const block = blocks[last.blockIndex];
  if (!block.splittable) return;

  const flatText = getBlockFlatText(block);
  const lineIdx = last.toLineExclusive - 1;

  for (let i = 0; i < DOM_TOP_OFF_MAX_WORDS; i++) {
    if (lineIdx + 1 >= block.lines.length) break; // блок и так кончился на этой странице

    const currentLine = block.lines[lineIdx];
    if (currentLine.endsWithHyphen) break; // перенос по мягкому дефису — отдельная логика

    const nextLine = block.lines[lineIdx + 1];
    if (nextLine.start !== currentLine.end) break; // строки не смежные — не трогаем

    const nextLineText = flatText.slice(nextLine.start, nextLine.end);
    const spaceMatch = nextLineText.match(BREAKABLE_SPACE_RE);
    const wordEnd = spaceMatch && spaceMatch.index !== undefined ? nextLine.start + spaceMatch.index : nextLine.end;
    if (wordEnd <= nextLine.start) break;

    const candidateText = stripSoftHyphens(flatText.slice(currentLine.start, wordEnd));
    const width = measureLineWidthDOM(measureEl, block.tag, candidateText);
    if (width > contentWidth) break; // в реальном браузере правда не влезает

    const metrics = fontMetrics[block.tag];
    const tailLines = rewrapBlockLinesFrom(block, wordEnd, metrics, contentWidth);
    block.lines = [
      ...block.lines.slice(0, lineIdx),
      { start: currentLine.start, end: wordEnd, endsWithHyphen: false },
      ...tailLines,
    ];
    // last.toLineExclusive (= lineIdx + 1) по-прежнему указывает на эту же,
    // теперь более длинную строку — саму placement трогать не нужно.
  }
};

const addNextLine = (
  placements: Placement[],
  blocks: LayoutBlock[],
  blockIndex: number,
  lineIndex: number
): { placements: Placement[]; blockIndex: number; lineIndex: number } | null => {
  if (blockIndex >= blocks.length) return null;
  const block = blocks[blockIndex];

  if (!block.splittable) {
    if (lineIndex !== 0) return null;
    return {
      placements: [...placements, { blockIndex, fromLine: 0, toLineExclusive: block.lines.length }],
      blockIndex: blockIndex + 1,
      lineIndex: 0,
    };
  }

  if (lineIndex >= block.lines.length) return null;

  const last = placements[placements.length - 1];
  if (last && last.blockIndex === blockIndex && last.toLineExclusive === lineIndex) {
    const extended: Placement = { ...last, toLineExclusive: lineIndex + 1 };
    return {
      placements: [...placements.slice(0, -1), extended],
      blockIndex,
      lineIndex: lineIndex + 1,
    };
  }

  return {
    placements: [...placements, { blockIndex, fromLine: lineIndex, toLineExclusive: lineIndex + 1 }],
    blockIndex,
    lineIndex: lineIndex + 1,
  };
};

const DOJIM_EPSILON = 1;
const DOJIM_MAX_ATTEMPTS = 8;
// Математический расчёт систематически чуть переоценивает вместимость страницы
// (canvas.measureText не на 100% совпадает с реальным рендером браузера).
// Небольшой запас снижает число случаев, когда "дожим" вынужден откатывать
// строки назад (дорогая операция — полный ре-рендер страницы), сдвигая
// коррекцию в сторону дешёвого добавления недостающих строк.
const MATH_SAFETY_MARGIN = 0; // 30px - запас для случаев, когда строки не влезают на страницу

/**
 * Дожим: рендерит посчитанную математически страницу в реальный (скрытый)
 * measureEl один раз и по необходимости подправляет границу на ±несколько
 * строк — это ловит расхождения из-за hyphens: manual, схлопывания отступов
 * и т.п., оставаясь на порядки дешевле старого DOM-based алгоритма.
 */
const validateAndCorrectPage = (
  initialPlacements: Placement[],
  blocks: LayoutBlock[],
  measureEl: HTMLElement,
  availableHeight: number,
  nextBlockIndex: number,
  nextLineIndex: number,
  chromeOffset: number,
  fontMetrics: FontMetricsByTag,
  contentWidth: number
): { placements: Placement[]; nextBlockIndex: number; nextLineIndex: number } => {
  let placements = initialPlacements;
  let curNextBlock = nextBlockIndex;
  let curNextLine = nextLineIndex;

  //return { placements, nextBlockIndex: curNextBlock, nextLineIndex: curNextLine };

  // measureEl.scrollHeight включает паддинги/бордер страницы (chromeOffset),
  // а availableHeight — это высота именно под контент (без них). Вычитаем
  // chromeOffset, чтобы сравнивать высоты в одних и тех же единицах —
  // иначе дожим считал страницу "полной" на chromeOffset раньше времени
  // и системно недозаполнял каждую страницу.
  const render = (p: Placement[]): number => {
    measureEl.innerHTML = placementsToHtml(p, blocks);
    return measureEl.scrollHeight - chromeOffset;
  };

  let height = render(placements);
  let attempts = 0;

  // Быстрая пакетная коррекция: по величине переполнения и высоте строки
  // последнего блока сразу оцениваем, сколько строк лишние, и убираем их
  // без промежуточных ре-рендеров — вместо процесса "минус одна строка —
  // ре-рендер — проверка" за один лишний рендер закрываем большую часть разрыва.
  if (height > availableHeight + DOJIM_EPSILON && placements.length > 0) {
    const lastPlacement = placements[placements.length - 1];
    const lastLineHeight = blocks[lastPlacement.blockIndex]?.lineHeight || 24;
    const overflow = height - availableHeight;
    const batchCount = Math.min(Math.ceil(overflow / lastLineHeight), placements.length * 50);
    for (let i = 0; i < batchCount; i++) {
      const result = removeLastLine(placements, blocks);
      if (!result) break;
      placements = result.placements;
      curNextBlock = result.blockIndex;
      curNextLine = result.lineIndex;
    }
    height = render(placements);
  }

  while (height > availableHeight + DOJIM_EPSILON && attempts < DOJIM_MAX_ATTEMPTS && placements.length > 0) {
    const result = removeLastLine(placements, blocks);
    if (!result) break;
    placements = result.placements;
    curNextBlock = result.blockIndex;
    curNextLine = result.lineIndex;
    height = render(placements);
    attempts++;
  }

  if (placements.length === 0 && initialPlacements.length > 0) {
    // Не потеряли прогресс — гарантированно размещаем хотя бы одну строку/блок
    const first = initialPlacements[0];
    const forced: Placement = {
      ...first,
      toLineExclusive: blocks[first.blockIndex].splittable
        ? Math.min(first.toLineExclusive, first.fromLine + 1)
        : first.toLineExclusive,
    };
    placements = [forced];
    curNextBlock = forced.blockIndex;
    curNextLine = forced.toLineExclusive;
    height = render(placements);
  }

  // Если после урезания страница обрывается на мягком переносе, снимаем его
  // ДО фазы добавления строк, а не после неё: рендер обрезанного ровно на
  // слоге HTML-фрагмента иногда заставляет браузер перенести всё слово
  // целиком (не через дефис), из-за чего он визуально съедает на одну
  // строку больше, чем предсказывает модель. Из-за этого добавление
  // следующей "логической" строки в цикле ниже ошибочно выглядит как
  // переполнение и отвергается, хотя на самом деле место ещё есть.
  // Переразбивка слова здесь убирает саму причину скачка ещё до измерений.
  if (placements.length > 0) {
    const last = placements[placements.length - 1];
    const block = blocks[last.blockIndex];
    if (block.splittable && block.lines[last.toLineExclusive - 1]?.endsWithHyphen) {
      if (avoidHyphenAtPageBreak(placements, blocks, fontMetrics, contentWidth)) {
        height = render(placements);
      }
    }
  }

  // Пакетное добавление: оцениваем по остатку места и высоте следующей строки,
  // сколько строк туда влезет, и пробуем добавить их все разом одним ре-рендером
  // вместо цикла "плюс одна строка — ре-рендер" на каждую.
  if (height < availableHeight - DOJIM_EPSILON) {
    const slack = availableHeight - height;
    const nextLineHeight = blocks[curNextBlock]?.lineHeight || 24;
    const batchAddCount = Math.floor(slack / nextLineHeight);
    if (batchAddCount > 1) {
      let batchPlacements = placements;
      let bBlock = curNextBlock;
      let bLine = curNextLine;
      let added = 0;
      for (let i = 0; i < batchAddCount; i++) {
        const probe = addNextLine(batchPlacements, blocks, bBlock, bLine);
        if (!probe) break;
        batchPlacements = probe.placements;
        bBlock = probe.blockIndex;
        bLine = probe.lineIndex;
        added++;
      }
      if (added > 0) {
        const batchHeight = render(batchPlacements);
        if (batchHeight <= availableHeight + DOJIM_EPSILON) {
          placements = batchPlacements;
          curNextBlock = bBlock;
          curNextLine = bLine;
          height = batchHeight;
        }
      }
    }
  }

  attempts = 0;
  while (attempts < DOJIM_MAX_ATTEMPTS) {
    const probe = addNextLine(placements, blocks, curNextBlock, curNextLine);
    if (!probe) break;
    const probeHeight = render(probe.placements);
    if (probeHeight > availableHeight + DOJIM_EPSILON) {
      break;
    }
    placements = probe.placements;
    curNextBlock = probe.blockIndex;
    curNextLine = probe.lineIndex;
    height = probeHeight;
    attempts++;
  }

  void height;
  return { placements, nextBlockIndex: curNextBlock, nextLineIndex: curNextLine };
};

/**
 * Основная функция для разбиения HTML-текста на страницы
 *
 * @param html - HTML-строка для разбиения на страницы
 * @param container - Контейнер для определения размера страницы (опционально)
 * @param cssClasses - CSS-классы для применения к страницам (опционально)
 * @returns Объект с массивом страниц и структурой содержания
 */
export const paginateText = async (
  html: string,
  container?: HTMLElement,
  cssClasses?: string,
  progressCb?: (progress: number) => void
): Promise<PaginationResult> => {
  const startTime = performance.now();

  // debugger;

  const cacheKey = createCacheKey(container, cssClasses);
  let cache = paginationCache.get(cacheKey);

  const pageWidth = getPageWidth(container);
  const pageHeight = getPageHeight(container);

  const pages: string[] = [];
  const headers: Header[] = [];
  const measureEl = createMeasureElement(pageWidth, cssClasses);

  // Шрифты нужно дождаться ДО сбора метрик (buildCache -> collectFontMetrics):
  // иначе canvas.measureText посчитает переносы строк по запасному системному
  // шрифту, а результат осядет в paginationCache и останется неверным до
  // ресайза контейнера — дожим ниже уже не успеет это исправить.
  await loadFonts(measureEl);

  if (!cache || cache.pageWidth !== pageWidth || cache.pageHeight !== pageHeight) {
    cache = buildCache(pageWidth, pageHeight, container, cssClasses, cacheKey);
    paginationCache.set(cacheKey, cache);
  }

  // measureEl рендерится с height:auto, поэтому его scrollHeight включает
  // паддинги/бордер страницы (в отличие от cache.availableHeight — высоты
  // только под контент). Разница нужна дожиму, чтобы сравнивать в одних
  // единицах — см. validateAndCorrectPage.
  const chromeOffset = pageHeight - cache.availableHeight;
  const availableHeight = cache.availableHeight;

  try {
    const fragment = parseHTML(html);
    const rawBlocks = parseBlocksFromFragment(fragment);
    const layoutBlocks: LayoutBlock[] = rawBlocks.map((b) =>
      buildLayoutBlock(b, cache!.fontMetrics, cache!.contentWidth)
    );

    const totalLineCount = layoutBlocks.reduce((sum, b) => sum + b.lines.length, 0) || 1;
    let linesConsumed = 0;

    let blockIndex = 0;
    let lineIndex = 0;
    let pagesSinceYield = 0;

    while (blockIndex < layoutBlocks.length) {
      const mathResult = buildOnePageMath(
        layoutBlocks,
        blockIndex,
        lineIndex,
        Math.max(availableHeight - MATH_SAFETY_MARGIN, 50)
      );
      const dojimResult = validateAndCorrectPage(
        mathResult.placements,
        layoutBlocks,
        measureEl,
        availableHeight,
        mathResult.nextBlockIndex,
        mathResult.nextLineIndex,
        chromeOffset,
        cache!.fontMetrics,
        cache!.contentWidth
      );
      const hyphenFixed = finalizeHyphenAtPageBreak(
        dojimResult,
        layoutBlocks,
        cache!.fontMetrics,
        cache!.contentWidth
      );
      const corrected = avoidWidowLastLine(hyphenFixed, layoutBlocks);
      domTopOffLastLine(corrected, layoutBlocks, measureEl, cache!.fontMetrics, cache!.contentWidth);

      pages.push(placementsToHtml(corrected.placements, layoutBlocks));

      corrected.placements.forEach((p) => {
        const block = layoutBlocks[p.blockIndex];
        if (block.tag === "H2" || block.tag === "H3") {
          const headerText = stripSoftHyphens(getBlockPlainText(block)).trim();
          if (headerText) {
            headers.push({ level: block.tag === "H2" ? 2 : 3, text: headerText, page: pages.length });
          }
        }
        linesConsumed += p.toLineExclusive - p.fromLine;
      });

      blockIndex = corrected.nextBlockIndex;
      lineIndex = corrected.nextLineIndex;

      pagesSinceYield++;
      if (pagesSinceYield >= maxPagesPerYield) {
        await yieldToMainThread();
        pagesSinceYield = 0;
        progressCb?.(Math.min(1, linesConsumed / totalLineCount));
        if (process.env.NODE_ENV === "development") {
          console.log(`Processed ${pages.length} pages, yielding to main thread`);
        }
      }
    }

    progressCb?.(1);
  } finally {
    document.body.removeChild(measureEl);
  }

  const endTime = performance.now();
  if (process.env.NODE_ENV === "development") {
    console.log(
      `Text pagination completed in ${(endTime - startTime).toFixed(2)}ms, pages: ${pages.length}`
    );
  }

  return {
    pages: pages.length > 0 ? pages : [""],
    headers,
  };
};

/**
 * Очищает кэш пагинации
 */
export const clearPaginationCache = (): void => {
  paginationCache.clear();
  clearMeasureCache();
};

/**
 * Инициализирует автоматическую очистку кэша при изменении размеров окна
 */
export const initPaginationCacheAutoCleanup = (): (() => void) => {
  let timeoutId: number | null = null;

  const handleResize = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Дебаунс для избежания частых очисток кэша
    timeoutId = window.setTimeout(() => {
      clearPaginationCache();
    }, 300);
  };

  window.addEventListener("resize", handleResize);

  // Возвращаем функцию для очистки слушателя
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    window.removeEventListener("resize", handleResize);
  };
};

/**
 * Вычисляет оптимальный размер страницы для контейнера
 *
 * @param container - HTML-элемент контейнера
 * @returns Высота страницы в пикселях
 */
export const calculateOptimalPageSize = (container: HTMLElement): number => {
  return getAvailableHeight(container);
};

/**
 * Приблизительно оценивает количество страниц для данного HTML-текста
 *
 * @param html - HTML-строка для анализа
 * @param container - Контейнер для определения размера страницы (опционально)
 * @param cssClasses - CSS-классы для применения (опционально)
 * @returns Приблизительное количество страниц
 */
export const estimatePageCount = (
  html: string,
  container?: HTMLElement,
  cssClasses?: string
): number => {
  const cacheKey = createCacheKey(container, cssClasses);
  let cache = paginationCache.get(cacheKey);

  const pageWidth = getPageWidth(container);
  const pageHeight = getPageHeight(container);

  if (!cache || cache.pageWidth !== pageWidth || cache.pageHeight !== pageHeight) {
    cache = buildCache(pageWidth, pageHeight, container, cssClasses, cacheKey);
    paginationCache.set(cacheKey, cache);
  }

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  Object.assign(tempDiv.style, {
    position: "absolute",
    visibility: "hidden",
    width: "100%",
    boxSizing: "border-box",
    contain: "layout style",
  });

  if (cssClasses) {
    tempDiv.className = cssClasses;
  }

  document.body.appendChild(tempDiv);
  const totalHeight = tempDiv.scrollHeight;
  document.body.removeChild(tempDiv);

  return Math.ceil(totalHeight / cache.availableHeight);
};
