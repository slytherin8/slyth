import axios from "axios";
import AsyncStorage from "../utils/storage";
import { Platform } from "react-native";
import { API } from "../constants/api";

const BASE_URL = `${API}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    try {
      const parts = token.split(".");
      if (parts.length === 3 && typeof atob !== 'undefined') {
        const payload = JSON.parse(atob(parts[1]));
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Role: ${payload.role}`);
      } else {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Cannot parse token payload`);
      }
    } catch (e) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Error parsing token: ${e.message}`);
    }
  } else {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - NO TOKEN FOUND`);
  }
  return config;
});

export default api;
