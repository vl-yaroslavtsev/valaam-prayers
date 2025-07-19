# useTextSettings Композабл

Композабл для автоматической синхронизации настроек текста из Pinia store с CSS переменными.

## Возможности

- ✅ Автоматическая синхронизация настроек с CSS переменными
- ✅ Реактивное обновление при изменении настроек в store
- ✅ Поддержка всех настроек текста (шрифт, размер, высота строки, выравнивание, переносы, отступы, жирность)
- ✅ Автоматическая очистка наблюдателей при размонтировании компонента
- ✅ Централизованное управление стилями текста

## Использование

### Автоматическая инициализация

Композабл автоматически инициализируется в главном компоненте `App.vue`:

```typescript
import { useTextSettings } from "@/composables/useTextSettings";

const { } = useTextSettings(); // Глобальная инициализация
```

### Использование в компонентах

Просто импортируйте и используйте в любом компоненте:

```typescript
import { useTextSettings } from "@/composables/useTextSettings";

export default {
  setup() {
    const { updateTextCSSVariables } = useTextSettings();
    
    // Принудительное обновление CSS переменных (если нужно)
    updateTextCSSVariables();
  }
}
```

## Поддерживаемые настройки

### Из Settings Store

| Настройка | CSS переменная | Описание |
|-----------|---------------|----------|
| `fontFamily` | `--reading-text-font-family` | Семейство шрифта |
| `fontSize` | `--reading-text-font-size` | Размер шрифта (px) |
| `lineHeight` | `--reading-text-line-height` | Высота строки |
| `isTextAlignJustified` | `--reading-text-align` | Выравнивание текста |
| `isTextWordsBreak` | `--reading-text-hyphens` | Переносы слов |
| `isTextPagePadding` | `--reading-text-page-padding` | Отступы страницы |
| `isTextBold` | `--reading-text-font-weight` | Жирность шрифта |

### Применение в CSS

CSS переменные автоматически применяются к классу `.reading-text`:

```less
.reading-text {
  font-family: var(--reading-text-font-family);
  font-size: var(--reading-text-font-size);
  font-weight: var(--reading-text-font-weight);
  line-height: var(--reading-text-line-height);
  text-align: var(--reading-text-align);
  hyphens: var(--reading-text-hyphens);
}

.text-page {
  padding: var(--reading-text-page-padding);
}
```

## API

### Методы

#### `initTextSettings()`
Инициализирует наблюдатели за изменениями настроек. Вызывается автоматически при `onMounted()`.

#### `cleanupTextSettings()`
Очищает все наблюдатели. Вызывается автоматически при `onUnmounted()`.

#### `updateTextCSSVariables()`
Принудительно обновляет все CSS переменные из текущих значений store.

## Архитектура

### Преимущества данного подхода

1. **Централизованность** - вся логика синхронизации в одном месте
2. **Реактивность** - изменения в store автоматически отражаются в CSS
3. **Производительность** - обновляются только изменившиеся переменные
4. **Чистота кода** - нет прямых манипуляций с DOM в компонентах
5. **Переиспользование** - можно использовать в любом компоненте

### Альтернативные подходы (не рекомендуются)

- ❌ **Inline стили в template** - плохая производительность, сложность поддержки
- ❌ **Манипуляции с `document.head`** - проблемы с SSR, сложность очистки
- ❌ **Прямые вызовы `setCSSVariable` в компонентах** - дублирование кода, нет централизации

## Интеграция с TextSettingsSelector

Компонент `TextSettingsSelector.vue` использует computed properties для двустороннего связывания с store:

```typescript
const isTextAlignJustified = computed({
  get: () => settingsStore.isTextAlignJustified,
  set: (value: boolean) => settingsStore.setIsTextAlignJustified(value)
});
```

При изменении настройки через UI, композабл автоматически обновит соответствующую CSS переменную.

## Поддерживаемые шрифты

| Store значение | CSS значение |
|----------------|--------------|
| `PT Sans` | `"PT Sans", sans-serif` |
| `PT Serif` | `"PT Serif", serif` |
| `Circe` | `"Circe", sans-serif` |
| `Literata` | `"Literata", serif` |
| `Noto Sans` | `"Noto Sans", sans-serif` |
| `Noto Serif` | `"Noto Serif", serif` |
| `Roboto` | `"Roboto", sans-serif` |
| `system` | `system-ui, -apple-system, sans-serif` | 