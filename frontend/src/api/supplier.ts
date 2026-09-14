import { request } from './request'
import type { Entity, PageResult, Query } from '../types'
export const listSuppliers = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/suppliers', undefined, query,true)
export const saveSupplier = (data: Partial<Entity>, id?: string) =>
  request<Entity>(id ? 'PUT' : 'POST', `/suppliers${id ? `/${id}` : ''}`, data, undefined, true)
export const deleteSupplier = (id: string) => request<void>('DELETE', `/suppliers/${id}`)
