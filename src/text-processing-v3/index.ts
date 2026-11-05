export { paginateText } from "./textPagination";
export type { PaginationResult, PaginationHeader } from "./textPagination";

export {
  buildPageSentenceIndex,
  searchInSentenceIndex,
  highlightPageHtml,
  normalizeSearchContext,
  searchMatchContext,
  alignSearchAnchors,
} from "./textSearch";
export type { PageSentence, PageSentenceIndex, SearchMatch } from "./textSearch";
