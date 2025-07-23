/**
 * Модуль для разбиения HTML-текста на страницы как в читалке
 *
 * Поддерживает HTML-теги: h2, h3, h4, h5, h6, p, a, blockquote, strong, em, b, i
 * Большие элементы (p, blockquote, strong, b, i, em) могут разбиваться между страницами
 *
 * @example
 * ```typescript
 * import { paginateText } from '@/text-processing/textPagination';
 *
 * const htmlText = '<h2>Заголовок</h2><p>Длинный текст...</p>';
 * const container = document.querySelector('.reader-container');
 * const cssClasses = 'text-page reading-text prayer-text theme-grey';
 * const pages = paginateText(htmlText, container, cssClasses);
 *
 * pages.forEach((page, index) => {
 *   console.log(`Страница ${index + 1}:`, page.content);
 * });
 * ```
 */

import {
  startsWithLetter,
  endsWithLetter,
  moveLastWordBetweenElements,
} from "./textUtils";

import { waitForFontsLoaded} from "@/js/utils";

// Кэш для хранения вычисленных значений
interface PaginationCache {
  pageWidth: number;
  pageHeight: number;
  availableHeight: number;
  styles: {
    [key: string]: {
      marginTop: number;
      marginBottom: number;
      lineHeight: number;
    };
  };
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

//Оптимизированная функция для получения реальной доступной высоты с кэшированием
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

// Оптимизированная функция для получения стилей с кэшированием
const getStyles = (
  measureEl: HTMLElement,
  cache?: PaginationCache
): {
  [key: string]: {
    marginTop: number;
    marginBottom: number;
    lineHeight: number;
  };
} => {
  if (cache && cache.styles) {
    return cache.styles;
  }

  const styles: {
    [key: string]: {
      marginTop: number;
      marginBottom: number;
      lineHeight: number;
    };
  } = {};
  const tags = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE"];

  // Батчевое создание элементов для измерения
  const fragment = document.createElement("div");
  const elements: { [key: string]: HTMLElement } = {};

  tags.forEach((tagName) => {
    const element = document.createElement(tagName);
    elements[tagName] = element;
    fragment.appendChild(element);
  });

  measureEl.appendChild(fragment);

  // Батчевое получение стилей
  tags.forEach((tagName) => {
    const element = elements[tagName];
    const computedStyle = window.getComputedStyle(element);
    styles[tagName] = {
      marginTop: parseFloat(computedStyle.marginTop || "0"),
      marginBottom: parseFloat(computedStyle.marginBottom || "0"),
      lineHeight: parseFloat(computedStyle.lineHeight || "0"),
    };
  });

  measureEl.removeChild(fragment);
  return styles;
};

// Функция для разбора HTML и создания DOM-элементов
const parseHTML = (html: string): DocumentFragment => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
};

// Функция для клонирования элемента с сохранением стилей
const cloneElement = (element: HTMLElement): HTMLElement => {
  return element.cloneNode(true) as HTMLElement;
};


/**
 * Ждем загрузки шрифтов
 * @param measureEl
 */
