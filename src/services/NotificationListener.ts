import { DeviceEventEmitter } from 'react-native';

type NotificationCallback = (notificationText: string) => void;

class NotificationListenerService {
  private onNotificationReceived: NotificationCallback | null = null;

  constructor() {
    // Listen for notification events from native module
    DeviceEventEmitter.addListener('onNotificationReceived', (notification) => {
      if (this.onNotificationReceived && this.isGoogleWalletNotification(notification.text)) {
        this.onNotificationReceived(notification.text);
      }
    });
  }

  setOnNotificationReceived(callback: NotificationCallback) {
    this.onNotificationReceived = callback;
  }

  private isGoogleWalletNotification(text: string): boolean {
    // Check if the notification is from Google Wallet/Google Pay
    const keywords = [
      'google wallet',
      'google pay',
      'gpay',
      'charged',
      'payment',
      'transaction',
      'spent',
      'paid'
    ];

    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // This would call native module to request notification access
      // For now, we'll simulate permission granted
      console.log('Notification permissions requested');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Simulate receiving a notification (for testing)
  simulateNotification(text: string) {
    if (this.onNotificationReceived && this.isGoogleWalletNotification(text)) {
      this.onNotificationReceived(text);
    }
  }
}

export const NotificationListener = new NotificationListenerService();
