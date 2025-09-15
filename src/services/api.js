import axios from 'axios'

const api = axios.create({
  baseURL: process.env.VITE_API_BASE || 'https://api.example.com',
  timeout: 10000,
})

// 可在此处添加请求/响应拦截器
api.interceptors.request.use(config => {
  // e.g., attach token
  return config
})

export default api
