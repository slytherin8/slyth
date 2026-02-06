import axios from "axios";
import AsyncStorage from "../utils/storage";

import { Platform } from "react-native";

const BASE_URL = Platform.OS === 'android'
  ? "http://10.0.2.2:5000/api"
  : "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Role: ${payload.role}`);
    } catch {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Token found but payload parsing failed`);
    }
  } else {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - NO TOKEN FOUND`);
  }
  return config;
});

export default api;
