import { ref, computed, onMounted } from 'vue'
import { f7, f7ready } from 'framework7-vue'
import { device } from '@/js/device'
import { useEventListener } from '@/composables/useEventListener'
import { useSettingsStore } from '@/stores/settings'

type Theme = 'light' | 'dark' | 'auto'

// Создаем глобальное состояние для темы
const isDarkMode = ref<boolean>(false)
let mediaQuery: MediaQueryList | null = null
let isInitialized = false

export function useTheme() {
  const settingsStore = useSettingsStore()
  
  // Используем настройки из store
  const currentTheme = computed(() => settingsStore.appTheme)

  // Инициализация темы из settings store
  const initTheme = () => {
    if (isInitialized) return;

    console.log("initTheme", currentTheme.value);
    setTheme(currentTheme.value)
    
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    useEventListener(mediaQuery, 'change', handleMediaQueryChange as EventListener)
    
    isInitialized = true
  }

  // Установка темы
  const setTheme = async (theme: Theme) => {
    settingsStore.setAppTheme(theme)
    
    let shouldBeDark = false  
    
    if (theme === 'auto') {
      // Определяем тему системы
      const deviceTheme = await device.getTheme()
      shouldBeDark = deviceTheme === 'dark'
    } else {
      shouldBeDark = theme === 'dark'
    }
    
    applyTheme(shouldBeDark)
  }

  // Применение темы
  const applyTheme = (dark: boolean) => {
    console.log("applyTheme", dark);
    isDarkMode.value = dark
    
    f7.setDarkMode(dark);
    
    // Настройки для мобильных устройств
    device.setStatusBarTextColor('light')
    
    // if (dark) {
    //   device.setStatusBarColor('#1f1b1a')
    //   device.setNavigationBarColor('#1f1b1a')
    // } else {
    //   device.setStatusBarColor('#1f1b1a')
    //   device.setNavigationBarColor('#1f1b1a')
    // }
  }

  // Переключение темы
  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  // Обработчик изменения системной темы
  const handleMediaQueryChange = () => {
    if (currentTheme.value === 'auto') {
      const shouldBeDark = mediaQuery?.matches || false
      applyTheme(shouldBeDark)
    }
  }

  return {
    currentTheme,
    isDarkMode,
    initTheme,
    setTheme,
    toggleTheme,
  }
}