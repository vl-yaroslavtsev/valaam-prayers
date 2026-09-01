import { openDB, DBSchema, IDBPDatabase } from 'idb';
import defaultFavorites from './data/defaultFavorites.json';
import type { Language } from '@/types/common';
import type { PaginationCacheItemHeader } from './PaginationCacheStorage';
import type { IconBlobRecord } from './IconBlobStorage';
import type { CalendarDayApiElement } from '@/services/api/DaysApi';
import type { SaintDetailApiElement } from '@/services/api/SaintsApi';
import type { DownloadModuleId, ModuleDownloadState } from '@/services/download/types';

/**
 * Схема базы данных
 */
interface ValaamDB extends DBSchema {
  'prayers-index': {
    key: number;
    value: {
      id: number;
      name: string;
      parent: number | null;
      parents: number[];
      lang: Language[];
      sort: number;
    };
    indexes: {
      'by-parent': number;
    };
  };
  'prayer-sections': {
    key: number;
    value: {
      id: number;
      name: string;
      parent: number | null;
      sort: number;
      book_root: boolean;
      compose: boolean;
    };
    indexes: {
      'by-parent': number;
    };
  };
  favorites: {
    key: number;
    value: {
      id: number;
      type: 'prayers' | 'books' | 'saints' | 'thoughts';
      sort: number;
    };
    indexes: {
      'by-type': string;
      'by-sort': number;
    };
  };
  'saints-index': {
    key: number;
    value: {
      id: number;
      name: string;
    };
  };
  // Наполняется только DownloadManager'ом (офлайн-загрузка "Святые"), хранит форму ответа API как есть
  'saint-details': {
    key: number;
    value: SaintDetailApiElement;
  };
  'thoughts-index': {
    key: string;
    value: {
      id: string;
      name: string;
    };
  };
  'thought-details': {
    key: string;
    value: {
      id: string;
      name: string;
      text: string;
      author?: string;
      date?: string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: Date;
    };
  };
  'prayer-details': {
    key: number;
    value: {
      id: number;
      name: string;
      parent: number | null;
      text: string;
      text_cs: string;
      text_cs_cf: string;
      text_ru: string;
      modified_ts?: number;
    };
  };
  'reading-history': {
    key: number;
    value: {
      id: number;
      progress: number;
      pages: number;
      type: 'prayers' | 'books' | 'saints';
      lastReadAt: Date;
    };
    indexes: {
      'by-last-read': Date;
    };
  };
  'pagination-cache': {
    key: string;
    value: {
      id: string;
      language: Language | 'default';
      hash: string;
      pages: string[];
      headers: PaginationCacheItemHeader[];
      accessedAt: Date;
      modifiedTs?: number;
    };
    indexes: {
      'by-accessed': Date;
    };
  };
  bookmarks: {
    key: string;
    value: {
      id: string;
      itemId: number;
      progress: number;
      name: string;
      createdAt: Date;
    };
    indexes: {
      'by-item': number;
    };
  };
  // Дни календаря, скачанные для офлайна. Наполняется только DownloadManager'ом
  'calendar-days': {
    key: string;
    value: CalendarDayApiElement;
  };
  // Файлы иконок календаря, ключ - абсолютный URL
  'calendar-icons': {
    key: string;
    value: IconBlobRecord;
  };
  // Файлы иконок святых, ключ - абсолютный URL
  'saint-icons': {
    key: string;
    value: IconBlobRecord;
  };
  // Персистентный прогресс офлайн-загрузок (для докачки после потери сети/перезапуска)
  'download-progress': {
    key: DownloadModuleId;
    value: ModuleDownloadState;
  };
}

const DB_NAME: string = 'valaam-prayers';
const DB_VERSION: number = 5;

let db: IDBPDatabase<ValaamDB> | null = null;
let initPromise: Promise<void> | null = null;

