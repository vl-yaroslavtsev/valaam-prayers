import { BaseStorage } from "./BaseStorage";
import type { ValaamDB } from "./indexedDB";

/**
 * Запись хранилища иконок: ключ - абсолютный URL иконки, значение - сам файл (Blob)
 */
export interface IconBlobRecord {
  url: string;
  blob: Blob;
  size: number;
  downloadedAt: Date;
}

export type IconStoreName = "calendar-icons" | "saint-icons";

/**
 * Хранилище скачанных файлов иконок (иконки календаря / иконки святых).
 * Используется двумя синглтонами - по одному на каждый стор.
 */
export class IconBlobStorage<T extends IconStoreName> extends BaseStorage<T> {
  constructor(name: T) {
    super(name);
  }

  async putIcon(url: string, blob: Blob): Promise<void> {
    await this.put({
      url,
      blob,
      size: blob.size,
      downloadedAt: new Date(),
    } as ValaamDB[T]["value"]);
  }

  async hasIcon(url: string): Promise<boolean> {
    const item = await this.get(url as ValaamDB[T]["key"]);
    return item != null;
  }
}
