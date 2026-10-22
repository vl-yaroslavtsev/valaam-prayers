import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import { daysApi } from "@/services/api/DaysApi";
import type { CalendarDayApiElement, CalendarMarkersResponse } from "@/services/api/DaysApi";
import { calendarDaysStorage, calendarMarkersStorage } from "@/services/storage";

export interface CalendarDay {
  id: string;
  title: string;
  description: string;
}

export const useCalendarStore = defineStore("calendar", () => {
  // State
  const days = ref<CalendarDay[]>([
    {
      id: "20241001",
      title: "1 октября",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi tempora similique reiciendis, error nesciunt vero, blanditiis pariatur dolor, minima sed sapiente rerum, dolorem corrupti hic modi praesentium unde saepe perspiciatis.",
    },
    {
      id: "20241002",
      title: "2 октября",
      description:
        "Velit odit autem modi saepe ratione totam minus, aperiam, labore quia provident temporibus quasi est ut aliquid blanditiis beatae suscipit odio vel! Nostrum porro sunt sint eveniet maiores, dolorem itaque!",
    },
    {
      id: "20241003",
      title: "3 октября",
      description:
        "Expedita sequi perferendis quod illum pariatur aliquam, alias laboriosam! Vero blanditiis placeat, mollitia necessitatibus reprehenderit. Labore dolores amet quos, accusamus earum asperiores officiis assumenda optio architecto quia neque, quae eum.",
    },
  ]);

  // Раскраска дней календаря. shallowRef: снимок большой (~3300 дней), глубокая реактивность не нужна,
  // а в IndexedDB нужно класть обычный (не Proxy) объект.
  const markers = shallowRef<CalendarMarkersResponse | null>(null);
  const isMarkersLoading = ref(false);
  const markersError = ref<string | null>(null);

  /**
   * Загружает раскраску дней с сервера и сохраняет снимок в кэш.
   * Если данные уже есть (из кэша), ошибка сети не показывается - остаётся кэш.
   */
  const refreshMarkers = async () => {
    if (!markers.value) {
      isMarkersLoading.value = true;
    }
    markersError.value = null;

    try {
      const fresh = await daysApi.getCalendarMarkers();
      markers.value = fresh;

      try {
        await calendarMarkersStorage?.saveSnapshot(fresh);
      } catch (err) {
        console.error("Failed to save calendar markers to cache:", err);
      }
    } catch (err) {
      console.error("Failed to load calendar markers:", err);
      if (!markers.value) {
        markersError.value = err instanceof Error ? err.message : "Unknown error";
      }
    } finally {
      isMarkersLoading.value = false;
    }
  };

  const initStore = async () => {
    try {
      const cached = await calendarMarkersStorage?.getSnapshot();
      if (cached) {
        markers.value = cached;
      }
    } catch (err) {
      console.warn("Failed to load calendar markers from cache, will fetch from API", err);
    }

    void refreshMarkers();
    console.log("Calendar store initialized");
  }

  // Getters
  const getDays = () => days.value;
  
  const getDayById = (id: string) => days.value.find((day) => day.id === id);

  /**
   * Получает день по коду даты (YYYYMMDD) из реального API.
   * Сначала проверяет офлайн-кэш (наполняется только DownloadManager'ом), иначе идёт в сеть.
   * Результат разового сетевого запроса в IndexedDB не сохраняется - см. Service Worker.
   */
  const readCachedDay = async (code: string): Promise<CalendarDayApiElement | null> => {
    const cached = await calendarDaysStorage?.get(code);
    // Дни, скачанные до смены формата API, не содержат fasting - их читаем заново из сети
    return cached && "fasting" in cached ? cached : null;
  };

  const loadDayByCode = async (code: string): Promise<CalendarDayApiElement | null> => {
    try {
      const cached = await readCachedDay(code);
      if (cached) return cached;

      const { items } = await daysApi.getDaysPage(code, code, 1, 1);
      return items[0] ?? null;
    } catch (err) {
      console.error(`Failed to get calendar day for code ${code}:`, err);
      return null;
    }
  };

  /**
   * Несколько дней одним запросом (вид «неделя»). Что есть в офлайн-кэше - берём оттуда,
   * остальное - одним диапазоном из сети. Коды должны идти по возрастанию.
   */
  const loadDaysBatch = async (codes: string[]): Promise<Map<string, CalendarDayApiElement>> => {
    const loaded = new Map<string, CalendarDayApiElement>();
    try {
      const missing: string[] = [];
      for (const code of codes) {
        const cached = await readCachedDay(code);
        if (cached) loaded.set(code, cached);
        else missing.push(code);
      }

      if (missing.length > 0) {
        const { items } = await daysApi.getDaysPage(
          missing[0],
          missing[missing.length - 1],
          1,
          missing.length
        );
        for (const item of items) loaded.set(item.code, item);
      }
    } catch (err) {
      console.error(`Failed to get calendar days ${codes[0]}-${codes[codes.length - 1]}:`, err);
    }
    return loaded;
  };

  // Дни, уже прочитанные за сессию: слайдер и читалка не ходят за одним днём дважды
  const dayRequests = new Map<string, Promise<CalendarDayApiElement | null>>();

  const getDayByCode = (code: string): Promise<CalendarDayApiElement | null> => {
    let request = dayRequests.get(code);
    if (!request) {
      request = loadDayByCode(code).then((day) => {
        // Неудачу не запоминаем, чтобы можно было повторить запрос
        if (!day) dayRequests.delete(code);
        return day;
      });
      dayRequests.set(code, request);
    }
    return request;
  };

  /**
   * Дни по кодам (по возрастанию) в том же порядке; null - день не удалось получить.
   * Ещё не прочитанные дни идут одним запросом, а результат ложится в общий кэш getDayByCode.
   */
  const getDaysByCodes = (codes: string[]): Promise<(CalendarDayApiElement | null)[]> => {
    const missing = codes.filter((code) => !dayRequests.has(code));
    if (missing.length > 0) {
      const batch = loadDaysBatch(missing);
      for (const code of missing) {
        dayRequests.set(
          code,
          batch.then((loaded) => {
            const day = loaded.get(code) ?? null;
            if (!day) dayRequests.delete(code);
            return day;
          })
        );
      }
    }
    return Promise.all(codes.map(getDayByCode));
  };

  return {
    // State
    days,
    markers,
    isMarkersLoading,
    markersError,
    // Getters
    getDays,
    getDayById,
    getDayByCode,
    getDaysByCodes,
    // Actions
    initStore,
    refreshMarkers,
  };
});
