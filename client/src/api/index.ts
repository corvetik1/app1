// src/api/index.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Заглушка для API
});

export default api;