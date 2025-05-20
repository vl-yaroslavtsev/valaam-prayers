package com.example.app

import android.content.AsyncQueryHandler
import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.CalendarContract
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class CalendarBridge(private val context: Context) {
    
    companion object {
        private const val TAG = "CalendarBridge"
        private const val DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"
        private val CALENDAR_PERMISSIONS = arrayOf(
            Manifest.permission.READ_CALENDAR,
            Manifest.permission.WRITE_CALENDAR
        )
        
        // Константы для типов операций
        private const val TOKEN_EVENT_INSERT = 1
        private const val TOKEN_EVENT_DELETE = 2
        private const val TOKEN_REMINDER_INSERT = 3
        private const val TOKEN_CALENDAR_QUERY = 4
        private const val TOKEN_EVENT_QUERY = 5
    }
    
    private val dateFormat = SimpleDateFormat(DATE_FORMAT, Locale.getDefault()).apply {
        timeZone = TimeZone.getDefault()
    }
    
    // Асинхронный обработчик запросов к базе данных календаря
    private inner class CalendarAsyncQueryHandler(cr: ContentResolver) : AsyncQueryHandler(cr) {
        
        var queryResult: Any? = null
        var queryLatch = CountDownLatch(1)
        var insertUri: Uri? = null
        var deleteResult: Int = 0
        var operationId: String? = null
        var webView: WebView? = null
        
        override fun onQueryComplete(token: Int, cookie: Any?, cursor: android.database.Cursor?) {
            when (token) {
                TOKEN_CALENDAR_QUERY -> {
                    try {
                        var calendarId = -1L
                        if (cursor?.moveToFirst() == true) {
                            calendarId = cursor.getLong(0)
                        } else {
                            // Если основной календарь не найден, запросим все видимые календари
                            val secondaryHandler = CalendarAsyncQueryHandler(context.contentResolver)
                            secondaryHandler.queryResult = -1L
                            secondaryHandler.startQuery(
                                TOKEN_CALENDAR_QUERY,
                                null,
                                CalendarContract.Calendars.CONTENT_URI,
                                arrayOf(CalendarContract.Calendars._ID),
                                "${CalendarContract.Calendars.VISIBLE} = 1",
                                null,
                                null
                            )
                            
                            if (secondaryHandler.queryLatch.await(5, TimeUnit.SECONDS)) {
                                calendarId = secondaryHandler.queryResult as? Long ?: -1L
                            }
                        }
                        queryResult = calendarId
                    } finally {
                        cursor?.close()
                        queryLatch.countDown()
                    }
                }
                TOKEN_EVENT_QUERY -> {
                    try {
                        var eventId = -1L
                        if (cursor?.moveToFirst() == true) {
                            eventId = cursor.getLong(0)
                        }
                        queryResult = eventId
                    } finally {
                        cursor?.close()
                        queryLatch.countDown()
                    }
                }
            }
        }
        
        override fun onInsertComplete(token: Int, cookie: Any?, uri: Uri?) {
            insertUri = uri
            when (token) {
                TOKEN_EVENT_INSERT -> {
                    val eventId = uri?.let { ContentUris.parseId(it) } ?: -1L
                    if (eventId != -1L) {
                        // Отправляем результат в JavaScript
                        val result = JSONObject().apply {
                            put("success", true)
                            put("id", operationId)
                            put("eventId", eventId.toString())
                            put("message", "Событие успешно добавлено")
                        }
                        webView?.evaluateJavascript(
                            "window.onCalendarEventAdded(${result.toString()})",
                            null
                        )
                    }
                    queryLatch.countDown()
                }
                TOKEN_REMINDER_INSERT -> {
                    queryLatch.countDown()
                }
            }
        }
        
        override fun onDeleteComplete(token: Int, cookie: Any?, result: Int) {
            deleteResult = result
            when (token) {
                TOKEN_EVENT_DELETE -> {
                    // Отправляем результат в JavaScript
                    val jsonResult = JSONObject().apply {
                        put("success", result > 0)
                        put("id", operationId)
                        put("message", if (result > 0) 
                            "Событие успешно удалено" 
                            else "Не удалось удалить событие")
                    }
                    webView?.evaluateJavascript(
                        "window.onCalendarEventDeleted(${jsonResult.toString()})",
                        null
                    )
                    queryLatch.countDown()
                }
            }
        }
    }
    
    @JavascriptInterface
    fun hasCalendarPermissions(): String {
        try {
            val hasPermissions = CALENDAR_PERMISSIONS.all {
                ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
            }
            
            return JSONObject().apply {
                put("success", true)
                put("hasPermissions", hasPermissions)
                put("message", if (hasPermissions) 
                    "Разрешения на работу с календарем получены" 
                    else "Отсутствуют разрешения на работу с календарем")
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при проверке разрешений: ${e.message}", e)
            return createErrorResponse("Ошибка при проверке разрешений: ${e.message}")
        }
    }
    
    @JavascriptInterface
    fun requestCalendarPermissions(): String {
        try {
            // Проверяем, имеем ли мы разрешения
            val hasPermissions = CALENDAR_PERMISSIONS.all {
                ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
            }
            
            if (hasPermissions) {
                // Если разрешения уже есть, возвращаем успешный результат
                return JSONObject().apply {
                    put("success", true)
                    put("hasPermissions", true)
                    put("message", "Разрешения на работу с календарем уже получены")
                }.toString()
            } else {
                // Если активность не является AppCompatActivity, возвращаем ошибку
                if (context !is AppCompatActivity) {
                    return createErrorResponse("Контекст не является AppCompatActivity, невозможно запросить разрешения")
                }
                
                // Запрашиваем разрешения
                ActivityCompat.requestPermissions(
                    context as AppCompatActivity,
                    CALENDAR_PERMISSIONS,
                    1001 // Используем тот же код, что и в MainActivity
                )
                
                // Возвращаем информацию о том, что запрос был отправлен
                return JSONObject().apply {
                    put("success", true)
                    put("requested", true)
                    put("message", "Запрос на разрешения отправлен, ожидайте ответа пользователя")
                }.toString()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при запросе разрешений: ${e.message}", e)
            return createErrorResponse("Ошибка при запросе разрешений: ${e.message}")
        }
    }
    
    @JavascriptInterface
    fun addEventToCalendarAsync(eventJson: String) {
        // Сначала проверяем наличие разрешений
        val permissionsResult = JSONObject(hasCalendarPermissions())
        if (permissionsResult.getBoolean("success") && !permissionsResult.getBoolean("hasPermissions")) {
            val errorResult = JSONObject().apply {
                put("success", false)
                put("id", JSONObject(eventJson).getString("id"))
                put("error", "Отсутствуют необходимые разрешения для работы с календарем")
            }
            (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                "window.onCalendarEventAdded(${errorResult.toString()})",
                null
            )
            return
        }
        
        try {
            val event = JSONObject(eventJson)
            val id = event.getString("id")
            val title = event.getString("title")
            val description = event.getString("description")
            val dateStr = event.getString("date")
            val url = event.getString("url")
            
            // Парсинг основной даты события
            val eventDate = dateFormat.parse(dateStr)
            val calendarTime = Calendar.getInstance()
            eventDate?.let { calendarTime.time = it }
            
            val startMillis = calendarTime.timeInMillis
            // Устанавливаем продолжительность события в 1 час
            val endMillis = startMillis + 60 * 60 * 1000
            
            // Получаем ID календаря по умолчанию через AsyncQueryHandler
            val calendarId = getDefaultCalendarIdAsync()
            if (calendarId == -1L) {
                val errorResult = JSONObject().apply {
                    put("success", false)
                    put("id", id)
                    put("error", "Не удалось найти календарь по умолчанию")
                }
                (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                    "window.onCalendarEventAdded(${errorResult.toString()})",
                    null
                )
                return
            }
            
            // Создаем событие
            val eventValues = ContentValues().apply {
                put(CalendarContract.Events.CALENDAR_ID, calendarId)
                put(CalendarContract.Events.TITLE, title)
                put(CalendarContract.Events.DESCRIPTION, description)
                put(CalendarContract.Events.DTSTART, startMillis)
                put(CalendarContract.Events.DTEND, endMillis)
                put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
                put(CalendarContract.Events.HAS_ALARM, 1)
                
                // Добавляем URL как описание или хранение данных
                put(CalendarContract.Events.CUSTOM_APP_URI, url)
                // Сохраняем наш ID как свойство события для возможности его удаления позже
                put(CalendarContract.Events.CUSTOM_APP_PACKAGE, id)
            }
            
            // Вставляем событие в календарь асинхронно
            val handler = CalendarAsyncQueryHandler(context.contentResolver).apply {
                operationId = id
                webView = (context as? AppCompatActivity)?.findViewById(R.id.webView)
            }
            handler.startInsert(
                TOKEN_EVENT_INSERT, 
                null, 
                CalendarContract.Events.CONTENT_URI, 
                eventValues
            )
            
            // Добавляем напоминания, если они указаны
            if (event.has("alarmDates") && !event.isNull("alarmDates")) {
                val alarmDates = event.getJSONArray("alarmDates")
                for (i in 0 until alarmDates.length()) {
                    val alarmDateStr = alarmDates.getString(i)
                    addReminderAsync(eventID, alarmDateStr, startMillis)
                }
            } else {
                // Добавляем стандартное напоминание за 30 минут до события
                val reminderValues = ContentValues().apply {
                    put(CalendarContract.Reminders.EVENT_ID, eventID)
                    put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
                    put(CalendarContract.Reminders.MINUTES, 30)
                }
                
                val reminderHandler = CalendarAsyncQueryHandler(context.contentResolver)
                reminderHandler.startInsert(
                    TOKEN_REMINDER_INSERT,
                    null,
                    CalendarContract.Reminders.CONTENT_URI,
                    reminderValues
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при добавлении события: ${e.message}", e)
            val errorResult = JSONObject().apply {
                put("success", false)
                put("id", JSONObject(eventJson).getString("id"))
                put("error", "Ошибка при добавлении события: ${e.message}")
            }
            (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                "window.onCalendarEventAdded(${errorResult.toString()})",
                null
            )
        }
    }
    
    @JavascriptInterface
    fun deleteEventAsync(eventId: String) {
        // Сначала проверяем наличие разрешений
        val permissionsResult = JSONObject(hasCalendarPermissions())
        if (permissionsResult.getBoolean("success") && !permissionsResult.getBoolean("hasPermissions")) {
            val errorResult = JSONObject().apply {
                put("success", false)
                put("id", eventId)
                put("error", "Отсутствуют необходимые разрешения для работы с календарем")
            }
            (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                "window.onCalendarEventDeleted(${errorResult.toString()})",
                null
            )
            return
        }
        
        try {
            // Ищем событие по нашему ID (хранится в CUSTOM_APP_PACKAGE) асинхронно
            val selection = "${CalendarContract.Events.CUSTOM_APP_PACKAGE} = ?"
            val selectionArgs = arrayOf(eventId)
            
            val queryHandler = CalendarAsyncQueryHandler(context.contentResolver).apply {
                operationId = eventId
                webView = (context as? AppCompatActivity)?.findViewById(R.id.webView)
            }
            queryHandler.startQuery(
                TOKEN_EVENT_QUERY,
                null,
                CalendarContract.Events.CONTENT_URI,
                arrayOf(CalendarContract.Events._ID),
                selection,
                selectionArgs,
                null
            )
            
            // Ждем результат выполнения запроса
            if (!queryHandler.queryLatch.await(5, TimeUnit.SECONDS)) {
                val errorResult = JSONObject().apply {
                    put("success", false)
                    put("id", eventId)
                    put("error", "Время ожидания операции истекло")
                }
                (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                    "window.onCalendarEventDeleted(${errorResult.toString()})",
                    null
                )
                return
            }
            
            val systemEventId = queryHandler.queryResult as? Long ?: -1L
            
            if (systemEventId == -1L) {
                val errorResult = JSONObject().apply {
                    put("success", false)
                    put("id", eventId)
                    put("error", "Событие не найдено")
                }
                (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                    "window.onCalendarEventDeleted(${errorResult.toString()})",
                    null
                )
                return
            }
            
            // Удаляем событие асинхронно
            val deleteUri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, systemEventId)
            val deleteHandler = CalendarAsyncQueryHandler(context.contentResolver).apply {
                operationId = eventId
                webView = (context as? AppCompatActivity)?.findViewById(R.id.webView)
            }
            deleteHandler.startDelete(
                TOKEN_EVENT_DELETE,
                null,
                deleteUri,
                null,
                null
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при удалении события: ${e.message}", e)
            val errorResult = JSONObject().apply {
                put("success", false)
                put("id", eventId)
                put("error", "Ошибка при удалении события: ${e.message}")
            }
            (context as? AppCompatActivity)?.findViewById<WebView>(R.id.webView)?.evaluateJavascript(
                "window.onCalendarEventDeleted(${errorResult.toString()})",
                null
            )
        }
    }
    
    private fun addReminderAsync(eventID: Long, alarmDateStr: String, eventTimeMillis: Long) {
        try {
            val alarmDate = dateFormat.parse(alarmDateStr)
            if (alarmDate != null) {
                val alarmTime = Calendar.getInstance()
                alarmTime.time = alarmDate
                val alarmTimeMillis = alarmTime.timeInMillis
                
                // Вычисляем разницу в минутах между временем события и временем напоминания
                val diffMinutes = (eventTimeMillis - alarmTimeMillis) / (60 * 1000)
                
                val reminderValues = ContentValues().apply {
                    put(CalendarContract.Reminders.EVENT_ID, eventID)
                    put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
                    put(CalendarContract.Reminders.MINUTES, diffMinutes)
                }
                
                val handler = CalendarAsyncQueryHandler(context.contentResolver)
                handler.startInsert(
                    TOKEN_REMINDER_INSERT,
                    null,
                    CalendarContract.Reminders.CONTENT_URI,
                    reminderValues
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при добавлении напоминания: ${e.message}", e)
        }
    }
    
    private fun getDefaultCalendarIdAsync(): Long {
        val handler = CalendarAsyncQueryHandler(context.contentResolver)
        
        // Поиск основного календаря
        val projection = arrayOf(CalendarContract.Calendars._ID)
        val selection = "${CalendarContract.Calendars.VISIBLE} = 1 AND ${CalendarContract.Calendars.IS_PRIMARY} = 1"
        
        handler.startQuery(
            TOKEN_CALENDAR_QUERY,
            null,
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            selection,
            null,
            null
        )
        
        // Ждем результат выполнения запроса
        if (handler.queryLatch.await(5, TimeUnit.SECONDS)) {
            return handler.queryResult as? Long ?: -1L
        }
        
        return -1L
    }
    
    private fun createErrorResponse(errorMessage: String): String {
        return JSONObject().apply {
            put("success", false)
            put("error", errorMessage)
        }.toString()
    }
}

/*
Пример использования метода hasCalendarPermissions в JavaScript:

// Проверка разрешений
const permissionResult = JSON.parse(window.CalendarBridge.hasCalendarPermissions());
if (permissionResult.success && permissionResult.hasPermissions) {
    // Разрешения получены, можно работать с календарем
} else {
    // Нужно запросить разрешения
}

// Проверка перед добавлением события
const addEvent = () => {
    if (checkPermissions()) {
        // Код добавления события
        const event = {
            id: "event_123",
            title: "Встреча",
            description: "Важная встреча",
            date: "2023-06-15T14:00:00",
            url: "https://example.com"
        };
        
        const result = window.CalendarBridge.addEventToCalendar(JSON.stringify(event));
        console.log(JSON.parse(result));
    }
};
*/
