import axios from 'axios'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可在这里添加token等鉴权信息
    // config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 根据后端实际返回格式调整
    if (res.code && res.code !== 200) {
      console.error('接口错误:', res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    console.error('响应错误:', error.message)
    // 模拟数据模式下，请求失败不抛出致命错误，方便开发
    if (import.meta.env.DEV) {
      console.warn('开发模式下请求失败，使用模拟数据')
    }
    return Promise.reject(error)
  }
)

export default service
