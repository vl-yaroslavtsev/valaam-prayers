const SEPARATOR = " * ";

/**
 * Путь результата для строки типа: " * Раздел * Подраздел".
 * Если сегментов больше двух, середина заменяется на «…»: конец пути важнее,
 * он отвечает на вопрос «где именно». Пустой путь даёт пустую строку.
 */
export function formatSearchPath(path: readonly string[]): string {
  if (path.length === 0) return "";
  const shown = path.length > 2 ? [path[0], "…", path[path.length - 1]] : path;
  return SEPARATOR + shown.join(SEPARATOR);
}
