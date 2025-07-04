/**
 * Общие типы для API
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
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