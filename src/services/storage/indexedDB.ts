import { openDB, DBSchema, IDBPDatabase } from 'idb';
import defaultFavorites from './data/defaultFavorites.json';

/**
 * Схема базы данных
 */
interface ValaamDB extends DBSchema {
  prayers: {
    key: string;
    value: {
      id: string;
      name: string;
      parent: string;
      parents: string[];
      lang: string[];
      sort: number;
      url: string;
    };
  };
  sections: {
    key: string;
    value: {
      id: string;
      name: string;
      parent: string;
      sort: number;
      url: string;
    };
  };
  favorites: {
    key: string;
    value: {
      id: string;
      name: string;
      type: 'prayers' | 'books' | 'saints' | 'thoughts';
      sort: number;
    };
    indexes: {
      'by-type': string;
      'by-sort': number;
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
  'prayer-texts': {
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

async function initIndexedDB() {
  db = await openDB<ValaamDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Создаем хранилище молитв
      if (!db.objectStoreNames.contains('prayers')) {
        const prayersStore = db.createObjectStore('prayers', {
          keyPath: 'id'
        });
      }

      // Создаем хранилище секций
      if (!db.objectStoreNames.contains('sections')) {
        const sectionsStore = db.createObjectStore('sections', {
          keyPath: 'id'
        });
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
      if (!db.objectStoreNames.contains('prayer-texts')) {
        db.createObjectStore('prayer-texts', {
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

  await initIndexedDB();
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