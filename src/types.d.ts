// Глобальные типы без необходимости импорта
declare global {
  interface Window {
    // Расширения window уже есть в device/types.ts
  }
  
  
  // Утилитарные типы
  type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
  }[keyof T];
}

export {}; // Делает файл модулем
