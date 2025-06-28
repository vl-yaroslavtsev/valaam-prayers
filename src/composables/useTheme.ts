import { ref, onMounted } from 'vue'
import { f7, f7ready } from 'framework7-vue'
import { device } from '@/js/device'
import { useEventListener } from './useEventListener'
export type Theme = 'light' | 'dark' | 'auto'

const currentTheme = ref<Theme>('light')
const isDarkMode = ref<boolean >(false)
const isF7Ready = ref<boolean>(false)

export function useTheme() {
  // Инициализация темы из localStorage
  const initTheme = () => {
    const theme = (localStorage.getItem('app-theme') as Theme) || 'auto';
    setTheme(theme);
    useEventListener(mediaQuery, 'change', handleMediaQueryChange as EventListener);
  }

  // Установка темы
  const setTheme = async (theme: Theme) => {
    currentTheme.value = theme
    localStorage.setItem('app-theme', theme)
    
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
 
  const handleMediaQueryChange = (e: MediaQueryListEvent) => {
    if (currentTheme.value === 'auto') {
      applyTheme(e.matches)
    }
  }

  onMounted(() => {
    // Инициализируем тему сразу
    // initTheme()
    // setupSystemThemeListener()
    
    // Отмечаем, что F7 готов
    f7ready(() => {
      isF7Ready.value = true
    })
  })

  return {
    initTheme,
    currentTheme,
    isDarkMode,
    setTheme,
    toggleTheme
  }
}