const loadFonts = async ( measureEl: HTMLElement ) => {
  // Быстрая проверка - поместится ли элемент целиком
  const div = document.createElement('div');
  div.innerHTML = `
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



// Оптимизированная функция для разбиения текстового узла
const splitTextNode = (
  textNode: Text,
  container: HTMLElement,
  maxHeight: number,
  measureEl: HTMLElement
): { fitted: Text | null; remaining: Text | null } => {
  const originalText = textNode.textContent || "";
  if (!originalText.trim()) {
    return { fitted: textNode, remaining: null };
  }

  // Сохраняем исходное содержимое контейнера
  const originalContent = container.innerHTML;
  // const originalScrollHeight = measureEl.scrollHeight;

  // Быстрая проверка - помещается ли весь текст
  const testNode = document.createTextNode(originalText);
  container.appendChild(testNode);
  const fullTextHeight = measureEl.scrollHeight;

  if (fullTextHeight <= maxHeight) {
    container.removeChild(testNode);
    container.innerHTML = originalContent;
    return { fitted: textNode, remaining: null };
  }

  container.removeChild(testNode);

  // Оптимизированный бинарный поиск с меньшим количеством DOM-операций
  let left = 0;
  let right = originalText.length;
  let bestFit = 0;
  let iterations = 0;
  const maxIterations = Math.min(
    20,
    Math.ceil(Math.log2(originalText.length)) + 5
  );

  let currentHeight = 0;
  let mid = 0;
  while (left <= right && iterations < maxIterations) {
    iterations++;
    mid = Math.floor((left + right) / 2);
    const testText = originalText.substring(0, mid);

    // Используем textContent вместо innerHTML для лучшей производительности
    const tempNode = document.createTextNode(testText);
    container.appendChild(tempNode);
    currentHeight = measureEl.scrollHeight;
    container.removeChild(tempNode);

    if (currentHeight <= maxHeight) {
      bestFit = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  while (currentHeight > maxHeight && mid > 0) {
    const testText = originalText.substring(0, --mid);
    // Используем textContent вместо innerHTML для лучшей производительности
    const tempNode = document.createTextNode(testText);
    container.appendChild(tempNode);
    currentHeight = measureEl.scrollHeight;
    container.removeChild(tempNode);
    // if (process.env.NODE_ENV === "development") {
    //   console.log("splitTextNode: fixHeight: currentHeight", currentHeight);
    // }
  }

  // Восстанавливаем исходное содержимое
  container.innerHTML = originalContent;

  if (bestFit === 0) {
    return { fitted: null, remaining: textNode };
  }

  if (bestFit === originalText.length) {
    return { fitted: textNode, remaining: null };
  }

  // Оптимизированное разбиение по словам
  const fittedText = originalText.substring(0, bestFit);
  const lastSpaceIndex = fittedText.lastIndexOf(" ");

  // && lastSpaceIndex > bestFit * 0.8
  if (lastSpaceIndex > 0 ) {
    // Разбиваем по последнему пробелу, если он не слишком далеко от оптимального места
    const splitIndex = lastSpaceIndex + 1;
    return {
      fitted: document.createTextNode(originalText.substring(0, splitIndex)),
      remaining: document.createTextNode(originalText.substring(splitIndex)),
    };
  }

  // Иначе разбиваем по символам
  return {
    fitted: document.createTextNode(originalText.substring(0, bestFit)),
    remaining: document.createTextNode(originalText.substring(bestFit)),
  };
};

// Оптимизированная функция для разбиения элемента между страницами
const splitElement = (
  element: HTMLElement,
  container: HTMLElement,
  maxHeight: number,
  measureEl: HTMLElement
): { fitted: HTMLElement | null; remaining: HTMLElement | null } => {
  const tagName = element.tagName.toLowerCase();

  // Заголовки и небольшие элементы не разбиваем
  const nonSplittableTags = ["h1", "h2", "h3", "h4", "h5", "h6", "a", "br"];
  const smallTags = ["strong", "em", "b", "i"];

  if (nonSplittableTags.includes(tagName)) {
    // Быстрая проверка без клонирования
    const originalHeight = measureEl.scrollHeight;
    container.appendChild(element);
    const newHeight = measureEl.scrollHeight;
    container.removeChild(element);

    return newHeight <= maxHeight
      ? { fitted: element, remaining: null }
      : { fitted: null, remaining: element };
  }

  // Для небольших элементов сначала пытаемся поместить целиком
  if (smallTags.includes(tagName)) {
    const originalHeight = measureEl.scrollHeight;
    container.appendChild(element);
    const newHeight = measureEl.scrollHeight;
    container.removeChild(element);

    if (newHeight <= maxHeight) {
      return { fitted: element, remaining: null };
    }
    // Если не помещается, продолжаем с разбиением
  }

  // Для остальных элементов пытаемся разбить содержимое
  const fittedElement = cloneElement(element);
  const remainingElement = cloneElement(element);

  remainingElement.classList.add("splitted");

  fittedElement.innerHTML = "";
  remainingElement.innerHTML = "";

  container.appendChild(fittedElement);

  let hasContent = false;
  let hasRemaining = false;

  // Оптимизированная обработка дочерних узлов
  const childNodes = Array.from(element.childNodes);

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      const textNode = child as Text;
      if (!textNode.textContent?.trim()) {
        fittedElement.appendChild(textNode.cloneNode(true));
        continue;
      }

      const { fitted, remaining } = splitTextNode(
        textNode,
        fittedElement,
        maxHeight,
        measureEl
      );

      if (fitted) {
        fittedElement.appendChild(fitted);
        hasContent = true;
      }

      if (remaining) {
        remainingElement.appendChild(remaining);
        hasRemaining = true;

        // Добавляем все оставшиеся элементы в remaining
        for (let j = i + 1; j < childNodes.length; j++) {
          remainingElement.appendChild(childNodes[j].cloneNode(true));
        }
        break;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as HTMLElement;
      const { fitted, remaining } = splitElement(
        childElement,
        fittedElement,
        maxHeight,
        measureEl
      );

      if (fitted) {
        fittedElement.appendChild(fitted);
        hasContent = true;
      }

      if (remaining) {
        // Оптимизированная проверка переноса слов
        const fittedText = fittedElement.textContent || "";
        const remainingText = remaining.textContent || "";

        if (
          fittedText &&
          remainingText &&
          endsWithLetter(fittedText) &&
          startsWithLetter(remainingText)
        ) {
          try {
            // debugger;
            moveLastWordBetweenElements(fittedElement, remaining);
          } catch (e) {
            if (process.env.NODE_ENV === "development") {
              console.warn("Failed to move word between elements:", e);
            }
          }
        }

        remainingElement.appendChild(remaining);
        hasRemaining = true;

        // Добавляем все оставшиеся элементы в remaining
        for (let j = i + 1; j < childNodes.length; j++) {
          remainingElement.appendChild(childNodes[j].cloneNode(true));
        }
        break;
      }
    }
  }

  // Если ничего не поместилось, но элемент небольшой, принудительно помещаем его
  if (!hasContent && !hasRemaining) {
    const originalHeight = measureEl.scrollHeight;
    container.appendChild(cloneElement(element));
    const elementHeight = measureEl.scrollHeight;
    container.removeChild(container.lastChild!);

    // * 1.2
    if (elementHeight <= maxHeight ) {
      // Позволяем превышение на 20%
      return { fitted: element, remaining: null };
    }
  }

  return {
    fitted: hasContent ? fittedElement : null,
    remaining: hasRemaining ? remainingElement : null,
  };
};

/**
 * Функция для создания задержки и передачи управления основному потоку
 */
const yieldToMainThread = (): Promise<void> => {
  return new Promise(resolve => {
    // setTimeout(resolve, 0);
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });

 
};

/**
 * Основная функция для разбиения HTML-текста на страницы
 *
 * @param html - HTML-строка для разбиения на страницы
 * @param container - Контейнер для определения размера страницы (опционально)
 * @param cssClasses - CSS-классы для применения к страницам (опционально)
 * @returns Массив слайдов с разбитым по страницам контентом
 */
export const paginateText = async (
  html: string,
  container?: HTMLElement,
  cssClasses?: string
): Promise<string[]> => {
  const startTime = performance.now();

  // Проверяем кэш
  const cacheKey = createCacheKey(container, cssClasses);
  console.log("paginateText: cacheKey", cacheKey);
  let cache = paginationCache.get(cacheKey);

  const pageWidth = getPageWidth(container);
  const pageHeight = getPageHeight(container);

  console.log("paginateText: pageWidth", pageWidth);
  console.log("paginateText: pageHeight", pageHeight);

  // Обновляем или создаем кэш
  if (
    !cache ||
    cache.pageWidth !== pageWidth ||
    cache.pageHeight !== pageHeight
  ) {
    const measureEl = createMeasureElement(pageWidth, cssClasses);

    cache = {
      pageWidth,
      pageHeight,
      availableHeight: getAvailableHeight(container, cssClasses),
      styles: getStyles(measureEl),
      cssClasses: cssClasses || "",
      containerKey: cacheKey,
    };

    paginationCache.set(cacheKey, cache);
    document.body.removeChild(measureEl);
  }

  const pages: string[] = [];
  const measureEl = createMeasureElement(pageWidth, cssClasses);
  const maxAllowedHeight = cache.pageHeight;

  await loadFonts(measureEl);

  try {
    const fragment = parseHTML(html);
    const elements = Array.from(fragment.childNodes).filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
    );

    let currentPageContent: Node[] = [];
    let pageIndex = 0;
    let pagesProcessedSinceYield = 0;
    
    const finalizePage = async () => {
      if (currentPageContent.length > 0) {
        // Оптимизированное создание страницы
        const fragment = document.createDocumentFragment();
        currentPageContent.forEach((node) =>
          fragment.appendChild(node.cloneNode(true))
        );

        const pageDiv = document.createElement("div");
        pageDiv.appendChild(fragment);

        pages.push(pageDiv.innerHTML);
        currentPageContent = [];

        pagesProcessedSinceYield++;

        // Каждые 10 страниц даем основному потоку возможность выполнить другие задачи
        if (pagesProcessedSinceYield >= maxPagesPerYield) {
          await yieldToMainThread();
          pagesProcessedSinceYield = 0;
          
          if (process.env.NODE_ENV === "development") {
            console.log(`Processed ${pages.length} pages, yielding to main thread`);
          }
        }
      }
    };

    // Оптимизированная обработка элементов
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
      const element = elements[elementIndex];

      if (element.nodeType === Node.TEXT_NODE) {
        const textNode = element as Text;
        if (!textNode.textContent?.trim()) continue;

        let remainingText: Text | null = textNode;
        let textIterations = 0;
        const maxTextIterations = 100; // Уменьшили лимит

        while (remainingText && textIterations < maxTextIterations) {
          textIterations++;

          // Оптимизированное восстановление содержимого страницы
          measureEl.innerHTML = "";
          const pageFragment = document.createDocumentFragment();
          currentPageContent.forEach((node) =>
            pageFragment.appendChild(node.cloneNode(true))
          );
          measureEl.appendChild(pageFragment);

          // Быстрая проверка - поместится ли весь оставшийся текст
          const testElement = document.createTextNode(
            remainingText.textContent || ""
          );
          measureEl.appendChild(testElement);
          const wouldFit = measureEl.scrollHeight <= maxAllowedHeight;
          measureEl.removeChild(testElement);

          if (wouldFit) {
            currentPageContent.push(remainingText);
            remainingText = null;
            continue;
          }

          // Разбиваем текст
          const { fitted, remaining } = splitTextNode(
            remainingText,
            measureEl,
            maxAllowedHeight,
            measureEl
          );

          // Проверка на бесконечный цикл
          if (
            remaining &&
            remaining.textContent === remainingText.textContent
          ) {
            if (process.env.NODE_ENV === "development") {
              console.error(
                "splitTextNode returned the same text, breaking to avoid infinite loop"
              );
            }
            await finalizePage();
            break;
          }

          if (fitted) {
            currentPageContent.push(fitted);
          }

          if (remaining) {
            await finalizePage();
            remainingText = remaining;
          } else {
            remainingText = null;
          }
        }

        if (textIterations >= maxTextIterations) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "Text processing exceeded maximum iterations, breaking loop"
            );
          }
          break;
        }
      } else if (element.nodeType === Node.ELEMENT_NODE) {
        let remainingElement: HTMLElement | null = element as HTMLElement;
        let elementIterations = 0;
        const maxElementIterations = 500;

        while (remainingElement && elementIterations < maxElementIterations) {
          elementIterations++;

          // Оптимизированное восстановление содержимого страницы
          measureEl.innerHTML = "";
          const pageFragment = document.createDocumentFragment();
          currentPageContent.forEach((node) =>
            pageFragment.appendChild(node.cloneNode(true))
          );
          measureEl.appendChild(pageFragment);

          // Быстрая проверка - поместится ли элемент целиком
          const testElement = cloneElement(remainingElement);
          measureEl.appendChild(testElement);
          const wouldFit = measureEl.scrollHeight <= maxAllowedHeight;
          measureEl.removeChild(testElement);

          if (wouldFit) {
            currentPageContent.push(remainingElement);
            remainingElement = null;
            continue;
          }

          // Быстрая проверка доступной высоты
          const elementStyles = cache.styles[remainingElement.tagName];
          if (elementStyles) {
            const availableHeight =
              maxAllowedHeight -
              measureEl.scrollHeight -
              elementStyles.marginTop -
              elementStyles.marginBottom;

            if (
              elementStyles.lineHeight > 0 &&
              availableHeight < elementStyles.lineHeight
            ) {
              await finalizePage();
              continue;
            }
          }

          // Разбиваем элемент
          const { fitted, remaining } = splitElement(
            remainingElement,
            measureEl,
            maxAllowedHeight,
            measureEl
          );

          if (!fitted && !remaining && currentPageContent.length === 0) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `No split possible for ${remainingElement.tagName}, forcing on empty page`
              );
            }
            currentPageContent.push(remainingElement);
            remainingElement = null;
            continue;
          }

          if (fitted) {
            currentPageContent.push(fitted);
          }

          if (remaining) {
            await finalizePage();
            remainingElement = remaining;
          } else {
            remainingElement = null;
          }
        }

        if (elementIterations >= maxElementIterations) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "Element processing exceeded maximum iterations, breaking loop"
            );
          }
          break;
        }
      }
    }

    await finalizePage();
  } finally {
    document.body.removeChild(measureEl);
  }

  const endTime = performance.now();
  if (process.env.NODE_ENV === "development") {
    console.log(
      `Text pagination completed in ${(endTime - startTime).toFixed(2)}ms`
    );
  }

  return pages.length > 0 ? pages : [""];
};

/**
 * Очищает кэш пагинации
 */
export const clearPaginationCache = (): void => {
  paginationCache.clear();
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

  if (!cache) {
    const pageWidth = getPageWidth(container);
    const measureEl = createMeasureElement(pageWidth, cssClasses);

    cache = {
      pageWidth,
      pageHeight: getPageHeight(container),
      availableHeight: getAvailableHeight(container, cssClasses),
      styles: getStyles(measureEl),
      cssClasses: cssClasses || "",
      containerKey: cacheKey,
    };

    paginationCache.set(cacheKey, cache);
    document.body.removeChild(measureEl);
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
