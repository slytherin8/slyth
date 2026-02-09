import { Platform } from 'react-native';

// Get the correct API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    // For web browsers, localhost works fine
    return "http://localhost:3000";
  } else {
    // For Expo mobile app, use your computer's IP address
    // 🚨 IMPORTANT: Update this if your IP changes
    
    // Your current IP address (run 'ipconfig' to get this)
    const YOUR_COMPUTER_IP = "10.212.38.219";
    
    return `http://${YOUR_COMPUTER_IP}:3000`;
  }
};

export const API = getApiUrl();

// Debug: Log the API URL being used
console.log(`🌐 API URL: ${API} (Platform: ${Platform.OS})`);

// Helper function to test API connection
export const testConnection = async () => {
  try {
    console.log(`🔍 Testing connection to: ${API}`);
    const response = await fetch(`${API}/`);
    if (response.ok) {
      const text = await response.text();
      console.log(`✅ Backend connection successful: ${text}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Backend connection failed: ${error.message}`);
    return false;
  }
};

