import type { Entity, PageResult, Query, Resource } from '../types'
import { listProducts, listSkus, saveProduct, saveSku } from '../api/catalog'
import { listSuppliers, saveSupplier } from '../api/supplier'
import {
  listApprovals,
  listPurchaseOrders,
  listPurchaseRequests,
  savePurchaseRequest,
} from '../api/procurement'
import { createReceipt, listReceipts, listStocks, listTransactions } from '../api/inventory'
import { listAuditLogs, listEmployees, listPermissions, listRoles, listUsers } from '../api/system'
export interface Column {
  key: keyof Entity
  label: string
  width?: number
  money?: boolean
}
export interface Config {
  list: (q?: Query) => Promise<PageResult<Entity>>
  save?: (data: Partial<Entity>, id?: string) => Promise<Entity>
  permission?: string
  create?: string
  columns: Column[]
  statuses: string[]
}
const col = (key: keyof Entity, label: string, width?: number, money?: boolean): Column => ({
  key,
  label,
  width,
  money,
})
export const configs: Record<Resource, Config> = {
  suppliers: {
    list: listSuppliers,
    save: saveSupplier,
    permission: 'catalog:write',
    create: '新增供应商',
    columns: [
      col('name', '供应商名称', 250),
      col('contact', '联系人'),
      col('phone', '联系电话', 160),
      col('email', '电子邮箱', 200),
    ],
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  products: {
    list: listProducts,
    save: saveProduct,
    permission: 'catalog:write',
    create: '新增商品',
    columns: [col('name', '商品名称', 240), col('category', '商品分类')],
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  skus: {
    list: listSkus,
    save: saveSku,
    permission: 'catalog:write',
    create: '新增 SKU',
    columns: [
      col('name', 'SKU 名称', 250),
      col('spec', '规格', 180),
      col('productId', '商品编号', 130),
      col('supplierId', '供应商编号', 140),
      col('price', '采购单价', 140, true),
    ],
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  'purchase-requests': {
    list: listPurchaseRequests,
    save: savePurchaseRequest,
    permission: 'request:write',
    create: '新建采购申请',
    columns: [
      col('name', '申请标题', 240),
      col('applicant', '申请人', 100),
      col('department', '部门', 100),
      col('amount', '申请金额', 150, true),
    ],
    statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'],
  },
  approvals: {
    list: listApprovals,
    columns: [
      col('name', '申请标题', 240),
      col('applicant', '申请人', 100),
      col('department', '部门', 100),
      col('amount', '申请金额', 150, true),
    ],
    statuses: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
  },
  'purchase-orders': {
    list: listPurchaseOrders,
    columns: [
      col('name', '订单名称', 220),
      col('supplierId', '供应商编号', 140),
      col('requestId', '来源申请', 170),
      col('amount', '订单金额', 140, true),
    ],
    statuses: ['ORDERED', 'PARTIAL', 'COMPLETED'],
  },
  'warehouse-receipts': {
    list: listReceipts,
    save: createReceipt,
    permission: 'receipt:write',
    create: '收货入库',
    columns: [
      col('name', '入库内容', 220),
      col('orderId', '采购订单', 170),
      col('warehouse', '收货仓库', 140),
      col('quantity', '入库数量', 100),
    ],
    statuses: ['COMPLETED'],
  },
  'inventory/stocks': {
    list: listStocks,
    columns: [
      col('name', 'SKU 名称', 240),
      col('skuId', 'SKU 编号', 130),
      col('warehouse', '仓库', 140),
      col('available', '可用库存', 100),
      col('locked', '锁定库存', 100),
      col('threshold', '预警线', 100),
    ],
    statuses: ['OK', 'LOW'],
  },
  'inventory/transactions': {
    list: listTransactions,
    columns: [
      col('name', 'SKU 名称', 220),
      col('skuId', 'SKU 编号', 130),
      col('warehouse', '仓库', 140),
      col('orderId', '关联订单', 160),
      col('quantity', '变动数量', 100),
      col('note', '来源单据', 170),
    ],
    statuses: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT'],
  },
  'system/users': {
    list: listUsers,
    columns: [
      col('name', '用户名称', 180),
      col('department', '所属部门', 150),
      col('role', '角色', 150),
    ],
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  'system/roles': {
    list: listRoles,
    columns: [col('name', '角色名称', 180), col('permissions', '菜单 / 按钮权限', 550)],
    statuses: ['ACTIVE'],
  },
  'audit-logs': {
    list: listAuditLogs,
    columns: [
      col('actor', '操作人', 100),
      col('module', '模块', 140),
      col('action', '操作', 130),
      col('name', '业务对象', 180),
      col('traceId', '请求 ID', 300),
    ],
    statuses: [],
  },
  'system/employees': {
    list: (q) => listEmployees(q) as unknown as Promise<PageResult<Entity>>,
    permission: 'system/employees',
    columns: [
      col('id', '工号', 120),
      col('name', '姓名', 120),
      col('department', '所属部门', 140),
      col('position', '岗位职务', 150),
    ],
    statuses: ['ACTIVE', 'ON_LEAVE', 'TERMINATED'],
  },
  'system/permissions': {
    list: (q) => listPermissions(q) as unknown as Promise<PageResult<Entity>>,
    permission: 'system/permissions',
    columns: [col('id', 'ID', 120), col('name', '权限名称', 180), col('module', '所属模块', 140)],
    statuses: ['ACTIVE'],
  },
}
