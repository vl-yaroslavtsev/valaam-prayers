import { ApiClient } from '@/services/api/ApiClient';
import type { ApiNav } from '@/services/api/types';

/**
 * Размер иконки: s — 414px, m — 828px, l — 1245px.
 * Если оригинал меньше запрошенного размера, API отдаёт его как есть.
 */
export type ImageSize = 's' | 'm' | 'l';

export type FastingTypeCode = 'none' | 'day' | 'great' | 'nativity' | 'apostles' | 'dormition';
export type FastingRuleCode = 'none' | 'no_meat' | 'oil' | 'fish' | 'no_oil' | 'dry' | 'no_food';

export interface FastingRule {
  code: FastingRuleCode;
  title: string;
}

export interface FastingInfo {
  type: FastingTypeCode;
  /** «Поста нет», «День постный», «Великий пост» и т.д. (без точки) */
  title: string;
  rules: {
    /** Монастырский устав (по Типикону). Всегда есть */
    monastic: FastingRule | null;
    /** Мирской устав. Пока всегда null: карточку мирского правила не показываем */
    lay: FastingRule | null;
  };
}

export interface ReadingItem {
  /** Id чтения (readings[].id). null: ссылка в данных битая, чтение не открывается */
  id: number | null;
  /** Адрес чтения, например «Лк. 6:17–23» */
  ref: string;
  /** Серый текст перед адресом: «Ев. 8-е», «1-е» */
  prefix: string | null;
  /** Примечание, скобки ставит приложение: «зач. 24» */
  note: string | null;
  /** Знак сноски: «**» (пояснение лежит в notes) */
  footnote: string | null;
}

export interface ReadingsSection {
  /** Служба: «Утреня», «Литургия», «На 6-м часе»… null, если службы в данных нет */
  title: string | null;
  /** Уточнение секции: «Прп.», «Ев. составное», «Апп.» */
  label: string | null;
  items: ReadingItem[];
}

export interface ReadingsSchedule {
  sections: ReadingsSection[];
  /** Примечания под карточкой: HTML абзацев `<p>`, ссылки `/readings/ID` сохранены */
  notes: string | null;
}

export interface DayTak {
  id: number;
  name: string;
}

/** Мысль дня: свой текст и своя картинка */
export interface DayThought {
  /** Подпись картинки. null, если картинки нет; '' если описание пустое */
  title: string | null;
  /** HTML абзацев `<p>`. '' если текста нет */
  text: string;
  picture: string | null;
  picture_2x: string | null;
  picture_3x: string | null;
}

export interface DayReading {
  id: number;
  name: string;
  /** Текст с маркерами стихов `#r#5:22` (русский) и `#c#5:22` (церковнославянский) */
  text: string;
}

/**
 * День календаря: ответ /days/{code} и элемент ответа /days/list
 */
export interface CalendarDayApiElement {
  id: number;
  /** Дата в формате YYYYMMDD */
  code: string;
  /** Икона дня (PREVIEW_PICTURE): 414 / 828 / 1245 */
  picture: string | null;
  picture_2x: string | null;
  picture_3x: string | null;
  /** Описание иконы. null, если иконы нет */
  picture_desc: string | null;
  /** Тропари и молитвы, дательный падеж. id совпадает с id молитвы */
  taks: DayTak[];
  thought: DayThought;
  /** HTML, '' если нет */
  parabel: string;
  synaxarion: string | null;
  readings: DayReading[];
  readings_schedule: ReadingsSchedule;
  /** Седмица, HTML (ссылки сохранены), без точки в конце */
  week: string | null;
  /** Глас 1..8 */
  tone: number | null;
  fasting: FastingInfo;
  /** Блоки -> строки HTML. Строка может начинаться с токена знака праздника */
  saints_blocks: string[][];
  /** HTML, '' если нет */
  instructions: string;
  date_ts: number;
}

/**
 * Элемент ответа /days/icons — два URL иконки на день:
 * сама икона дня (`url`) и иконка молитвы дня (`prayers_url`)
 */
