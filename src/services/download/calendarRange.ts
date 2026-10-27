/**
 * Диапазон офлайн-загрузки календаря по церковному году (с 14 января).
 * Дата местная, строки в формате yyyyMMdd.
 *
 * 1–13 января церковный год ещё предыдущий: качаем два года,
 * с 14 января прошлого по 13 января следующего.
 * С 14 января качаем один год вперёд: с 14 января текущего по 13 января следующего.
 */
export function getCalendarDownloadRange(now = new Date()): { fromDate: string; toDate: string } {
  const year = now.getFullYear();
  const startYear = now.getMonth() === 0 && now.getDate() <= 13 ? year - 1 : year;
  return { fromDate: `${startYear}0114`, toDate: `${year + 1}0113` };
}

/**
 * Вырос ли диапазон загрузки с момента последней синхронизации.
 * modified_since не вернёт дни, которых клиент ещё не качал и которые не менялись на сервере,
 * поэтому при росте диапазона обновление надо делать без modified_since.
 * Диапазон на момент последней синхронизации считается той же функцией от её времени.
 */
export function hasCalendarRangeGrown(lastSync: Date, now = new Date()): boolean {
  return getCalendarDownloadRange(now).toDate > getCalendarDownloadRange(lastSync).toDate;
}

/**
 * Граница хранения дней: удаляется всё строго раньше этой даты.
 * Остаются текущий гражданский год и два предыдущих.
 * В 2026 году граница `20240101`.
 */
export function getCalendarRetentionBoundary(now = new Date()): string {
  return `${now.getFullYear() - 2}0101`;
}
