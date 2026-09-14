import { request } from './request'
import type { Session } from '../types'

export const login = (employeeNo: string, password: string) =>
  request<Session>('POST', '/auth/login', {
    employee_no: employeeNo,
    username: employeeNo,
    password,
  })

export const currentUser = () => request<Session>('GET', '/users/me')

export const firstLoginChangePassword = (
  currentPasswordOrData:
    | string
    | {
        temp_password?: string
        currentPassword?: string
        new_password?: string
        newPassword?: string
      },
  newPassword?: string,
) => {
  const data =
    typeof currentPasswordOrData === 'string'
      ? { currentPassword: currentPasswordOrData, newPassword }
      : currentPasswordOrData
  return request<{ success?: boolean; message?: string }>(
    'PUT',
    '/auth/first-login/change-password',
    data,
  )
}

export const changeMyPassword = (
  currentPasswordOrData:
    | string
    | {
        old_password?: string
        currentPassword?: string
        new_password?: string
        newPassword?: string
      },
  newPassword?: string,
) => {
  const data =
    typeof currentPasswordOrData === 'string'
      ? { currentPassword: currentPasswordOrData, newPassword }
      : currentPasswordOrData
  return request<{ success?: boolean; message?: string }>('PUT', '/me/password', data)
}

export const health = () =>
  request<{ status: string }>('GET', '/health', undefined, undefined, true)
