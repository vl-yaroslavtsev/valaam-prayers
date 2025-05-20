/**
 * JavaScript API для работы с календарем Android
 */
(function() {
  // Константы
  const TIMEOUT_MS = 10000; // Таймаут операций - 10 секунд

  // Объект для колбэков статуса разрешений
  const permissionCallbacks = {
      granted: [],
      denied: []
  };
  
  // Объект для хранения колбэков операций с календарем
  const calendarCallbacks = {
      addEvent: {},
      deleteEvent: {}
  };
  
  // Глобальные обработчики события изменения статуса разрешений
  window.onCalendarPermissionGranted = function() {
      permissionCallbacks.granted.forEach(callback => callback());
      permissionCallbacks.granted = [];
  };
  
  window.onCalendarPermissionDenied = function() {
      permissionCallbacks.denied.forEach(callback => callback());
      permissionCallbacks.denied = [];
  };
  
  // Глобальные обработчики результатов операций с календарем
  window.onCalendarEventAdded = function(resultJson) {
      try {
          const result = JSON.parse(resultJson);
          const callback = calendarCallbacks.addEvent[result.id];
          if (callback) {
              callback(result);
              delete calendarCallbacks.addEvent[result.id];
          }
      } catch (error) {
          console.error('Ошибка при обработке результата добавления события:', error);
      }
  };
  
  window.onCalendarEventDeleted = function(resultJson) {
      try {
          const result = JSON.parse(resultJson);
          const callback = calendarCallbacks.deleteEvent[result.id];
          if (callback) {
              callback(result);
              delete calendarCallbacks.deleteEvent[result.id];
          }
      } catch (error) {
          console.error('Ошибка при обработке результата удаления события:', error);
      }
  };
  
  // Функция для создания таймаута операции
  function createTimeout(ms, message) {
      return new Promise((_, reject) => {
          setTimeout(() => reject(new Error(message || 'Операция превысила время ожидания')), ms);
      });
  }
  
  // API для работы с календарем
  window.CalendarAPI = {
      /**
       * Проверяет наличие разрешений на работу с календарем
       * @returns {Promise<boolean>} Промис, который разрешается в true, если разрешения есть, иначе в false
       */
      checkCalendarPermissions: function() {
          return Promise.race([
              new Promise((resolve, reject) => {
                  try {
                      const result = JSON.parse(window.CalendarBridge.hasCalendarPermissions());
                      if (result.success) {
                          resolve(result.hasPermissions);
                      } else {
                          reject(new Error(result.error || 'Ошибка при проверке разрешений'));
                      }
                  } catch (error) {
                      reject(error);
                  }
              }),
              createTimeout(TIMEOUT_MS, 'Время проверки разрешений истекло')
          ]);
      },
      
      /**
       * Запрашивает разрешения на работу с календарем, если их нет
       * @returns {Promise<boolean>} Промис, который разрешается в true, если разрешения получены
       */
      requestCalendarPermissions: function() {
          return new Promise((resolve, reject) => {
              this.checkCalendarPermissions().then(hasPermissions => {
                  if (hasPermissions) {
                      // Разрешения уже есть
                      resolve(true);
                  } else {
                      // Создаем таймаут для ожидания ответа пользователя
                      const timeoutId = setTimeout(() => {
                          // Удаляем неиспользованные колбэки
                          permissionCallbacks.granted = permissionCallbacks.granted.filter(cb => cb !== onGranted);
                          permissionCallbacks.denied = permissionCallbacks.denied.filter(cb => cb !== onDenied);
                          reject(new Error('Время ожидания ответа пользователя истекло'));
                      }, TIMEOUT_MS);
                      
                      // Функции для обработки ответа
                      const onGranted = () => {
                          clearTimeout(timeoutId);
                          resolve(true);
                      };
                      
                      const onDenied = () => {
                          clearTimeout(timeoutId);
                          resolve(false);
                      };
                      
                      // Регистрируем коллбэки
                      permissionCallbacks.granted.push(onGranted);
                      permissionCallbacks.denied.push(onDenied);
                      
                      // Вызываем метод для запроса разрешений через Android Bridge
                      try {
                          if (window.CalendarBridge && window.CalendarBridge.requestCalendarPermissions) {
                              window.CalendarBridge.requestCalendarPermissions();
                          } else {
                              clearTimeout(timeoutId);
                              resolve(false);
                          }
                      } catch (error) {
                          clearTimeout(timeoutId);
                          reject(error);
                      }
                  }
              }).catch(reject);
          });
      },
      
      /**
       * Добавляет событие в календарь
       * @param {Object} event Объект события
       * @returns {Promise<Object>} Промис с результатом операции
       */
      addEventToCalendar: function(event) {
          return new Promise((resolve, reject) => {
              try {
                  // Валидация входных данных
                  if (!event || typeof event !== 'object') {
                      reject(new Error('Некорректные данные события'));
                      return;
                  }
                  
                  // Проверяем обязательные поля
                  const requiredFields = ['id', 'title', 'date'];
                  for (const field of requiredFields) {
                      if (!event[field]) {
                          reject(new Error(`Отсутствует обязательное поле: ${field}`));
                          return;
                      }
                  }
                  
                  // Создаем таймаут для операции
                  const timeoutId = setTimeout(() => {
                      delete calendarCallbacks.addEvent[event.id];
                      reject(new Error('Время добавления события истекло'));
                  }, TIMEOUT_MS);
                  
                  // Регистрируем колбэк для результата
                  calendarCallbacks.addEvent[event.id] = (result) => {
                      clearTimeout(timeoutId);
                      if (result.success) {
                          resolve(result);
                      } else {
                          reject(new Error(result.error || 'Ошибка при добавлении события'));
                      }
                  };
                  
                  // Запускаем асинхронную операцию
                  window.CalendarBridge.addEventToCalendarAsync(JSON.stringify(event));
                  
              } catch (error) {
                  reject(error);
              }
          });
      },
      
      /**
       * Удаляет событие из календаря
       * @param {string} eventId ID события
       * @returns {Promise<Object>} Промис с результатом операции
       */
      deleteEvent: function(eventId) {
          return Promise.race([
              new Promise((resolve, reject) => {
                  try {
                      // Валидация входных данных
                      if (!eventId) {
                          reject(new Error('ID события не может быть пустым'));
                          return;
                      }
                      
                      // Создаем таймаут для операции
                      const timeoutId = setTimeout(() => {
                          delete calendarCallbacks.deleteEvent[eventId];
                          reject(new Error('Время удаления события истекло'));
                      }, TIMEOUT_MS);
                      
                      // Регистрируем колбэк для результата
                      calendarCallbacks.deleteEvent[eventId] = (result) => {
                          clearTimeout(timeoutId);
                          if (result.success) {
                              resolve(result);
                          } else {
                              reject(new Error(result.error || 'Ошибка при удалении события'));
                          }
                      };
                      
                      // Запускаем асинхронную операцию
                      window.CalendarBridge.deleteEventAsync(eventId);
                      
                  } catch (error) {
                      reject(error);
                  }
              }),
              createTimeout(TIMEOUT_MS, 'Время удаления события истекло')
          ]);
      },
      
      /**
       * Проверяет доступность календаря и разрешений
       * @returns {Promise<boolean>} Промис, который разрешается в true, если календарь доступен
       */
      isCalendarAvailable: function() {
          return new Promise((resolve) => {
              this.checkCalendarPermissions()
                  .then(hasPermissions => {
                      if (hasPermissions) {
                          resolve(true);
                      } else {
                          resolve(false);
                      }
                  })
                  .catch(() => {
                      resolve(false);
                  });
          });
      }
  };
})();

