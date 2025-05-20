import android.Manifest
import android.accounts.AccountManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.CalendarContract
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
// Добавляем импорты для Google Sign-In API
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions

class CalendarManager(private val activity: ComponentActivity) {
    
    companion object {
        private const val TAG = "CalendarManager"
        private const val CALENDAR_NAME = "ValaamReminders"
        private const val CALENDAR_DISPLAY_NAME = "Напоминания Валаам"
    }
    
    // Удаляем GET_ACCOUNTS из списка разрешений
    private val requiredPermissions = arrayOf(
        Manifest.permission.READ_CALENDAR,
        Manifest.permission.WRITE_CALENDAR
    )
    
    // Проверка наличия приложения календаря
    fun hasCalendarApp(): Boolean {
        // Проверяем наличие приложения для просмотра событий календаря
        val viewIntent = Intent(Intent.ACTION_VIEW)
        viewIntent.data = Uri.parse("content://com.android.calendar/events")
        
        // Проверяем наличие приложения для создания событий
        val addIntent = Intent(Intent.ACTION_INSERT)
        addIntent.data = CalendarContract.Events.CONTENT_URI
        
        // Проверяем, есть ли приложения, которые могут обрабатывать эти интенты
        val packageManager = activity.packageManager
        val viewActivities = packageManager.queryIntentActivities(viewIntent, PackageManager.MATCH_DEFAULT_ONLY)
        val addActivities = packageManager.queryIntentActivities(addIntent, PackageManager.MATCH_DEFAULT_ONLY)
        
        // Возвращаем true, если есть хотя бы одно приложение для любого из этих действий
        val hasApp = viewActivities.isNotEmpty() || addActivities.isNotEmpty()
        if (!hasApp) {
            Log.e(TAG, "На устройстве не найдено подходящее приложение календаря")
        }
        return hasApp
    }
    