async function initIndexedDB() {
  db = await openDB<ValaamDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 4) {
        const storesToRecreate = [
          'prayers-index',
          'prayer-sections',
          'prayer-details',
          'saints-index',
          'saint-details',
          'favorites',
          'reading-history',
          'bookmarks',
        ] as const;
        for (const name of storesToRecreate) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        }
      }

      // Создаем хранилище молитв
      if (!db.objectStoreNames.contains('prayers-index')) {
        const prayersStore = db.createObjectStore('prayers-index', {
          keyPath: 'id'
        });
        prayersStore.createIndex('by-parent', 'parent');
      }

      // Создаем хранилище секций
      if (!db.objectStoreNames.contains('prayer-sections')) {
        const sectionsStore = db.createObjectStore('prayer-sections', {
          keyPath: 'id'
        });
        sectionsStore.createIndex('by-parent', 'parent');
      }

      // Создаем хранилище избранного
      if (!db.objectStoreNames.contains('favorites')) {
        const favoritesStore = db.createObjectStore('favorites', {
          keyPath: 'id'
        });
        favoritesStore.createIndex('by-type', 'type');
        favoritesStore.createIndex('by-sort', 'sort');

        defaultFavorites.forEach((favorite) => {
          favoritesStore.put(favorite as ValaamDB['favorites']['value']);
        });
      }

      // Создаем хранилище метаданных
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', {
          keyPath: 'key'
        });
      }

      // Создаем хранилище текстов молитв (отдельно для оптимизации)
      if (!db.objectStoreNames.contains('prayer-details')) {
        db.createObjectStore('prayer-details', {
          keyPath: 'id'
        });
      }

      // Создаем хранилище индекса святых
      if (!db.objectStoreNames.contains('saints-index')) {
        db.createObjectStore('saints-index', {
          keyPath: 'id'
        });
      }

      // Создаем хранилище полных данных святых
      if (!db.objectStoreNames.contains('saint-details')) {
        db.createObjectStore('saint-details', {
          keyPath: 'id'
        });
      }

      // Создаем хранилище индекса размышлений
      if (!db.objectStoreNames.contains('thoughts-index')) {
        db.createObjectStore('thoughts-index', {
          keyPath: 'id'
        });
      }

      // Создаем хранилище полных данных размышлений
      if (!db.objectStoreNames.contains('thought-details')) {
        db.createObjectStore('thought-details', {
          keyPath: 'id'
        });
      }

       // Создаем хранилище истории чтения
       if (!db.objectStoreNames.contains('reading-history')) {
        const historyStore = db.createObjectStore('reading-history', {
          keyPath: 'id'
        });
        historyStore.createIndex('by-last-read', 'lastReadAt');
      }

      // Создаем хранилище кэша пагинации
      if (!db.objectStoreNames.contains('pagination-cache')) {
        const cacheStore = db.createObjectStore('pagination-cache', {
          keyPath: 'id'
        });
        cacheStore.createIndex('by-accessed', 'accessedAt');
      }

      // Создаем хранилище закладок
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bookmarksStore = db.createObjectStore('bookmarks', {
          keyPath: 'id'
        });
        bookmarksStore.createIndex('by-item', 'itemId');
      }

      // Создаем хранилище дней календаря (офлайн-загрузка)
      if (!db.objectStoreNames.contains('calendar-days')) {
        db.createObjectStore('calendar-days', {
          keyPath: 'code'
        });
      }

      // Создаем хранилище файлов иконок календаря (офлайн-загрузка)
      if (!db.objectStoreNames.contains('calendar-icons')) {
        db.createObjectStore('calendar-icons', {
          keyPath: 'url'
        });
      }

      // Создаем хранилище файлов иконок святых (офлайн-загрузка)
      if (!db.objectStoreNames.contains('saint-icons')) {
        db.createObjectStore('saint-icons', {
          keyPath: 'url'
        });
      }

      // Создаем хранилище прогресса офлайн-загрузок
      if (!db.objectStoreNames.contains('download-progress')) {
        db.createObjectStore('download-progress', {
          keyPath: 'moduleId'
        });
      }
    },
    blocked() {
    },
    blocking() {  // versionchange event
      if (!document.hasFocus()) {
        // Reloading will close the database, and also reload with the new JavaScript
        // and database definitions.
        location.reload();
      } else {
        // If the document has focus, it can be too disruptive to reload the page.
        // Maybe ask the user to do it manually:
        throw new Error("База данных устарела. Пожалуйста, обновите страницу");
      }
    },
    terminated () {
    }
  });
}



async function initDB() {
  if (db) {
    return;
  }
  
  if (!initPromise) {
    initPromise = initIndexedDB();
  }

  await initPromise;
}

/**
 * Получить базу данных
 */
function getDB(): IDBPDatabase<ValaamDB> {
  if (!db) {
    throw new Error('Need to initialize database first');
  }

  return db;
}

/**
 * Закрыть соединение с базой данных
 */
function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}


export { initDB, getDB, closeDB }

// Экспортируем тип схемы для использования в других модулях
export type { ValaamDB }; 