import { request } from './request'
import type { Entity, PageResult, Query } from '../types'
export const listProducts = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/products', undefined, query)
export const listSkus = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/skus', undefined, query)
export const saveProduct = (data: Partial<Entity>, id?: string) =>
  request<Entity>(id ? 'PUT' : 'POST', `/products${id ? `/${id}` : ''}`, data)
export const saveSku = (data: Partial<Entity>, id?: string) =>
  request<Entity>(id ? 'PUT' : 'POST', `/skus${id ? `/${id}` : ''}`, data)