    // Добавляем accountPickerLauncher для выбора аккаунта
    private val accountPickerLauncher = activity.registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == ComponentActivity.RESULT_OK) {
            val email = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
            if (email != null) {
                // Сохраняем email для последующего использования
                saveGoogleAccount(email)
                val calendarId = createGoogleCalendar(email)
                if (calendarId != null) {
                    Log.d(TAG, "Создан Google календарь с ID: $calendarId")
                    saveCalendarId(calendarId)
                } else {
                    createLocalCalendarFallback()
                }
            } else {
                createLocalCalendarFallback()
            }
        } else {
            createLocalCalendarFallback()
        }
    }
    
    private val permissionLauncher = activity.registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            createCalendar()
        } else {
            Log.e(TAG, "Не все разрешения были предоставлены")
        }
    }
    
    fun setupCalendar() {
        if (hasRequiredPermissions()) {
            createCalendar()
        } else {
            permissionLauncher.launch(requiredPermissions)
        }
    }
    
    private fun hasRequiredPermissions(): Boolean {
        return requiredPermissions.all {
            ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun createCalendar() {
        val googleEmail = getGoogleAccountEmail()
        if (googleEmail != null) {
            val calendarId = createGoogleCalendar(googleEmail)
            if (calendarId != null) {
                Log.d(TAG, "Создан Google календарь с ID: $calendarId")
                // Сохраняем ID календаря для дальнейшего использования
                saveCalendarId(calendarId)
                return
            }
        } else {
            // Если email не удалось получить, запускаем выбор аккаунта
            chooseGoogleAccount()
            return
        }
        
        createLocalCalendarFallback()
    }
    
    private fun createLocalCalendarFallback() {
        // Если не удалось создать Google календарь, создаем локальный
        val localCalendarId = createLocalCalendar()
        if (localCalendarId != null) {
            Log.d(TAG, "Создан локальный календарь с ID: $localCalendarId")
            // Сохраняем ID календаря для дальнейшего использования
            saveCalendarId(localCalendarId)
        } else {
            Log.e(TAG, "Не удалось создать ни Google, ни локальный календарь")
        }
    }
    
    // Обновленный метод для получения Google аккаунта для Android 8+
    private fun getGoogleAccountEmail(): String? {
        try {
            // Сначала проверяем сохраненный email
            val sharedPrefs = activity.getSharedPreferences("ValaamCalendar", Context.MODE_PRIVATE)
            val savedEmail = sharedPrefs.getString("GOOGLE_ACCOUNT_EMAIL", null)
            if (!savedEmail.isNullOrEmpty()) {
                return savedEmail
            }
            
            // Если есть Google Sign-In, используем его
            val account = GoogleSignIn.getLastSignedInAccount(activity)
            if (account != null && !account.email.isNullOrEmpty()) {
                saveGoogleAccount(account.email!!)
                return account.email
            }
            
            // Для более старых версий или как запасной вариант
            // Метод getAccountsByType не требует разрешения GET_ACCOUNTS на Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val accountManager = AccountManager.get(activity)
                val accounts = accountManager.getAccountsByType("com.google")
                
                if (accounts.isNotEmpty()) {
                    val email = accounts[0].name
                    saveGoogleAccount(email)
                    return email
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при получении Google аккаунта", e)
        }
        return null
    }
    
    // Добавляем метод выбора аккаунта
    private fun chooseGoogleAccount() {
        try {
            val intent = AccountManager.newChooseAccountIntent(
                null, null, arrayOf("com.google"), 
                false, null, null, null, null
            )
            accountPickerLauncher.launch(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при запуске выбора аккаунта", e)
            createLocalCalendarFallback()
        }
    }
    
    // Добавляем метод сохранения Google аккаунта
    private fun saveGoogleAccount(email: String) {
        val sharedPrefs = activity.getSharedPreferences("ValaamCalendar", Context.MODE_PRIVATE)
        sharedPrefs.edit().putString("GOOGLE_ACCOUNT_EMAIL", email).apply()
    }
    
    private fun createGoogleCalendar(email: String): Long? {
        try {
            // Проверяем, существует ли уже наш календарь
            val existingId = findExistingCalendar(email, "com.google")
            if (existingId != null) {
                return existingId
            }
            
            val values = ContentValues().apply {
                put(CalendarContract.Calendars.ACCOUNT_NAME, email)
                put(CalendarContract.Calendars.ACCOUNT_TYPE, "com.google")
                put(CalendarContract.Calendars.NAME, CALENDAR_NAME)
                put(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME, CALENDAR_DISPLAY_NAME)
                put(CalendarContract.Calendars.CALENDAR_COLOR, 0x0000FF) // Синий цвет
                put(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL, CalendarContract.Calendars.CAL_ACCESS_OWNER)
                put(CalendarContract.Calendars.OWNER_ACCOUNT, email)
                put(CalendarContract.Calendars.VISIBLE, 1)
                put(CalendarContract.Calendars.SYNC_EVENTS, 1)
            }
            
            val uri = CalendarContract.Calendars.CONTENT_URI.buildUpon()
                .appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER, "true")
                .appendQueryParameter(CalendarContract.Calendars.ACCOUNT_NAME, email)
                .appendQueryParameter(CalendarContract.Calendars.ACCOUNT_TYPE, "com.google")
                .build()
            
            val calendarUri = activity.contentResolver.insert(uri, values)
            return calendarUri?.lastPathSegment?.toLong()
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при создании Google календаря", e)
            return null
        }
    }
    
    private fun createLocalCalendar(): Long? {
        try {
            // Проверяем, существует ли уже наш локальный календарь
            val existingId = findExistingCalendar("ru.valaam.molitvoslov", "LOCAL")
            if (existingId != null) {
                return existingId
            }
            
            val values = ContentValues().apply {
                put(CalendarContract.Calendars.ACCOUNT_NAME, "ru.valaam.molitvoslov")
                put(CalendarContract.Calendars.ACCOUNT_TYPE, "LOCAL")
                put(CalendarContract.Calendars.NAME, CALENDAR_NAME)
                put(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME, CALENDAR_DISPLAY_NAME)
                put(CalendarContract.Calendars.CALENDAR_COLOR, 0x0000FF) // Синий цвет
                put(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL, CalendarContract.Calendars.CAL_ACCESS_OWNER)
                put(CalendarContract.Calendars.OWNER_ACCOUNT, "ru.valaam.molitvoslov")
                put(CalendarContract.Calendars.VISIBLE, 1)
                put(CalendarContract.Calendars.SYNC_EVENTS, 0) // Локальный календарь не синхронизируется
            }
            
            val uri = CalendarContract.Calendars.CONTENT_URI.buildUpon()
                .appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER, "true")
                .appendQueryParameter(CalendarContract.Calendars.ACCOUNT_NAME, "ru.valaam.molitvoslov")
                .appendQueryParameter(CalendarContract.Calendars.ACCOUNT_TYPE, "LOCAL")
                .build()
            
            val calendarUri = activity.contentResolver.insert(uri, values)
            return calendarUri?.lastPathSegment?.toLong()
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при создании локального календаря", e)
            return null
        }
    }
    
    private fun findExistingCalendar(accountName: String, accountType: String): Long? {
        val projection = arrayOf(CalendarContract.Calendars._ID)
        val selection = "(${CalendarContract.Calendars.ACCOUNT_NAME} = ?) AND " +
                "(${CalendarContract.Calendars.ACCOUNT_TYPE} = ?) AND " +
                "(${CalendarContract.Calendars.NAME} = ?)"
        val selectionArgs = arrayOf(accountName, accountType, CALENDAR_NAME)
        
        activity.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            selection,
            selectionArgs,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idColumn = cursor.getColumnIndex(CalendarContract.Calendars._ID)
                if (idColumn != -1) {
                    return cursor.getLong(idColumn)
                }
            }
        }
        return null
    }
    
    private fun saveCalendarId(calendarId: Long) {
        val sharedPrefs = activity.getSharedPreferences("ValaamCalendar", Context.MODE_PRIVATE)
        sharedPrefs.edit().putLong("CALENDAR_ID", calendarId).apply()
    }
    
    // Метод для получения сохраненного ID календаря
    fun getCalendarId(): Long? {
        val sharedPrefs = activity.getSharedPreferences("ValaamCalendar", Context.MODE_PRIVATE)
        val id = sharedPrefs.getLong("CALENDAR_ID", -1)
        return if (id != -1L) id else null
    }
    
    // Проверка, включен ли календарь
    fun isCalendarEnabled(calendarId: Long): Boolean {
        val projection = arrayOf(
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.VISIBLE
        )
        val selection = "(${CalendarContract.Calendars._ID} = ?)"
        val selectionArgs = arrayOf(calendarId.toString())
        
        activity.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            selection,
            selectionArgs,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val visibleColumnIndex = cursor.getColumnIndex(CalendarContract.Calendars.VISIBLE)
                if (visibleColumnIndex != -1) {
                    return cursor.getInt(visibleColumnIndex) == 1
                }
            }
        }
        
        // Если календарь не найден или произошла ошибка при запросе
        return false
    }
    
    // Пример добавления события в созданный календарь
    fun addEvent(title: String, description: String, startTime: Long, endTime: Long, reminderMinutes: Int): Boolean {
        // Проверяем наличие приложения календаря
        if (!hasCalendarApp()) {
            Log.e(TAG, "Не найдено приложение календаря для работы с событиями")
            return false
        }
        
        val calendarId = getCalendarId() ?: return false
        
        // Проверяем, включен ли календарь
        if (!isCalendarEnabled(calendarId)) {
            Log.w(TAG, "Календарь с ID $calendarId отключен или не найден")
            return false
        }
        
        val values = ContentValues().apply {
            put(CalendarContract.Events.CALENDAR_ID, calendarId)
            put(CalendarContract.Events.TITLE, title)
            put(CalendarContract.Events.DESCRIPTION, description)
            put(CalendarContract.Events.DTSTART, startTime)
            put(CalendarContract.Events.DTEND, endTime)
            put(CalendarContract.Events.EVENT_TIMEZONE, "Europe/Moscow")
            put(CalendarContract.Events.HAS_ALARM, 1)
        }
        
        try {
            val eventUri = activity.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            val eventId = eventUri?.lastPathSegment?.toLong()
            
            if (eventId != null && reminderMinutes > 0) {
                // Добавляем напоминание
                val reminderValues = ContentValues().apply {
                    put(CalendarContract.Reminders.EVENT_ID, eventId)
                    put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
                    put(CalendarContract.Reminders.MINUTES, reminderMinutes)
                }
                activity.contentResolver.insert(CalendarContract.Reminders.CONTENT_URI, reminderValues)
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при добавлении события в календарь", e)
        }
        
        return false
    }
}

// Пример использования в активности:
/*
class MainActivity : ComponentActivity() {
    private lateinit var calendarManager: CalendarManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        calendarManager = CalendarManager(this)
        calendarManager.setupCalendar()
        
        // Пример добавления события (после успешного создания календаря)
        val calendar = Calendar.getInstance()
        val startTime = calendar.timeInMillis
        calendar.add(Calendar.HOUR, 1)
        val endTime = calendar.timeInMillis
        
        calendarManager.addEvent(
            "Православный праздник",
            "Описание праздника",
            startTime,
            endTime,
            30 // напоминание за 30 минут
        )
    }
}
*/