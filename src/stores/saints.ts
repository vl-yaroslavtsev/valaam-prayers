import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { saintsIndexStorage, saintDetailsStorage } from "@/services/storage";
import { saintsApi } from "@/services/api/SaintsApi";

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
  const saints = shallowRef<SaintIndex[]>([]);
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
        saints.value = cachedSaints as SaintIndex[];
        console.log('Loaded saints index from cache');
      } 
      console.timeEnd("Saints initStore");
      
    } catch (err) {
      console.error('Failed to load saints index:', err);
    } finally {
      isInitialized.value = true;
      isInitializing.value = false;
    }

    fetchSaintIndex().then(saveSaintIndexToCache);
  };

  const fetchSaintIndex = async () => {
    if (saints.value.length === 0) {
      isLoading.value = true;
    }
    try {
      console.time("Saints fetchSaintIndex");
      const saintsIndex = await saintsApi.getSaintsIndex();

      if (saints.value.length === 0) {
        saints.value = saintsIndex;
      }

      console.timeEnd("Saints fetchSaintIndex");
      console.log("Saints index loaded successfully");
      return saintsIndex;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = errorMessage;
      console.error('Failed to load saints index:', err);
    } finally {
      isLoading.value = false;
    }

    return [];
  }

  const saveSaintIndexToCache = async (saintsIndex: SaintIndex[]) => {
    try {
      console.time("Saints saveSaintIndexToCache");
      if (saintsIndex.length > 0) {
        await saintsIndexStorage?.putAll(saintsIndex);
      }
      console.timeEnd("Saints saveSaintIndexToCache");
      console.log("Saints index saved to cache");
    } catch (err) { 
      console.error('Failed to save saints index to cache:', err);
    }
  }

  /**
   * Получает святого по ID из индекса
   */
  const getSaintById = (id: string): SaintIndex | undefined => {
    return saints.value.find((saint) => saint.id === id);
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

  return {
    // State
    saints,
    isInitialized,
    isLoading,
    error,
    // Actions
    initStore,
    getSaintById,
    getSaintDetails,
  };
}); 