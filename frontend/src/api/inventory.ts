import { request } from './request'
import type { Entity, PageResult, Query } from '../types'
export const listReceipts = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/warehouse-receipts', undefined, query)
export const listStocks = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/inventory/stocks', undefined, query)
export const listTransactions = (query?: Query) =>
  request<PageResult<Entity>>('GET', '/inventory/transactions', undefined, query)
export const createReceipt = (data: Partial<Entity>) =>
  request<Entity>('POST', '/warehouse-receipts', data)
