/**
 * Модуль для разбиения HTML-текста на страницы как в читалке
 *
 * Поддерживает HTML-теги: h2, h3, h4, h5, h6, p, a, blockquote, strong, em, b, i
 * Большие элементы (p, blockquote, strong, b, i, em) могут разбиваться между страницами
 *
 * @example
 * ```typescript
 * import { paginateText } from '@/utils/textPagination';
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



export interface Slide {
  id: number | string;
  content: string;
}

// Функция для создания временного элемента для измерения высоты
const createMeasureElement = (
  width: number,
  cssClasses?: string
): HTMLElement => {
  const element = document.createElement("div");
  if (cssClasses) {
    element.className = cssClasses;
  }
  element.style.position = "absolute";
  element.style.visibility = "hidden";
  element.style.top = "-9999px";
  element.style.left = "0";
  element.style.width = `${width}px`;
  element.style.height = "auto";
  // element.style.maxHeight = `${maxHeight}px`;
  element.style.boxSizing = "border-box";
  element.style.overflow = "hidden";
  // element.style.wordBreak = "break-word";
  element.style.whiteSpace = "normal";
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

// Функция для получения реальной доступной высоты с учетом стилей
const getAvailableHeight = (
  container?: HTMLElement,
  cssClasses?: string
): number => {
  const containerHeight = getPageHeight(container);

  // Создаем временный элемент для измерения реальных отступов
  const testElement = document.createElement("div");
  if (cssClasses) {
    testElement.className = cssClasses;
  }
  testElement.style.position = "absolute";
  testElement.style.visibility = "hidden";
  testElement.style.top = "-9999px";
  testElement.style.width = "100%";
  testElement.style.height = `${containerHeight}px`;
  testElement.style.boxSizing = "border-box";
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

  console.log("Height calculation:", {
    containerHeight,
    paddingTop,
    paddingBottom,
    borderTop,
    borderBottom,
    availableHeight,
  });

  document.body.removeChild(testElement);

  return Math.max(availableHeight, 100); // Минимум 100px
};

// Функция для получения отступов элемента
const getStyles = (
  measureEl: HTMLElement
): { [key: string]: { marginTop: number; marginBottom: number; lineHeight: number } } => {

  const styles: { [key: string]: { marginTop: number; marginBottom: number; lineHeight: number } } = {};
  ["H1", "H2", "H3", "H4", "H5", "H6", "P", "BLOCKQUOTE"].forEach((tagName) => {
    const element = document.createElement(tagName);
    measureEl.innerHTML = "";
    measureEl.appendChild(element);
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop || '0');
    const marginBottom = parseFloat(computedStyle.marginBottom || '0');
    const lineHeight = parseFloat(computedStyle.lineHeight || '0');
    styles[tagName] = { marginTop, marginBottom, lineHeight };
  });

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

// Функция для разбиения текстового узла
const splitTextNode = (
  textNode: Text,
  container: HTMLElement,
  maxHeight: number
): {
  fitted: Text | null;
  remaining: Text | null;
} => {
  const originalText = textNode.textContent || "";
  if (!originalText.trim()) {
    return { fitted: textNode, remaining: null };
  }

  // Сохраняем исходное содержимое контейнера
  const originalContent = container.innerHTML;

  // Бинарный поиск для нахождения максимального количества символов
  let left = 0;
  let right = originalText.length;
  let bestFit = 0;
  let iterations = 0;
  let mid = 0;
  let currentHeight = 0;

  while (left <= right && iterations < 50) {
    // Защита от бесконечного цикла
    iterations++;
    mid = Math.floor((left + right) / 2);
    const testText = originalText.substring(0, mid);

    // Восстанавливаем исходное содержимое и добавляем тестовый текст
    container.innerHTML = originalContent;
    const testNode = document.createTextNode(testText);
    container.appendChild(testNode);

    currentHeight = container.scrollHeight;

    // console.log(`Binary search iteration ${iterations}: testing ${mid} chars, height ${currentHeight}/${containerHeight}`);

    // Проверяем, помещается ли контент в контейнер
    if (currentHeight <= maxHeight) {
      bestFit = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (iterations >= 50) {
    console.warn(
      "Binary search exceeded maximum iterations, using current best fit:",
      bestFit
    );
  }

  while (currentHeight > maxHeight && mid > 0) {
    const testText = originalText.substring(0, --mid);
    // Восстанавливаем исходное содержимое и добавляем тестовый текст
    container.innerHTML = originalContent;
    const testNode = document.createTextNode(testText);
    container.appendChild(testNode);

    currentHeight = container.scrollHeight;
    console.log("splitTextNode: fixHeight: currentHeight", currentHeight);
  }

  // Восстанавливаем исходное содержимое
  container.innerHTML = originalContent;

  if (bestFit === 0) {
    // Если даже один символ не помещается, принудительно берем один символ
    // if (originalText.length > 0) {
    //   console.warn("No space for any text, forcing single character");
    //   const fitted = document.createTextNode(originalText.substring(0, 1));
    //   const remaining =
    //     originalText.length > 1
    //       ? document.createTextNode(originalText.substring(1))
    //       : null;
    //   return { fitted, remaining };
    // }
    return { fitted: null, remaining: textNode };
  }

  if (bestFit === originalText.length) {
    return { fitted: textNode, remaining: null };
  }

  // Попытаемся разбить по словам
  const fittedText = originalText.substring(0, bestFit);
  const lastSpaceIndex = fittedText.lastIndexOf(" ");

  // let splitIndex = bestFit;
  // if (lastSpaceIndex > bestFit * 0.8) {
    // Если пробел не слишком далеко от конца
    // splitIndex = lastSpaceIndex + 1;
  // }

  const splitIndex = lastSpaceIndex + 1;

  const fitted = document.createTextNode(originalText.substring(0, splitIndex));
  const remaining = document.createTextNode(originalText.substring(splitIndex));

  return { fitted, remaining };
};

// Функция для разбиения элемента между страницами
const splitElement = (
  element: HTMLElement,
  maxHeight: number,
  measureEl: HTMLElement,
  doClearMeasureEl: boolean = true
): {
  fitted: HTMLElement | null;
  remaining: HTMLElement | null;
} => {
  const tagName = element.tagName.toLowerCase();

  // Заголовки не разбиваем - они должны помещаться целиком или переноситься на новую страницу
  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
    if (doClearMeasureEl) {
      measureEl.innerHTML = "";
    }
    
    const clone = cloneElement(element);
    measureEl.appendChild(clone);
    const scrollHeight = measureEl.scrollHeight;
    if (!doClearMeasureEl) {
      measureEl.removeChild(clone);
    }

    if (scrollHeight <= maxHeight) {      
      return { fitted: element, remaining: null };
    } else {
      // Заголовок не помещается - возвращаем как remaining для переноса на новую страницу
      return { fitted: null, remaining: element };
    }
  }

  // Ссылки тоже стараемся не разбивать
  if (tagName === "a") {
    if (doClearMeasureEl) {
      measureEl.innerHTML = "";
    }

    const clone = cloneElement(element);
    measureEl.appendChild(clone);
    const scrollHeight = measureEl.scrollHeight;
    if (!doClearMeasureEl) {
      measureEl.removeChild(clone);
    }
    
    if (scrollHeight <= maxHeight) {
      return { fitted: element, remaining: null };
    } else {
      return { fitted: null, remaining: element };
    }
  }

  // Для небольших элементов (strong, em, b, i) тоже стараемся не разбивать, но если не помещаются - разбиваем
  if (['strong', 'em', 'b', 'i'].includes(tagName)) {
    if (doClearMeasureEl) {
      measureEl.innerHTML = '';
    }
    
    const clone = cloneElement(element);
    measureEl.appendChild(clone);
    const scrollHeight = measureEl.scrollHeight;
    if (!doClearMeasureEl) {
      measureEl.removeChild(clone);
    }
    
    if (scrollHeight <= maxHeight) {
      return { fitted: element, remaining: null };
    }
    // Если не помещается, пытаемся разбить содержимое (продолжаем выполнение)
  }

  // Для остальных элементов пытаемся разбить содержимое
  const fittedElement = cloneElement(element);
  const remainingElement = cloneElement(element);

  fittedElement.innerHTML = "";
  remainingElement.innerHTML = "";

  if (doClearMeasureEl) {
    measureEl.innerHTML = "";
  }
  measureEl.appendChild(fittedElement);

  // const baseHeight = measureEl.scrollHeight;

  let hasContent = false;
  let hasRemaining = false;

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const textNode = child as Text;
      if (!textNode.textContent?.trim()) {
        fittedElement.appendChild(textNode.cloneNode(true));
        continue;
      }

      const { fitted, remaining } = splitTextNode(
        textNode,
        fittedElement,
        maxHeight
      );

      if (fitted) {
        fittedElement.appendChild(fitted);
        hasContent = true;
      }

      if (remaining) {
        remainingElement.appendChild(remaining);
        hasRemaining = true;
        
        // Добавляем все оставшиеся элементы в remaining
        const siblings = Array.from(element.childNodes);
        const currentIndex = siblings.indexOf(child);
        for (let i = currentIndex + 1; i < siblings.length; i++) {
          remainingElement.appendChild(siblings[i].cloneNode(true));
        }
        break;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as HTMLElement;
      const availableSpace = maxHeight; // - baseHeight;
      const { fitted, remaining } = splitElement(
        childElement,
        availableSpace,
        fittedElement, 
        false
      );

      if (fitted) {
        fittedElement.appendChild(fitted);
        hasContent = true;
      }

      if (remaining) {
        remainingElement.appendChild(remaining);
        hasRemaining = true;

        // Добавляем все оставшиеся элементы в remaining
        const siblings = Array.from(element.childNodes);
        const currentIndex = siblings.indexOf(child);
        for (let i = currentIndex + 1; i < siblings.length; i++) {
          remainingElement.appendChild(siblings[i].cloneNode(true));
        }
        break;
      }
    }
  }

  // Если ничего не поместилось, но элемент небольшой, принудительно помещаем его
  if (!hasContent && !hasRemaining) {
    // Проверяем размер исходного элемента
    if (doClearMeasureEl) {
      measureEl.innerHTML = "";
    }
    measureEl.appendChild(cloneElement(element));
    const elementHeight = measureEl.scrollHeight;

    console.log(
      `Element ${element.tagName} height: ${elementHeight}, available: ${maxHeight}`
    );

    // Если элемент относительно небольшой, принудительно помещаем его
    if (elementHeight <= maxHeight) {
      // Позволяем превышение на 20%
      console.warn(`Forcing element ${element.tagName} to fit despite size`);
      return { fitted: element, remaining: null };
    }
  }

  return {
    fitted: hasContent ? fittedElement : null,
    remaining: hasRemaining ? remainingElement : null,
  };
};

/**
 * Основная функция для разбиения HTML-текста на страницы
 *
 * @param html - HTML-строка для разбиения на страницы
 * @param container - Контейнер для определения размера страницы (опционально)
 * @param cssClasses - CSS-классы для применения к страницам (опционально)
 * @returns Массив слайдов с разбитым по страницам контентом
 */
