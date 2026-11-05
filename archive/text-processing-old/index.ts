/**
 * Модуль для обработки текста
 * Включает пагинацию и утилиты для работы с текстом
 */

// Экспорт функций пагинации
export {
  paginateText,
  estimatePageCount,
  calculateOptimalPageSize,
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

// Экспорт утилит для поиска по тексту
export {
  buildPageSentenceIndex,
  searchInSentenceIndex,
  highlightPageHtml,
} from './textSearch';
export type { PageSentence, PageSentenceIndex, SearchMatch } from './textSearch';
