# Модуль обработки текста (text-processing)

Модуль для обработки текста, включающий пагинацию HTML-текста и утилиты для работы с текстом. Поддерживает различные HTML-теги и умное разбиение больших элементов между страницами.

## Возможности

- ✅ Разбиение HTML-текста на страницы с учетом размера контейнера
- ✅ Поддержка HTML-тегов: `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `a`, `blockquote`, `strong`, `em`, `b`, `i`
- ✅ Умное разбиение больших элементов (`p`, `blockquote`, `strong`, `b`, `i`, `em`) между страницами
- ✅ Сохранение заголовков и ссылок целыми (не разбиваются между страницами)
- ✅ Разбиение текста по границам слов
- ✅ Бинарный поиск для оптимального размещения текста
- ✅ TypeScript поддержка

## Установка и использование

### Базовое использование

```typescript
import { paginateText } from '@/text-processing';

const htmlText = `
  <h2>Заголовок</h2>
  <p>Длинный текст, который нужно разбить на страницы...</p>
`;

const container = document.querySelector('.reader-container') as HTMLElement;
const pages = paginateText(htmlText, container);

console.log(`Текст разбит на ${pages.length} страниц`);
pages.forEach((page, index) => {
  console.log(`Страница ${index + 1}:`, page.content);
});
```

### Использование с Vue компонентом

```vue
<template>
  <div class="reader">
    <div v-html="currentPage.content"></div>
    <div class="controls">
      <button @click="prevPage" :disabled="currentIndex === 0">Назад</button>
      <span>{{ currentIndex + 1 }} / {{ pages.length }}</span>
      <button @click="nextPage" :disabled="currentIndex === pages.length - 1">Вперед</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { paginateText, type Slide } from '@/text-processing';

const props = defineProps<{
  text: string;
}>();

const pages = ref<Slide[]>([]);
const currentIndex = ref(0);

const currentPage = computed(() => pages.value[currentIndex.value] || { content: '' });

watchEffect(() => {
  if (props.text) {
    const container = document.querySelector('.reader') as HTMLElement;
    pages.value = paginateText(props.text, container);
    currentIndex.value = 0;
  }
});

const nextPage = () => {
  if (currentIndex.value < pages.value.length - 1) {
    currentIndex.value++;
  }
};

const prevPage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};
</script>
```

## API

### Функции пагинации

#### `paginateText(html: string, container?: HTMLElement): Slide[]`

Основная функция для разбиения HTML-текста на страницы.

**Параметры:**
- `html` - HTML-строка для разбиения на страницы
- `container` - Контейнер для определения размера страницы (опционально)

**Возвращает:** Массив объектов `Slide` с разбитым по страницам контентом.

#### `calculateOptimalPageSize(container: HTMLElement): number`

Вычисляет оптимальный размер страницы для контейнера.

**Параметры:**
- `container` - HTML-элемент контейнера

**Возвращает:** Высота страницы в пикселях.

#### `estimatePageCount(html: string, container?: HTMLElement): number`

Приблизительно оценивает количество страниц для данного HTML-текста.

**Параметры:**
- `html` - HTML-строка для анализа
- `container` - Контейнер для определения размера страницы (опционально)

**Возвращает:** Приблизительное количество страниц.

### Утилиты для работы с текстом

#### `stripHtmlTags(html: string): string`
Удаляет HTML-теги из строки, возвращая только текстовое содержимое.

#### `endsWithLetter(str: string): boolean`
Проверяет, заканчивается ли строка на букву (поддерживает кириллицу и латиницу).

#### `startsWithLetter(str: string): boolean`
Проверяет, начинается ли строка с буквы (поддерживает кириллицу и латиницу).

#### `getLastWord(text: string): string`
Извлекает последнее слово из текста.

#### `moveLastWordBetweenElements(fromElement: HTMLElement, toElement: HTMLElement): boolean`
Переносит последнее слово из одного HTML элемента в начало другого. Работает с сложной DOM структурой, сохраняя теги.

#### `getTextNodes(element: HTMLElement): Text[]`
Получает все текстовые узлы из HTML элемента рекурсивно.

### Интерфейсы

#### Интерфейс `Slide`

```typescript
interface Slide {
  id: number | string;
  content: string;
}
```

## Поддерживаемые HTML-теги

### Не разбиваются между страницами:
- `h1`, `h2`, `h3`, `h4`, `h5`, `h6` - заголовки
- `a` - ссылки

### Могут разбиваться между страницами:
- `p` - параграфы
- `blockquote` - цитаты
- `strong`, `b` - жирный текст
- `em`, `i` - курсивный текст

## Алгоритм работы

1. **Парсинг HTML** - текст разбирается на DOM-элементы
2. **Измерение высоты** - создается временный элемент для измерения размеров
3. **Бинарный поиск** - для текстовых узлов используется бинарный поиск для определения максимального количества символов
4. **Рекурсивное разбиение** - элементы разбиваются рекурсивно с сохранением структуры HTML
5. **Разбиение по словам** - при возможности текст разбивается по границам слов
6. **Сборка страниц** - готовые фрагменты собираются в страницы

## Примеры использования

Смотрите файл `textPaginationExample.ts` для подробных примеров использования, включая:

- Базовое использование
- Работа с реальными DOM-элементами
- Обработка различных HTML-тегов
- Создание простого читателя

## Производительность

- Использует бинарный поиск для оптимального размещения текста
- Минимизирует количество DOM-операций
- Поддерживает виртуальную прокрутку через Swiper
- Автоматически очищает временные элементы

## Ограничения

- Работает только в браузерной среде (требует DOM)
- Размеры измеряются в пикселях
- Не поддерживает сложные CSS-макеты (flexbox, grid)
- Требует фиксированной ширины контейнера 