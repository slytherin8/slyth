import { Platform } from 'react-native';

// Get the correct API URL based on platform
const getApiUrl = () => {
  // Use the live Render backend URL
  return "https://slyth.onrender.com";
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

