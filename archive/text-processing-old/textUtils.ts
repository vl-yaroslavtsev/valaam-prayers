/**
 * Утилиты для работы с текстом и HTML
 */

/**
 * Удаляет HTML-теги из строки
 * @param html - строка с HTML-тегами
 * @returns строка без HTML-тегов
 */
export function stripHtmlTags(html: string): string {
  // Создаем временный DOM элемент для безопасного удаления тегов
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Возвращаем только текстовое содержимое
  return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Проверяет, заканчивается ли строка на букву
 * @param str - проверяемая строка
 * @returns true если строка заканчивается на букву, false - иначе
 */
export function endsWithLetter(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  
  // Получаем последний символ строки
  const lastChar = str.slice(-1);
  
  // Проверяем является ли символ буквой (поддерживает кириллицу и латиницу)
  return /[a-zA-Zа-яА-ЯёЁ]/.test(lastChar);
}

/**
 * Проверяет, начинается ли строка с буквы
 * @param str - проверяемая строка
 * @returns true если строка начинается с буквы, false - иначе
 */
export function startsWithLetter(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  
  // Получаем первый символ строки
  const firstChar = str.charAt(0);
  
  // Проверяем является ли символ буквой (поддерживает кириллицу и латиницу)
  return /[a-zA-Zа-яА-ЯёЁ]/.test(firstChar);
}

/**
 * Извлекает последнее слово из текста
 * @param text - исходный текст
 * @returns последнее слово или пустую строку если слов нет
 */
export function getLastWord(text: string): string {
  if (!text || text.length === 0) {
    return '';
  }
  
  // Убираем лишние пробелы и разбиваем на слова
  const words = text.trim().split(/\s+/);
  
  // Возвращаем последнее слово или пустую строку
  return words.length > 0 ? words[words.length - 1] : '';
}

/**
 * Переносит последнее слово из одного HTML элемента в начало другого
 * Работает с сложной DOM структурой, сохраняя теги
 * @param fromElement - элемент из которого переносим слово
 * @param toElement - элемент в который переносим слово
 * @returns true если перенос выполнен, false если невозможен
 */
export function moveLastWordBetweenElements(fromElement: HTMLElement, toElement: HTMLElement): boolean {
  // Получаем все текстовые узлы из fromElement
  const textNodes = getTextNodes(fromElement);
  if (textNodes.length === 0) return false;

  // Ищем последний непустой текстовый узел
  let lastTextNode: Text | null = null;
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    if (node.textContent && node.textContent.trim()) {
      lastTextNode = node;
      break;
    }
  }

  if (!lastTextNode || !lastTextNode.textContent) return false;

  const text = lastTextNode.textContent;
  const words = text.trim().split(/\s+/);
  
  if (words.length <= 1) return false; // Нет слов для переноса или только одно слово

  // Находим позицию последнего слова
  const lastWord = words[words.length - 1];
  const lastWordIndex = text.lastIndexOf(lastWord);
  
  if (lastWordIndex === -1) return false;

  // Разделяем текст
  const beforeLastWord = text.substring(0, lastWordIndex);
  const lastWordWithSpaces = text.substring(lastWordIndex);

  // Обновляем исходный узел
  lastTextNode.textContent = beforeLastWord;

  // Создаем структуру для переноса в начало toElement
  const wordNode = document.createTextNode(lastWordWithSpaces);
  
  // Вставляем в начало toElement
  if (toElement.firstChild) {
    toElement.insertBefore(wordNode, toElement.firstChild);
  } else {
    toElement.appendChild(wordNode);
  }

  return true;
}

/**
 * Получает все текстовые узлы из HTML элемента (рекурсивно)
 * @param element - HTML элемент
 * @returns массив текстовых узлов
 */
export function getTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  
  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        traverse(child);
      }
    }
  }
  
  traverse(element);
  return textNodes;
} 