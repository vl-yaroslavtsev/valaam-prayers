/**
 * Общие типы для API
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string | number;
}

export interface ApiErrorItem {
  message: string;
  code: string | number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T | null;
  errors: ApiErrorItem[] | null;
}

export interface ApiNav {
  page_count: number;
  page_num: number;
  page_size: number;
  record_count: number;
  nav_num: number;
}

export interface ApiListData<T> {
  items: T[];
  nav: ApiNav;
}

/**
 * Статусы загрузки
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Состояние API запроса
 */
export interface ApiState<T> {
  data: T | null;
  loading: LoadingState;
  error: ApiError | null;
}