export const paginateText = (
  html: string,
  container?: HTMLElement,
  cssClasses?: string
): Slide[] => {
  const slides: Slide[] = [];
  const pageWidth = getPageWidth(container);
  const measureEl = createMeasureElement(pageWidth, cssClasses);
  const maxAllowedHeight = getPageHeight(container); //measureEl.clientHeight; // Константа для оптимизации
  const styles = getStyles(measureEl);
  debugger;
  const startTime = Date.now();
  const maxProcessingTime = 30000; // 30 секунд максимум

  try {
    const fragment = parseHTML(html);
    const elements = Array.from(fragment.childNodes).filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
    );

    let currentPageContent: Node[] = [];
    let pageIndex = 0;

    const finalizePage = () => {
      if (currentPageContent.length > 0) {
        const pageDiv = document.createElement("div");
        currentPageContent.forEach((node) =>
          pageDiv.appendChild(node.cloneNode(true))
        );

        // Проверяем высоту созданной страницы
        measureEl.innerHTML = pageDiv.innerHTML;
        const actualPageHeight = measureEl.scrollHeight;
        console.log(
          `Page ${pageIndex + 1}: content height ${actualPageHeight}px, max allowed ${maxAllowedHeight}px`
        );

        slides.push({
          id: pageIndex++,
          content: pageDiv.innerHTML,
        });
        currentPageContent = [];
      }
    };

    for (const element of elements) {
      // Проверяем время выполнения
      // if (Date.now() - startTime > maxProcessingTime) {
      //   console.error('Text pagination exceeded maximum processing time, stopping');
      //   break;
      // }

      if (element.nodeType === Node.TEXT_NODE) {
        const textNode = element as Text;
        if (!textNode.textContent?.trim()) continue;

        let remainingText: Text | null = textNode;

        let textIterations = 0;
        while (remainingText && textIterations < 1000) {
          // Защита от бесконечного цикла
          textIterations++;
          // console.log(`Text iteration ${textIterations}, remaining text length: ${remainingText.textContent?.length || 0}`);

          measureEl.innerHTML = "";
          currentPageContent.forEach((node) =>
            measureEl.appendChild(node.cloneNode(true))
          );

          // Проверяем, поместится ли весь оставшийся текст
          const testElement = document.createTextNode(
            remainingText.textContent || ""
          );
          measureEl.appendChild(testElement);
          const wouldFit = measureEl.scrollHeight <= maxAllowedHeight;
          measureEl.removeChild(testElement);

          if (wouldFit) {
            // Весь текст помещается, добавляем его целиком
            console.log("All remaining text fits, adding to page");
            currentPageContent.push(remainingText);
            remainingText = null;
            continue;
          }

          // Убираем логику переноса текста целиком - всегда пытаемся разбить

          // Текст не помещается целиком, пытаемся разбить
          const { fitted, remaining } = splitTextNode(
            remainingText,
            measureEl,
            maxAllowedHeight
          );

          // Проверяем, что мы действительно продвигаемся
          if (
            remaining &&
            remaining.textContent === remainingText.textContent
          ) {
            console.error(
              "splitTextNode returned the same text, breaking to avoid infinite loop"
            );
            finalizePage();
            break;
          }

          if (fitted) {
            currentPageContent.push(fitted);
            // console.log(`Added fitted text: ${fitted.textContent?.substring(0, 50)}...`);
          }

          if (remaining) {
            // console.log(`Text remaining: ${remaining.textContent?.substring(0, 50)}...`);
            finalizePage();
            remainingText = remaining;
          } else {
            // console.log('No remaining text');
            remainingText = null;
          }
        }

        if (textIterations >= 1000) {
          console.error(
            "Text processing exceeded maximum iterations, breaking loop"
          );
          break;
        }
      } else if (element.nodeType === Node.ELEMENT_NODE) {
        let remainingElement: HTMLElement | null = element as HTMLElement;

        let elementIterations = 0;
        while (remainingElement && elementIterations < 1000) {
          // Защита от бесконечного цикла
          elementIterations++;
          // console.log(`Element iteration ${elementIterations}, element: ${remainingElement.tagName}`);

          measureEl.innerHTML = "";
          currentPageContent.forEach((node) =>
            measureEl.appendChild(node.cloneNode(true))
          );

          // Проверяем, поместится ли элемент целиком
          const testElement = cloneElement(remainingElement);
          measureEl.appendChild(testElement);
          const wouldFit = measureEl.scrollHeight <= maxAllowedHeight;
          measureEl.removeChild(testElement);

          // Убираем логику переноса элементов целиком - всегда пытаемся разбить

          // Если элемент помещается целиком, добавляем его
          if (wouldFit) {
            console.log(
              `Element ${remainingElement.tagName} fits completely, adding to page`
            );
            currentPageContent.push(remainingElement);
            remainingElement = null;
            continue;
          }

          const { marginTop = 0, marginBottom = 0, lineHeight = 0 } = styles[remainingElement.tagName];
          const availableHeight =
            maxAllowedHeight -
            marginTop -
            marginBottom -
            measureEl.scrollHeight;

          console.log(
            "remainingElement",
            remainingElement,
            "availableHeight",
            availableHeight,
            "measureEl.scrollHeight",
            measureEl.scrollHeight,
            "marginTop",
            marginTop,
            "marginBottom",
            marginBottom
          );

          if (lineHeight > 0 && availableHeight < lineHeight) {
            console.log("Элемент точно не поместится, lineHeight", lineHeight, "availableHeight", availableHeight);
            finalizePage();
            continue;
          }

          // Элемент не помещается, пытаемся разбить
          const { fitted, remaining } = splitElement(
            remainingElement,
            availableHeight,
            measureEl
          );

          // Если ничего не поместилось, но у нас пустая страница, принудительно добавляем элемент
          if (!fitted && !remaining && currentPageContent.length === 0) {
            console.warn(
              `No split possible for ${remainingElement.tagName}, forcing on empty page`
            );
            currentPageContent.push(remainingElement);
            remainingElement = null;
            continue;
          }

          if (fitted) {
            currentPageContent.push(fitted);
            // console.log(`Added fitted element: ${fitted.tagName}`);
          }

          if (remaining) {
            // console.log(`Element remaining: ${remaining.tagName}`);
            finalizePage();
            remainingElement = remaining;
          } else {
            // console.log('No remaining element');
            remainingElement = null;
          }
        }

        if (elementIterations >= 1000) {
          console.error(
            "Element processing exceeded maximum iterations, breaking loop"
          );
          break;
        }
      }
    }

    finalizePage();
  } finally {
    document.body.removeChild(measureEl);
  }

  return slides.length > 0 ? slides : [{ id: 0, content: "" }];
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
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  tempDiv.style.position = "absolute";
  tempDiv.style.visibility = "hidden";
  tempDiv.style.width = "100%";
  tempDiv.style.boxSizing = "border-box";

  if (cssClasses) {
    tempDiv.className = cssClasses;
  }

  document.body.appendChild(tempDiv);

  const totalHeight = tempDiv.scrollHeight;
  const pageHeight = getAvailableHeight(container, cssClasses);

  document.body.removeChild(tempDiv);

  return Math.ceil(totalHeight / pageHeight);
};
