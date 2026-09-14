import { request } from './request'
import type { Entity, PageResult, Query } from '../types'
export const listPurchaseRequests = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/purchase-requests', undefined, query)
export const listApprovals = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/approvals', undefined, query)
export const listPurchaseOrders = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/purchase-orders', undefined, query)
export const savePurchaseRequest = (data: Partial<Entity>, id?: string) =>
  request<Entity>(id ? 'PUT' : 'POST', `/purchase-requests${id ? `/${id}` : ''}`, data)
export const submitPurchaseRequest = (id: string) =>
  request<Entity>('POST', `/purchase-requests/${id}/submit`)
export const withdrawPurchaseRequest = (id: string) =>
  request<Entity>('POST', `/purchase-requests/${id}/withdraw`)
export const cancelPurchaseRequest = (id: string) =>
  request<Entity>('POST', `/purchase-requests/${id}/cancel`)
export const revisePurchaseRequest = (id: string) =>
  request<Entity>('POST', `/purchase-requests/${id}/revise`)
export const approvePurchaseRequest = (id: string) =>
  request<Entity>('POST', `/approvals/${id}/approve`)
export const rejectPurchaseRequest = (id: string, reason: string) =>
  request<Entity>('POST', `/approvals/${id}/reject`, { reason })
