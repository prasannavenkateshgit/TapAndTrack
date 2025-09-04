import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Button,
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

  useEffect(() => {
    loadTransactions();
    setupNotificationListener();
  }, []);

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
    Alert.prompt(
      'Split Transaction',
      'Enter names separated by commas (e.g., "John, Jane, Bob"):',
      (input) => {
        if (input) {
          const names = input.split(',').map(name => name.trim()).filter(name => name.length > 0);
          saveTransaction(transaction, names);
        } else {
          saveTransaction(transaction, []);
        }
      }
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TapAndTrack</Text>
      <Text style={styles.subtitle}>
        Google Wallet Notification Parser
      </Text>

      <Text style={styles.status}>
        Status: {isListening ? 'Listening for notifications' : 'Not listening'}
      </Text>

      <ScrollView style={styles.transactionsList}>
        <Text style={styles.sectionTitle}>Transactions:</Text>

        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <Text style={styles.transactionJson}>
                {JSON.stringify(transaction, null, 2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Refresh" onPress={loadTransactions} />
      </View>
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
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
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
  transactionJson: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  actions: {
    marginTop: 16,
  },
});

export default HomeScreen;
