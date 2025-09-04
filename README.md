# TapAndTrack

A simple React Native app that parses Google Wallet notifications and helps split transactions.

## Features

- 📱 Listens for Google Wallet notifications
- 💰 Parses transaction amounts and merchant names
- 👥 Prompts user to split transactions with others
- 💾 Stores transaction data as JSON objects
- 📊 Displays all transactions in a simple list

## What it does

1. **Notification Detection**: Detects Google Wallet/Google Pay notifications
2. **Transaction Parsing**: Extracts amount and merchant from notification text
3. **Split Prompting**: Asks if you want to split the transaction
4. **Name Collection**: If splitting, prompts for comma-separated names
5. **JSON Storage**: Saves all data as JSON objects in local storage
6. **Simple Display**: Shows raw JSON data on the home screen

## Tech Stack

- React Native 0.81.0
- TypeScript
- AsyncStorage for data persistence
- Minimal dependencies (no navigation libraries, no fancy UI)

## Project Structure

```
src/
  screens/
    HomeScreen.tsx          # Main and only screen
  services/
    NotificationListener.ts # Handles notification detection
    TransactionStorage.ts   # Manages JSON data storage
```

## Design Philosophy

This app follows a **barebones approach**:
- No complex navigation
- No fancy UI components
- No calculations or totals
- Just parse, prompt, store, and display
- Keep it simple and functional

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npx react-native run-android` or `npx react-native run-ios`

## Usage

1. Open the app
2. Grant notification access permissions
3. Make purchases using Google Wallet/Google Pay
4. The app will automatically detect notifications and prompt you
5. Choose whether to split transactions and enter names if needed
6. View all stored transactions as JSON objects in the app

## Note

This is a minimal implementation focused on core functionality. The notification parsing uses basic regex patterns that may need adjustment based on actual Google Wallet notification formats.