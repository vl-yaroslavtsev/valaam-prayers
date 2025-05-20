package com.example.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    
    companion object {
        private const val CALENDAR_PERMISSION_REQUEST_CODE = 1001
        private val CALENDAR_PERMISSIONS = arrayOf(
            Manifest.permission.READ_CALENDAR,
            Manifest.permission.WRITE_CALENDAR
        )
    }
    
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Сначала настраиваем WebView независимо от наличия прав
        setupWebView()
        
        // Проверяем и запрашиваем разрешения календаря, если их нет
        // if (!hasCalendarPermissions()) {
        //     requestCalendarPermissions()
        // }
    }
    
    private fun setupWebView() {
        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        
        // Регистрируем JavaScript интерфейс
        webView.addJavascriptInterface(CalendarBridge(this), "CalendarBridge")
        
        // Загружаем веб-страницу
        webView.loadUrl("file:///android_asset/index.html") // или ваш URL
    }
    
    private fun hasCalendarPermissions(): Boolean {
        return CALENDAR_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestCalendarPermissions() {
        ActivityCompat.requestPermissions(
            this,
            CALENDAR_PERMISSIONS,
            CALENDAR_PERMISSION_REQUEST_CODE
        )
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == CALENDAR_PERMISSION_REQUEST_CODE) {
            // Уведомляем JavaScript о результате запроса разрешений
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                webView.evaluateJavascript(
                    "if (window.onCalendarPermissionGranted) { window.onCalendarPermissionGranted(); }",
                    null
                )
            } else {
                webView.evaluateJavascript(
                    "if (window.onCalendarPermissionDenied) { window.onCalendarPermissionDenied(); }",
                    null
                )
            }
        }
    }
}