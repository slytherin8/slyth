import axios from "axios";

const api = axios.create({
  baseURL: "http://10.249.80.219:5000/api",
  timeout: 10000,
});

export default api;