/**
* Пример использования API:

// Асинхронная работа с календарем
async function workWithCalendar() {
    try {
        // Проверяем разрешения
        const hasPermissions = await CalendarAPI.checkCalendarPermissions();
        console.log("Есть разрешения на календарь:", hasPermissions);
        
        let permissionsGranted = hasPermissions;
        
        if (!hasPermissions) {
            // Запрашиваем разрешения, если их нет
            permissionsGranted = await CalendarAPI.requestCalendarPermissions();
        }
        
        if (permissionsGranted) {
            console.log("Разрешения получены, можно работать с календарем");
            
            // Пример добавления события
            const event = {
                id: "event_" + Date.now(),
                title: "Важная встреча",
                description: "Обсуждение проекта",
                date: new Date(Date.now() + 24*60*60*1000).toISOString().substring(0, 19),
                url: "https://example.com/meeting",
                alarmDates: [
                    new Date(Date.now() + 23*60*60*1000).toISOString().substring(0, 19)
                ]
            };
            
            try {
                const result = await CalendarAPI.addEventToCalendar(event);
                console.log("Событие добавлено:", result);
            } catch (error) {
                console.error("Ошибка при добавлении события:", error);
            }
            
            // Через некоторое время можно удалить событие
            // const deleteResult = await CalendarAPI.deleteEvent(event.id);
            // console.log("Событие удалено:", deleteResult);
        } else {
            console.log("Разрешения не получены, работа с календарем невозможна");
        }
    } catch (error) {
        console.error("Ошибка при работе с календарем:", error);
    }
}

// Быстрая проверка доступности календаря
CalendarAPI.isCalendarAvailable().then(available => {
    if (available) {
        console.log("Календарь доступен и готов к работе");
    } else {
        console.log("Календарь недоступен, нужно запросить разрешения");
    }
});
*/