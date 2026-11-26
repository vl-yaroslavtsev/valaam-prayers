import type { ReaderFavoriteConfig, ReaderHistoryConfig } from "@/components/textReader";
import { getPrayerItemKey } from "@/js/itemKey";

export interface PrayerTextReaderConfig {
  rawId: number;
  isSection: boolean;
  itemId: string;
  initialTitle: string;
  itemUrl: string;
  favorite: ReaderFavoriteConfig;
  history: ReaderHistoryConfig;
}

export interface PrayerStoreLookup {
  getItemById(id: number): { name: string; url: string } | undefined;
  getFavoriteType(id: number): "bible" | "books" | "prayers";
  isBook(id: number): boolean;
}

export function resolvePrayerTextReaderConfig(
  params: { elementId?: string; sectionId?: string },
  lookup: PrayerStoreLookup
): PrayerTextReaderConfig {
  const rawId = Number(params.elementId || params.sectionId);
  if (!Number.isFinite(rawId)) {
    throw new Error("Neither elementId nor sectionId provided");
  }

  const item = lookup.getItemById(rawId);

  return {
    rawId,
    isSection: !!params.sectionId,
    itemId: getPrayerItemKey(rawId),
    initialTitle: item?.name || "",
    itemUrl: item?.url || "",
    favorite: { type: lookup.getFavoriteType(rawId) },
    history: { type: lookup.isBook(rawId) ? "books" : "prayers" },
  };
}
