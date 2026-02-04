import { Platform } from "react-native";

// Web-compatible AsyncStorage
let AsyncStorage;

if (Platform.OS === 'web') {
  // Web fallback using localStorage
  AsyncStorage = {
    getItem: async (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore errors
      }
    },
    removeItem: async (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore errors
      }
    }
  };
} else {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

export default AsyncStorage;