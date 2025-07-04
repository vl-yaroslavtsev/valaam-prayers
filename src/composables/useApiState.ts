import { ref, computed } from 'vue';
import type { ApiState, ApiError, LoadingState } from '@/services/api/types';

/**
 * Композабл для управления состоянием API запросов
 */
export function useApiState<T>(initialData: T | null = null, dataPromise: Promise<T> | null = null) {
  const data = ref<T | null>(initialData);
  const loading = ref<LoadingState>('idle');
  const error = ref<ApiError | null>(null);

  const isLoading = computed(() => loading.value === 'loading');
  const isSuccess = computed(() => loading.value === 'success');
  const isError = computed(() => loading.value === 'error');
  const isEmpty = computed(() => !data.value);

  const setLoading = () => {
    loading.value = 'loading';
    error.value = null;
  };

  const setSuccess = (newData: T) => {
    data.value = newData;
    loading.value = 'success';
    error.value = null;
  };

  const setError = (newError: ApiError) => {
    error.value = newError;
    loading.value = 'error';
  };

  const reset = () => {
    data.value = initialData;
    loading.value = 'idle';
    error.value = null;
  };

  const init = async () => { 
    if (!dataPromise) return;
    
    setLoading();
    try {
      const result = await dataPromise;
      setSuccess(result);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      loading.value = 'idle';
    }
  }

  if (dataPromise) {
    init();
  }
  
 
  return {
    // State
    data,
    loading,
    error,
    // Computed
    isLoading,
    isSuccess,
    isError,
    isEmpty,
    // Actions
    setLoading,
    setSuccess,
    setError,
    reset
  };
} 