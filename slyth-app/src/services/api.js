import axios from "axios";

import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Ensure Bearer prefix if backend expects it
    // Or just "token" if that's what backend expects. Let's check authMiddleware.
  }
  return config;
});

export default api;
