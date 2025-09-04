import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Button,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationListener } from '../services/NotificationListener';
import { TransactionStorage } from '../services/TransactionStorage';

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  timestamp: Date;
  splitWith?: string[];
  rawNotification: string;
}

const HomeScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitNames, setSplitNames] = useState('');
  const [currentTransaction, setCurrentTransaction] = useState<Omit<Transaction, 'id' | 'splitWith'> | null>(null);

  useEffect(() => {
    loadTransactions();
    checkPermissions();
    setupNotificationListener();
  }, []);

  const checkPermissions = async () => {
    try {
      setPermissionStatus('Checking...');
      // For now, set as "Manual Setup Required" since notification listener requires special setup
      setPermissionStatus('Manual Setup Required');
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('Error');
    }
  };

  const requestPermissions = async () => {
    Alert.alert(
      'Notification Access Required',
      'To listen for real Google Wallet notifications, you need to:\n\n1. Go to Settings → Apps → Special app access → Notification access\n2. Find TapAndTrack and enable it\n\nFor now, you can test with the "Test Transaction" button!',
      [
        { text: 'OK', onPress: () => setPermissionStatus('Setup Instructions Shown') }
      ]
    );
  };

  const testTransaction = () => {
    // Simulate a Google Wallet notification for testing
    const testNotificationTexts = [
      'You paid $15.67 at Starbucks with Google Pay',
      'Google Pay: $8.50 charged at McDonald\'s',
      'Payment of $25.00 at Target using Google Wallet',
      'You spent $12.34 at Subway with Google Pay'
    ];

    const randomText = testNotificationTexts[Math.floor(Math.random() * testNotificationTexts.length)];
    handleNotificationReceived(randomText);
  };

  const loadTransactions = async () => {
    try {
      const storedTransactions = await TransactionStorage.getAll();
      setTransactions(storedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const setupNotificationListener = () => {
    NotificationListener.setOnNotificationReceived(handleNotificationReceived);
    setIsListening(true);
  };

  const handleNotificationReceived = (notificationText: string) => {
    // Parse Google Wallet notification
    const parsed = parseGoogleWalletNotification(notificationText);
    if (parsed) {
      // Ask user if they want to split this transaction
      Alert.alert(
        'Transaction Detected',
        `${parsed.merchant}: $${parsed.amount}\n\nDo you want to split this transaction?`,
        [
          {
            text: 'No',
            onPress: () => saveTransaction(parsed, []),
          },
          {
            text: 'Yes',
            onPress: () => promptForSplitNames(parsed),
          },
        ]
      );
    }
  };

  const parseGoogleWalletNotification = (text: string): Omit<Transaction, 'id' | 'splitWith'> | null => {
    // Simple parser for Google Wallet notifications
    // This is a basic implementation - you may need to adjust based on actual notification format

    const amountMatch = text.match(/\$?(\d+\.?\d*)/);
    const merchantMatch = text.match(/at (.+?) /i) || text.match(/(.+?) charged/i);

    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant';

      return {
        amount,
        merchant,
        timestamp: new Date(),
        rawNotification: text,
      };
    }

    return null;
  };

  const promptForSplitNames = (transaction: Omit<Transaction, 'id' | 'splitWith'>) => {
    setCurrentTransaction(transaction);
    setSplitNames('');
    setShowSplitModal(true);
  };

  const handleSplitSubmit = () => {
    const names = splitNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (currentTransaction) {
      saveTransaction(currentTransaction, names);
    }
    setShowSplitModal(false);
    setCurrentTransaction(null);
    setSplitNames('');
  };

  const handleSplitCancel = () => {
    if (currentTransaction) {
      saveTransaction(currentTransaction, []);
    }
    setShowSplitModal(false);
    setCurrentTransaction(null);
    setSplitNames('');
  };

  const saveTransaction = async (transaction: Omit<Transaction, 'id' | 'splitWith'>, splitWith: string[]) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      splitWith,
    };

    try {
      await TransactionStorage.save(newTransaction);
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${transaction.merchant} - $${transaction.amount}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionStorage.deleteById(id);
              setTransactions(prev => prev.filter(t => t.id !== id));
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TapAndTrack</Text>
      <Text style={styles.subtitle}>
        Google Wallet Notification Parser
      </Text>

      <Text style={styles.status}>
        Status: {isListening ? 'Listening for notifications' : 'Not listening'}
      </Text>

      <Text style={styles.permissionStatus}>
        Permissions: {permissionStatus}
      </Text>

      <ScrollView style={styles.transactionsList}>
        <Text style={styles.sectionTitle}>Transactions:</Text>

        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionTitle}>
                  {transaction.merchant} - ${transaction.amount}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTransaction(transaction.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.transactionJson}>
                {JSON.stringify(transaction, null, 2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Test Transaction" onPress={testTransaction} />
        <View style={styles.buttonSpacing} />
        <Button title="Request Permissions" onPress={requestPermissions} />
        <View style={styles.buttonSpacing} />
        <Button title="Refresh" onPress={loadTransactions} />
      </View>

      {/* Split Names Modal */}
      <Modal
        visible={showSplitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleSplitCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Split Transaction</Text>
            <Text style={styles.modalSubtitle}>
              Enter names separated by commas (e.g., "John, Jane, Bob"):
            </Text>

            <TextInput
              style={styles.textInput}
              value={splitNames}
              onChangeText={setSplitNames}
              placeholder="Enter names here..."
              multiline={false}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleSplitCancel}>
                <Text style={styles.cancelButtonText}>Skip Split</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSplitSubmit}>
                <Text style={styles.submitButtonText}>Save Split</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  permissionStatus: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    color: '#1976d2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transactionsList: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20,
  },
  transactionCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionJson: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  actions: {
    marginTop: 16,
  },
  buttonSpacing: {
    height: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  submitButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
