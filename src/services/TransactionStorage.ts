import AsyncStorage from '@react-native-async-storage/async-storage';

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  timestamp: Date;
  splitWith?: string[];
  rawNotification: string;
}

const STORAGE_KEY = 'transactions';

class TransactionStorageService {
  async save(transaction: Transaction): Promise<void> {
    try {
      const existingTransactions = await this.getAll();
      const updatedTransactions = [transaction, ...existingTransactions];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
      console.log('Transaction saved:', transaction);
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async getAll(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const transactions = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return transactions.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('All transactions cleared');
    } catch (error) {
      console.error('Error clearing transactions:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Transaction | null> {
    try {
      const transactions = await this.getAll();
      return transactions.find(t => t.id === id) || null;
    } catch (error) {
      console.error('Error getting transaction by id:', error);
      return null;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const transactions = await this.getAll();
      const filteredTransactions = transactions.filter(t => t.id !== id);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTransactions));
      console.log('Transaction deleted:', id);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
}

export const TransactionStorage = new TransactionStorageService();
