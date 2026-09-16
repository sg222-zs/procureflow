import { request } from './request'
import type { Session } from '../types'

// 角色与菜单功能权限映射表
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*:*:*'],
  buyer: [
    'dashboard',
    'suppliers',
    'products',
    'skus',
    'purchase-requests',
    'purchase-orders',
    'inventory/stocks',
    'catalog:write',
    'request:write',
  ],
  approver: [
    'dashboard',
    'approvals',
    'purchase-orders',
    'inventory/stocks',
    'approval:write',
  ],
  warehouse: [
    'dashboard',
    'purchase-orders',
    'warehouse-receipts',
    'inventory/stocks',
    'inventory/transactions',
    'receipt:write',
  ],
}

// 1. 登录接口对接与字段适配
export const login = async (employeeNo: string, password: string): Promise<Session> => {
  const res = await request<any>(
    'POST',
    '/auth/login',
    {
      employee_no: employeeNo,
      password,
    },
    undefined,
    true,
  )

  const permissions = ROLE_PERMISSIONS[res.role] || (res.role === 'admin' ? ['*:*:*'] : [`role:${res.role}`])

  return {
    accessToken: res.token, // 后端的 token 映射为前端的 accessToken
    user: {
      id: String(res.employee.id),
      employeeNo: String(res.employee.id),
      name: res.employee.name,
      role: res.role,
      department: res.employee.department,
      position: res.employee.position || '员工',
      mustChangePassword: Boolean(res.mustChangePassword),
    },
    permissions,
  }
}

// 2. 获取当前登录人：路径改为 /auth/me
export const currentUser = async (): Promise<Session> => {
  const res = await request<any>('GET', '/auth/me', undefined, undefined, true)
  const permissions = ROLE_PERMISSIONS[res.role] || (res.role === 'admin' ? ['*:*:*'] : [`role:${res.role}`])

  return {
    accessToken: sessionStorage.getItem('pf-token') || '',
    user: {
      id: String(res.employee.id),
      employeeNo: String(res.employee.id),
      name: res.employee.name,
      role: res.role,
      department: res.employee.department,
      position: res.employee.position || '员工',
      mustChangePassword: Boolean(res.mustChangePassword),
    },
    permissions,
  }
}

// 3. 首次登录修改密码
export const firstLoginChangePassword = (data: {
  temp_password?: string
  new_password?: string
  currentPassword?: string
  newPassword?: string
}) => {
  const old_password = data.temp_password || data.currentPassword || ''
  const new_password = data.new_password || data.newPassword || ''
  return request<{ changed?: boolean; success?: boolean }>(
    'POST',
    '/auth/password',
    {
      old_password,
      new_password,
    },
    undefined,
    true,
  )
}

// 4. 修改个人密码：改为 POST /auth/password
export const changeMyPassword = (data: { old_password?: string; new_password?: string }) => {
  return request<{ changed: boolean }>(
    'POST',
    '/auth/password',
    {
      old_password: data.old_password,
      new_password: data.new_password,
    },
    undefined,
    true,
  )
}

export const health = () =>
  request<{ status: string }>('GET', '/health', undefined, undefined, true)