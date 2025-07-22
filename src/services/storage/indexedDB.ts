import { openDB, DBSchema, IDBPDatabase } from 'idb';
import defaultFavorites from './data/defaultFavorites.json';
import type { Language } from '@/types/common';

/**
 * Схема базы данных
 */
interface ValaamDB extends DBSchema {
  'prayers-index': {
    key: string;
    value: {
      id: string;
      name: string;
      parent: string;
      parents: string[];
      lang: Language[];
      sort: number;
    };
    indexes: {
      'by-parent': string;
    };
  };
  'prayer-sections': {
    key: string;
    value: {
      id: string;
      name: string;
      parent: string;
      sort: number;
      book_root: boolean;
    };
    indexes: {
      'by-parent': string;
    };
  };
  favorites: {
    key: string;
    value: {
      id: string;
      type: 'prayers' | 'books' | 'saints' | 'thoughts';
      sort: number;
    };
    indexes: {
      'by-type': string;
      'by-sort': number;
    };
  };
  'saints-index': {
    key: string;
    value: {
      id: string;
      name: string;
    };
  };
  'saint-details': {
    key: string;
    value: {
      id: string;
      name: string;
      dates: string[];
      life: string;
      tropars?: string[];
      canons?: string[];
      akathists?: string[];
    };
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
    key: string;
    value: {
      id: string;
      name: string;
      parent: string;
      text: string;
      text_cs: string;
      text_cs_cf: string;
      text_ru: string;
    };
  };
  'reading-history': {
    key: string;
    value: {
      id: string;
      progress: number;
      pages: number;
      type: 'prayers' | 'books' | 'saints';
      lastReadAt: Date;
    };
    indexes: {
      'by-last-read': Date;
    };
  };
}

const DB_NAME: string = 'valaam-prayers';
const DB_VERSION: number = 1;

let db: IDBPDatabase<ValaamDB> | null = null;
let initPromise: Promise<void> | null = null;

async function initIndexedDB() {
  db = await openDB<ValaamDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
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