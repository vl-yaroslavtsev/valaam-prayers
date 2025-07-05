import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { saintsIndexStorage, saintDetailsStorage } from "@/services/storage";

export interface SaintIndex {
  id: string;
  name: string;
}

export interface SaintDetails {
  id: string;
  name: string;
  dates: string[];
  life: string;
  tropars?: string[];
  canons?: string[];
  akathists?: string[];
}

export const useSaintsStore = defineStore("saints", () => {
  // State
  const saintsIndex = shallowRef<SaintIndex[]>([]);
  const isInitialized = ref<boolean>(false);
  const isInitializing = ref<boolean>(false);
  const isLoading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  /**
   * Инициализация store с загрузкой индекса святых
   */
  const initStore = async () => {
    if (isInitialized.value || isInitializing.value) return;
    isInitializing.value = true;

    try {
      console.time("Saints initStore");
      const cachedSaints = await saintsIndexStorage?.getAll();
      
      if (cachedSaints) {
        saintsIndex.value = cachedSaints as SaintIndex[];
        console.log('Loaded saints index from cache');
      } else {
        // TODO: Загрузить с сервера, если нет в кэше
        console.log('No saints cache found, need to fetch from API');
      }
      console.timeEnd("Saints initStore");
      
    } catch (err) {
      console.error('Failed to load saints index:', err);
    } finally {
      isInitialized.value = true;
      isInitializing.value = false;
    }
  };

  /**
   * Получает святого по ID из индекса
   */
  const getSaintById = (id: string): SaintIndex | undefined => {
    return saintsIndex.value.find((saint) => saint.id === id);
  };

  /**
   * Получает полные данные святого
   */
  const getSaintDetails = async (id: string): Promise<SaintDetails | null> => {
    try {
      // Сначала проверяем кэш
      const cached = await saintDetailsStorage?.get(id);
      if (cached) {
        return cached as SaintDetails;
      }

      // TODO: Загрузить с сервера
      console.log(`Need to fetch saint details for ID ${id} from API`);
      return null;
    } catch (err) {
      console.error(`Failed to get saint details for ID ${id}:`, err);
      return null;
    }
  };

  initStore();

  return {
    // State
    saintsIndex,
    isInitialized,
    isLoading,
    error,
    // Actions
    initStore,
    getSaintById,
    getSaintDetails,
  };
}); 