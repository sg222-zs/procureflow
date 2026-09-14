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

export const listUsers = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/system/users', undefined, query)
export const listEmployees = (query?: Query) =>
  request<PageResult<Employee>>('GET', '/system/employees', undefined, query)
export const getEmployee = (id: string) => request<Employee>('GET', `/system/employees/${id}`)
export const createEmployee = (
  data: Partial<Employee> & {
    openAccount?: boolean
    initialRole?: string
    passwordType?: 'RANDOM' | 'SPECIFIED'
    customPassword?: string
    mustChangePassword?: boolean
  },
) => request<{ employee: Employee; tempPassword?: string }>('POST', '/system/employees', data)
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
export const resetEmployeePassword = (id: string) =>
  request<{ tempPassword: string }>('POST', `/system/employees/${id}/reset-password`)
export const toggleEmployeeAccountStatus = (id: string, accountStatus: string, reason?: string) =>
  request<Employee>('POST', `/system/employees/${id}/account-status`, { accountStatus, reason })
export const unlockEmployeeAccount = (id: string) =>
  request<Employee>('POST', `/system/employees/${id}/unlock`)
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
