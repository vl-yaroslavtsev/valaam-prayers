/**
 * Идентификаторы модулей офлайн-скачивания (7 типов данных)
 */
export type DownloadModuleId =
  | 'calendar'
  | 'calendarIcons'
  | 'molitvoslov'
  | 'spiritualLiterature'
  | 'liturgicalBooks'
  | 'saints'
  | 'saintIcons';

/** Модули, которые пишут тексты в prayer-details */
export type PrayerDownloadModuleId = Extract<
  DownloadModuleId,
  'molitvoslov' | 'spiritualLiterature' | 'liturgicalBooks'
>;

export const ALL_MODULE_IDS: DownloadModuleId[] = [
  'calendar',
  'calendarIcons',
  'molitvoslov',
  'spiritualLiterature',
  'liturgicalBooks',
  'saints',
  'saintIcons',
];

export type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

/**
 * Ключ, под которым время последней успешной синхронизации модуля хранится
 * в MetadataStorage (getLastSyncTime/setLastSyncTime), например "download_calendar".
 */
export function downloadSyncKey(moduleId: DownloadModuleId): string {
  return `download_${moduleId}`;
}

/**
 * Публичное состояние прогресса модуля (то, что видит внешний код/будущий UI)
 */
export interface DownloadProgress {
  moduleId: DownloadModuleId;
  status: DownloadStatus;
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
  updatedAt: number;
}

/**
 * Состояние постраничной загрузки одного списка
 */
export interface PagedFetchState {
  /** Номер последней успешно загруженной страницы (0 - ничего не загружено) */
  currentPage: number;
  totalPages: number | null;
}

/**
 * Состояние загрузки одного раздела молитв (для модулей на основе разделов)
 */
export interface SectionFetchState extends PagedFetchState {
  sectionId: number;
}

/**
 * Персистентное состояние загрузки модуля — хранится в IndexedDB (download-progress)
 * для докачки после потери сети / перезапуска приложения.
 */
export interface ModuleDownloadState {
  moduleId: DownloadModuleId;
  status: DownloadStatus;
  totalBytes: number;
  downloadedBytes: number;
  error?: string;
  updatedAt: number;

  /** Для одно-секционных списковых модулей (календарь, святые, богослужебные книги, духовная литература) */
  listState?: PagedFetchState;

  /** Для модулей на основе нескольких разделов молитв (молитвослов) */
  sectionStates?: SectionFetchState[];
  currentSectionIndex?: number;

  /** Для модулей-иконок: фаза A - постраничный сбор списка URL */
  iconListState?: PagedFetchState;
  iconListComplete?: boolean;
  /** Для модулей-иконок: фаза B - очередь абсолютных URL, которые ещё нужно скачать */
  pendingIconUrls?: string[];
  totalIconUrls?: number;
}

/**
 * Контекст, передаваемый модулю на время выполнения download()
 */
export interface DownloadContext {
  signal: AbortSignal;
  /** Если задан - используется как modified_since (инкрементальное автообновление) */
  since?: Date;
  /** Изменяемое состояние загрузки (мутируется напрямую, персистентность на стороне DownloadManager) */
  state: ModuleDownloadState;
  /** Вызывается на каждый полученный чанк байт (для прогресса) */
  onBytes: (bytes: number) => void;
  /** Вызывается на границах страниц/иконок для сохранения возможности докачки */
  checkpoint: (patch: Partial<ModuleDownloadState>) => Promise<void>;
}

/**
 * Описание одного модуля офлайн-скачивания
 */
export interface DownloadModule {
  id: DownloadModuleId;
  /** Размер данных к скачиванию в байтах (для показа "нужно скачать X МБ") */
  getSize: (since?: Date) => Promise<number>;
  /** Скачивает (или докачивает, если state уже содержит прогресс) данные модуля */
  download: (ctx: DownloadContext) => Promise<void>;
  /** Удаляет все скачанные данные модуля из IndexedDB */
  remove: () => Promise<void>;
}