export interface CalendarDayIconApiElement {
  id: number;
  code: string;
  url: string;
  prayers_url: string;
}

/**
 * Маркеры дней для календаря: код дня (YYYYMMDD) -> строка маркеров (`e`, `h`, `g`, `v`, `f`, `w`, `l`, `c`
 * в произвольном порядке) или null, если у дня нет маркеров. Дни, которых нет в карте, в API отсутствуют
 */
export interface CalendarMarkersResponse {
  /** Начало диапазона календаря, unix-секунды */
  min: number;
  /** Конец диапазона календаря, unix-секунды */
  max: number;
  days: Record<string, string | null>;
}

/**
 * Сырой ответ /days/calendar: кроме кодов дней содержит служебные ключи min и max
 */
type CalendarMarkersRawResponse = Record<string, string | number | null>;

const DAY_CODE_REGEXP = /^\d{8}$/;

interface PageFetchOptions {
  since?: Date;
  signal?: AbortSignal;
  onBytes?: (bytes: number) => void;
}

/**
 * API для работы с календарём (дни, иконы дней)
 */
class DaysApi extends ApiClient {
  /**
   * Размер (в байтах) и количество дней за период
   */
  async getDaysCount(
    fromDate: string,
    toDate: string,
    since?: Date
  ): Promise<{ count: number; size: number }> {
    const search = new URLSearchParams({ from_date: fromDate, to_date: toDate });
    if (since) {
      search.set('modified_since', String(Math.floor(since.getTime() / 1000)));
    }
    return this.get<{ count: number; size: number }>(`/days/count?${search.toString()}`);
  }

  /**
   * Одна страница дней за период
   */
  async getDaysPage(
    fromDate: string,
    toDate: string,
    page: number,
    pageSize: number,
    options: PageFetchOptions = {}
  ): Promise<{ items: CalendarDayApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<CalendarDayApiElement>(
      '/days/list',
      { from_date: fromDate, to_date: toDate },
      page,
      pageSize,
      options
    );
  }

  /**
   * День по коду даты (YYYYMMDD)
   */
  async getDayByCode(code: string): Promise<CalendarDayApiElement> {
    return this.get<CalendarDayApiElement>(`/days/${code}`);
  }

  /**
   * Маркеры (раскраска) всех дней календаря и границы диапазона min/max
   */
  async getCalendarMarkers(): Promise<CalendarMarkersResponse> {
    const raw = await this.get<CalendarMarkersRawResponse>('/days/calendar');

    const days: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (DAY_CODE_REGEXP.test(key)) {
        days[key] = typeof value === 'string' ? value : null;
      }
    }

    return { min: Number(raw.min), max: Number(raw.max), days };
  }

  /**
   * Размер (в байтах) и количество иконок дней за период
   */
  async getDaysIconsCount(
    fromDate: string,
    toDate: string,
    imageSize: ImageSize,
    since?: Date
  ): Promise<{ count: number; size: number }> {
    const search = new URLSearchParams({ from_date: fromDate, to_date: toDate, image_size: imageSize });
    if (since) {
      search.set('modified_since', String(Math.floor(since.getTime() / 1000)));
    }
    return this.get<{ count: number; size: number }>(`/days/icons/count?${search.toString()}`);
  }

  /**
   * Одна страница со списком URL иконок дней за период
   */
  async getDaysIconsPage(
    fromDate: string,
    toDate: string,
    imageSize: ImageSize,
    page: number,
    pageSize: number,
    options: PageFetchOptions = {}
  ): Promise<{ items: CalendarDayIconApiElement[]; nav: ApiNav; byteSize: number }> {
    return this.getPage<CalendarDayIconApiElement>(
      '/days/icons',
      { from_date: fromDate, to_date: toDate, image_size: imageSize },
      page,
      pageSize,
      options
    );
  }
}

/**
 * Экземпляр API клиента
 */
export const daysApi = new DaysApi();
