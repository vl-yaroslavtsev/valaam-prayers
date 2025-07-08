import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { thoughtsIndexStorage, thoughtDetailsStorage } from "@/services/storage";

export interface ThoughtIndex {
  id: string;
  name: string;
}

export interface ThoughtDetails {
  id: string;
  name: string;
  text: string;
  author?: string;
  date?: string;
}

export const useThoughtsStore = defineStore("thoughts", () => {
  // State
  const thoughts = shallowRef<ThoughtIndex[]>([]);
  const isInitialized = ref<boolean>(false);
  const isInitializing = ref<boolean>(false);
  const isLoading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  /**
   * Инициализация store с загрузкой индекса размышлений
   */
  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      console.time("Thoughts initStore");
      const cachedThoughts = await thoughtsIndexStorage?.getAll();
      
      if (cachedThoughts) {
        thoughts.value = cachedThoughts as ThoughtIndex[];
        console.log('Loaded thoughts index from cache');
      } else {
        // TODO: Загрузить с сервера, если нет в кэше
        console.log('No thoughts cache found, need to fetch from API');
      }
      console.timeEnd("Thoughts initStore");
      
    } catch (err) {
      console.error('Failed to load thoughts index:', err);
    } finally {
      isInitialized.value = true;
      isInitializing.value = false;
    }
  };

  /**
   * Получает размышление по ID из индекса
   */
  const getThoughtById = (id: string): ThoughtIndex | undefined => {
    return thoughts.value.find((thought) => thought.id === id);
  };

  /**
   * Получает полные данные размышления
   */
  const getThoughtDetails = async (id: string): Promise<ThoughtDetails | null> => {
    try {
      // Сначала проверяем кэш
      const cached = await thoughtDetailsStorage?.get(id);
      if (cached) {
        return cached as ThoughtDetails;
      }

      // TODO: Загрузить с сервера
      console.log(`Need to fetch thought details for ID ${id} from API`);
      return null;
    } catch (err) {
      console.error(`Failed to get thought details for ID ${id}:`, err);
      return null;
    }
  };

  return {
    // State
    thoughts,
    isInitialized,
    isLoading,
    error,
    // Actions
    initStore,
    getThoughtById,
    getThoughtDetails,
  };
}); 