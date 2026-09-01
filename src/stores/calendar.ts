import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { daysApi } from "@/services/api/DaysApi";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { calendarDaysStorage } from "@/services/storage";

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

  const initStore = async () => {
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
  const getDayByCode = async (code: string): Promise<CalendarDayApiElement | null> => {
    try {
      const cached = await calendarDaysStorage?.get(code);
      if (cached) {
        return cached;
      }

      const { items } = await daysApi.getDaysPage(code, code, 1, 1);
      return items[0] ?? null;
    } catch (err) {
      console.error(`Failed to get calendar day for code ${code}:`, err);
      return null;
    }
  };

  return {
    // State
    days,
    // Getters
    getDays,
    getDayById,
    getDayByCode,
    // Actions
    initStore,
  };
});
