/**
 * Модуль для обработки текста
 * Включает пагинацию и утилиты для работы с текстом
 */

// Экспорт функций пагинации
export {
  paginateText,
  estimatePageCount,
  calculateOptimalPageSize,
  type Slide,
} from './textPagination';

// Экспорт утилит для работы с текстом
export {
  stripHtmlTags,
  endsWithLetter,
  startsWithLetter,
  getLastWord,
  moveLastWordBetweenElements,
  getTextNodes,
} from './textUtils'; 