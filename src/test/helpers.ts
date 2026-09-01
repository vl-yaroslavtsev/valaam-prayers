import { vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { closeDB } from "@/services/storage/indexedDB";
import { initStorage } from "@/services/storage";
import type { ApiNav } from "@/services/api/types";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import type { SaintDetailApiElement } from "@/services/api/SaintsApi";
import type { PrayerApiElement, PrayerApiSection, PrayerTextApiResponse } from "@/services/api/PrayersApi";
import type { PrayerDownloadModuleId } from "@/services/download/types";
import type { PaginationHashSettings } from "@/services/storage/PaginationCacheStorage";
import type { ValaamDB } from "@/services/storage/indexedDB";

export async function resetIndexedDB(): Promise<void> {
  closeDB();
  Object.defineProperty(globalThis, "indexedDB", {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
  await initStorage();
}

export function makeNav(pageCount: number, pageNum = 1): ApiNav {
  return {
    page_count: pageCount,
    page_num: pageNum,
    page_size: 100,
    record_count: 0,
    nav_num: 1,
  };
}

export function stubJsonFetch(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: "success", data, errors: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function fetchUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call][0]));
}

export const paginationSettings: PaginationHashSettings = {
  fontFamily: "PT Sans",
  fontSize: 20,
  lineHeight: 1.3,
  fontFamilyCs: "Triodion",
  fontSizeCs: 22,
  lineHeightCs: 1.25,
  isTextAlignJustified: true,
  isTextWordsBreak: true,
  isTextPagePadding: true,
  isTextBold: false,
};

export function saintDetail(id: number, name = `Saint ${id}`): SaintDetailApiElement {
  return {
    id,
    name,
    sort: 0,
    type: "saint",
    text: "",
    picture: "",
    prayers_id: null,
    akathist_id: [],
    canon_id: [],
    minea_id: [],
    hagiography_id: [],
    memo_days: [],
    modified_ts: 0,
  };
}

export function calendarDay(code: string): CalendarDayApiElement {
  return {
    id: Number(code) || 1,
    code,
    text: null,
    picture: "",
    picture_2x: "",
    picture_3x: "",
    picture_desc: "",
    prayers: {
      text: "",
      picture: "",
      picture_2x: "",
      picture_3x: "",
      picture_desc: "",
      items: [],
      taks: [],
    },
    parabel: "",
    synaxarion: null,
    readings: [],
    readings_text: "",
    saints: [],
    instructions: "",
    date_ts: 0,
  };
}

export function prayerElement(id: number, parents: number[] = []): PrayerApiElement {
  return {
    id,
    name: `Prayer ${id}`,
    parent: parents[0] ?? null,
    parents,
    lang: ["ru"],
    sort: 0,
  };
}

export function prayerSection(id: number, parent: number | null = null): PrayerApiSection {
  return {
    id,
    name: `Section ${id}`,
    parent,
    sort: 0,
    book_root: false,
    compose: false,
  };
}

export function prayerText(id: number): PrayerTextApiResponse {
  return {
    id,
    name: `Prayer ${id}`,
    parent: null,
    text: "",
    text_cs: "",
    text_cs_cf: "",
    text_ru: "text",
    modified_ts: 0,
  };
}

export function prayerDetail(
  id: number,
  moduleId: PrayerDownloadModuleId,
): ValaamDB["prayer-details"]["value"] {
  return { ...prayerText(id), moduleId };
}

export function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
}
