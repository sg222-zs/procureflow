import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse, Query } from '../types'
import { ApiError } from './error'
export { ApiError } from './error'
export const apiMode = import.meta.env.VITE_API_MODE || 'mock'
let failure = 0
export function simulateNextError(status: number) {
  failure = status
}
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
})
http.interceptors.request.use((config) => {
  config.headers.set('X-Request-ID', crypto.randomUUID())
  const token = sessionStorage.getItem('pf-token')
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data
    return Promise.reject(
      new ApiError(
        error.response?.status || 0,
        body?.code || 0,
        body?.message ||
          (error.code === 'ECONNABORTED'
            ? '请求超时，请重试'
            : '无法连接服务，请检查网络或后端启动状态'),
        body?.requestId,
      ),
    )
  },
)
export async function request<T>(
  method: string,
  path: string,
  data?: unknown,
  query?: Query,
  real = false,
): Promise<T> {
  const requestId = crypto.randomUUID()
  try {
    let body: ApiResponse<T>
    if (apiMode === 'mock' && !real) {
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400))
      if (failure) {
        const status = failure
        failure = 0
        throw new ApiError(status, status, `开发模拟错误 ${status}`, requestId)
      }
      const { handle } = await import('../mock/handlers')
      body = {
        code: 0,
        message: 'ok',
        data: handle(
          method,
          path,
          data as never,
          query,
          sessionStorage.getItem('pf-token') || '',
          requestId,
        ) as T,
        requestId,
      }
    } else {
      const config: AxiosRequestConfig = { method, url: path, data, params: query }
      body = (await http.request<ApiResponse<T>>(config)).data
    }
    if (body.code !== 0) throw new ApiError(400, body.code, body.message, body.requestId)
    return body.data
  } catch (error) {
    const normalized =
      error instanceof ApiError
        ? error
        : new ApiError(500, 500, error instanceof Error ? error.message : '请求失败', requestId)
    normalized.requestId ||= requestId
    ElMessage.error(`${normalized.message} · ${normalized.requestId.slice(0, 8)}`)
    if (normalized.status === 401 && path !== '/auth/login') {
      sessionStorage.removeItem('pf-token')
      window.dispatchEvent(new Event('pf-unauthorized'))
    }
    throw normalized
  }
}
