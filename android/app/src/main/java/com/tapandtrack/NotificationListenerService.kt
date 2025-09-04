package com.tapandtrack

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.bridge.Arguments

/**
 * NotificationListenerService
 * Android service that listens to all notifications and filters for Google Pay transactions
 */
class NotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationListener"
        private const val EVENT_NAME = "onGooglePayNotification"

        // Google Wallet package names to filter notifications (US)
        private val GOOGLE_WALLET_PACKAGES = setOf(
            "com.google.android.apps.walletnfcrel",   // Google Wallet (Primary)
            "com.android.vending",                     // Google Play Services
            "com.google.android.gms",                  // Google Mobile Services
            "com.google.android.apps.nbu.paisa.user"  // Google Pay (fallback)
        )
    }

    /**
     * Called when a new notification is posted
     */
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        super.onNotificationPosted(sbn)

        try {
            val packageName = sbn.packageName
            Log.d(TAG, "Notification from: $packageName")

            // Only process notifications from payment apps
            if (GOOGLE_WALLET_PACKAGES.contains(packageName)) {
                processPaymentNotification(sbn)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    /**
     * Process payment app notifications and extract transaction data
     */
    private fun processPaymentNotification(sbn: StatusBarNotification) {
        try {
            val notification = sbn.notification
            val extras = notification.extras

            // Extract notification content
            val title = extras.getCharSequence("android.title")?.toString() ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""
            val subText = extras.getCharSequence("android.subText")?.toString() ?: ""
            val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""

            // Combine all text content for parsing
            val fullNotificationText = listOf(title, text, subText, bigText)
                .filter { it.isNotBlank() }
                .joinToString(" | ")

            Log.d(TAG, "Payment notification: $fullNotificationText")

            // Check if this looks like a transaction notification
            if (isTransactionNotification(fullNotificationText)) {
                // Send to React Native
                sendNotificationToReactNative(sbn.packageName, fullNotificationText)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error processing payment notification", e)
        }
    }

    /**
     * Check if notification text indicates a transaction
     */
    private fun isTransactionNotification(text: String): Boolean {
        val lowerText = text.lowercase()

        // Keywords that indicate a payment transaction (US)
        val transactionKeywords = listOf(
            "paid", "payment", "sent", "transaction", "dollars", "$", "usd",
            "debited", "credited", "transferred", "successful", "completed",
            "purchase", "bill", "merchant", "store", "charged", "tap to pay"
        )

        // Check if any transaction keywords are present
        return transactionKeywords.any { keyword -> lowerText.contains(keyword) }
    }

    /**
     * Send notification data to React Native JavaScript side
     */
    private fun sendNotificationToReactNative(packageName: String, notificationText: String) {
        try {
            val reactApplication = application as? ReactApplication
            val reactInstanceManager = reactApplication?.reactNativeHost?.reactInstanceManager
            val reactContext = reactInstanceManager?.currentReactContext

            if (reactContext != null) {
                val params = Arguments.createMap().apply {
                    putString("packageName", packageName)
                    putString("notificationText", notificationText)
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, params)

                Log.d(TAG, "Sent notification to React Native: $EVENT_NAME")
            } else {
                Log.w(TAG, "React context not available, cannot send notification")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error sending notification to React Native", e)
        }
    }

    /**
     * Called when notification is removed (optional override)
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        super.onNotificationRemoved(sbn)
        // We don't need to do anything when notifications are removed
    }

    /**
     * Called when listener is connected
     */
    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "Notification Listener Service connected")
    }

    /**
     * Called when listener is disconnected
     */
    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "Notification Listener Service disconnected")
    }
}
