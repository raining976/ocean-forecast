import axios from 'axios'
import { errorToast } from '@/utils/toast'
const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/'

const service = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      // localStorage 在服务端渲染或受限环境可能不可用，静默处理
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    if (response.data.success) {
      return response.data  // 预留处理接口响应的扩展点
    } else {
      errorToast(response.data.message || '请求失败')
      return Promise.reject(new Error(response.data.message || '请求失败'))
    }
  },
  error => {
    let message = 'Network Error'
    if (error.response) {
      const status = error.response.status
      // 处理常见 HTTP 状态
      switch (status) {
        case 401:
          message = '未授权，请重新登录'
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求资源不存在'
          break
        case 500:
          message = '服务器错误'
          break
        default:
          message = error.response.data && error.response.data.message ? error.response.data.message : `请求失败，状态码 ${status}`
      }
    } else if (error.request) {
      message = '无响应，请检查网络或接口地址'
    } else if (error.message) {
      message = error.message
    }
    errorToast(message)
    console.error('response error:', error)
    return Promise.reject(error)
  }
)


function get(url, params = {}, config = {}) {
  return service.get(url, { params, ...config })
}

function post(url, data = {}, config = {}) {
  return service.post(url, data, config)
}

export { service as default, get, post }
