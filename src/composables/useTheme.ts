import { ref, computed } from 'vue'
import { f7, f7ready } from 'framework7-vue'
import { device } from '@/js/device'
import { useEventListener } from '@/composables/useEventListener'
import { useSettingsStore } from '@/stores/settings'

type Theme = 'light' | 'dark' | 'auto'

const isF7Ready = ref<boolean>(false)

export function useTheme() {
  const settingsStore = useSettingsStore()
  
  // Используем настройки из store
  const currentTheme = computed(() => settingsStore.appTheme)
  const isDarkMode = ref<boolean>(false)

  // Инициализация темы из settings store
  const initTheme = () => {
    setTheme(currentTheme.value)
    useEventListener(mediaQuery, 'change', handleMediaQueryChange as EventListener)
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
    isDarkMode.value = dark
    
    // Framework7 тема
    const setF7Theme = () => {
      if (f7 && f7.setDarkMode) {
        f7.setDarkMode(dark)
      }
    }
    
    if (isF7Ready.value) {
      setF7Theme()
    } else {
      f7ready(() => {
        setF7Theme()
      })
    }
    
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

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  // Обработчик изменения системной темы
  const handleMediaQueryChange = async () => {
    if (currentTheme.value === 'auto') {
      const shouldBeDark = mediaQuery.matches
      applyTheme(shouldBeDark)
    }
  }

  // Отмечаем, что F7 готов
  f7ready(() => {
    isF7Ready.value = true
  })

  return {
    currentTheme,
    isDarkMode,
    initTheme,
    setTheme,
    toggleTheme,
  }
}