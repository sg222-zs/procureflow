import { request } from './request'
import type {
  Dashboard,
  Employee,
  Entity,
  PageResult,
  PermissionItem,
  Query,
  Resource,
} from '../types'

export const ROLE_NAMES: Record<string, string> = {
  admin: '系统管理员',
  buyer: '采购专员',
  approver: '审批经理',
  warehouse: '仓库管理员',
}

export const listUsers = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/system/users', undefined, query)
export const listEmployees = async (query?: Query): Promise<PageResult<Employee>> => {
  const list = await request<any[]>('GET', '/employees', undefined, query, true)
  return {
    items: list.map((emp) => ({
      ...emp,
      id: String(emp.id),
      hasAccount: emp.hasAccount ?? true,
      accountStatus: emp.accountStatus || (emp.enabled !== false ? 'ENABLED' : 'DISABLED'),
      roleName: emp.roleName || ROLE_NAMES[emp.role] || emp.role,
    })),
    total: list.length,
    page: 1,
    pageSize: 20,
  }
}
export const getEmployee = async (id: string): Promise<Employee> => {
  const emp = await request<any>('GET', `/employees/${id}`, undefined, undefined, true)
  return {
    ...emp,
    id: String(emp.id),
    hasAccount: emp.hasAccount ?? true,
    accountStatus: emp.accountStatus || (emp.enabled !== false ? 'ENABLED' : 'DISABLED'),
    roleName: emp.roleName || ROLE_NAMES[emp.role] || emp.role,
    permissions: emp.role === 'admin' ? ['*:*:*'] : [`role:${emp.role}`],
  }
}
export const createEmployee = async (data: any): Promise<{ employee: Employee; tempPassword?: string }> => {
  // 1. 如果用户选择随机密码或未输入，生成一个默认的8位初始密码（如 demo1234）
  const password =
    data.passwordType === 'SPECIFIED' && data.customPassword
      ? data.customPassword
      : (data.password || 'demo1234')

  // 2. 构造后端 EmployeeCreate 需要的纯净参数
  const payload = {
    name: data.name,
    department: data.department || '',
    role: data.initialRole || data.role || 'buyer',
    password: password,
  }

  // 3. 发送给后端真实的 POST /api/v1/employees 接口
  const res = await request<any>('POST', '/employees', payload, undefined, true)

  const employee: Employee = {
    ...res,
    id: String(res.id),
    hasAccount: true,
    accountStatus: 'ENABLED',
  }

  // 4. 返回包含初始密码的对象，供前端弹窗展示工号与密码凭据
  return {
    employee,
    tempPassword: data.passwordType === 'RANDOM' ? password : (data.customPassword || password),
  }
}
export const updateEmployee = (id: string, data: Partial<Employee>) =>
  request<Employee>('PUT', `/system/employees/${id}`, data)
export const openEmployeeAccount = (
  id: string,
  data: {
    role: string
    passwordType?: 'RANDOM' | 'SPECIFIED'
    customPassword?: string
    mustChangePassword?: boolean
  },
) =>
  request<{ employee: Employee; tempPassword?: string }>(
    'POST',
    `/system/employees/${id}/open-account`,
    data,
  )
export const resetEmployeePassword = (id: string, password?: string) =>
  request<{ tempPassword: string }>('POST', `/employees/${id}/reset-password`, { password }, undefined, true)
export const toggleEmployeeAccountStatus = (id: string, accountStatus: string, reason?: string) => {
  const action = accountStatus === 'DISABLED' ? 'disable' : 'enable'
  return request<Employee>(
    'POST',
    `/employees/${id}/${action}`,
    { reason },
    undefined,
    true, // 👈 走真实后端
  )
}
export const unlockEmployeeAccount = (id: string) =>
  request('POST', `/employees/${id}/unlock`, undefined, undefined, true)
export const assignEmployeeRole = (id: string, role: string) =>
  request<Employee>('POST', `/system/employees/${id}/assign-role`, { role })
export const terminateEmployee = (
  id: string,
  data: {
    terminationDate: string
    terminationReason: string
    terminationNote?: string
  },
) => request<Employee>('POST', `/system/employees/${id}/terminate`, data)

export const listPermissions = (query?: Query) =>
  request<PageResult<PermissionItem>>('GET', '/system/permissions', undefined, query)
export const listRoles = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/system/roles', undefined, query)
export const listAuditLogs = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/audit-logs', undefined, query)
export const getDashboard = () => request<Dashboard>('GET', '/dashboard')
export const getDetail = (resource: Resource, id: string) =>
  request<Entity>('GET', `/${resource}/${id}`)
