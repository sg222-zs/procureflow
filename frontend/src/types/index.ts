export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId?: string
}
export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
export type PurchaseRequestStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export interface Item {
  skuId: string
  name: string
  quantity: number
  price: string
  received: number
}
export interface Trail {
  at: string
  actor: string
  action: string
  reason?: string
}
export interface Package {
  id: string
  status: string
  quantity: number
  warehouse: string
  at: string
}
// A shared record allows the list shell to render each resource; domain mutations validate fields.
export interface Entity {
  id: string
  name: string
  status: string
  createdAt: string
  category?: string
  contact?: string
  phone?: string
  email?: string
  department?: string
  role?: string
  permissions?: string[]
  supplierId?: string
  productId?: string
  spec?: string
  price?: string
  amount?: string
  applicant?: string
  applicantId?: string
  approverRole?: string
  requestId?: string
  orderId?: string
  skuId?: string
  warehouse?: string
  available?: number
  locked?: number
  threshold?: number
  quantity?: number
  action?: string
  actor?: string
  module?: string
  traceId?: string
  note?: string
  items?: Item[]
  trail?: Trail[]
  packages?: Package[]
  employeeNo?: string
  position?: string
  roleName?: string
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  hasAccount?: boolean
  accountStatus?: 'ENABLED' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'NONE'
  password?: string
  passwordUpdatedAt?: string
  lastLoginAt?: string
  failedLoginCount?: number
  lockedAt?: string
  disabledReason?: string
  hireDate?: string
  code?: string
  description?: string
  terminationDate?: string
  terminationReason?: string
  terminationNote?: string
  mustChangePassword?: boolean
  updatedAt?: string
}
export interface User {
  id: string
  employeeNo: string
  name: string
  role: string
  department: string
  position?: string
  mustChangePassword?: boolean
  accountStatus?: string
}

export interface UserAccount {
  employeeNo: string
  accountStatus: 'ENABLED' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'NONE'
  role: string
  roleName?: string
  lastLoginAt?: string
  passwordUpdatedAt?: string
  failedLoginCount: number
  mustChangePassword: boolean
  lockedAt?: string
  disabledReason?: string
}

export interface Employee {
  id: string
  name: string
  department: string
  position: string
  phone?: string
  email?: string
  hireDate: string
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  hasAccount: boolean
  accountStatus: 'ENABLED' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'NONE'
  role?: string
  roleName?: string
  lastLoginAt?: string
  passwordUpdatedAt?: string
  failedLoginCount?: number
  lockedAt?: string
  disabledReason?: string
  terminationDate?: string
  terminationReason?: string
  terminationNote?: string
  createdAt: string
  updatedAt?: string
  account?: UserAccount
  permissions?: string[]
  mustChangePassword?: boolean
  password?: string
}

export interface PermissionItem {
  id: string
  code: string
  name: string
  module: string
  description: string
}

export interface Session {
  accessToken: string
  user: User
  permissions: string[]
}
export interface Query {
  [key: string]: string | number | undefined
}
export type Resource =
  | 'suppliers'
  | 'products'
  | 'skus'
  | 'purchase-requests'
  | 'approvals'
  | 'purchase-orders'
  | 'warehouse-receipts'
  | 'inventory/stocks'
  | 'inventory/transactions'
  | 'system/users'
  | 'system/employees'
  | 'system/roles'
  | 'system/permissions'
  | 'audit-logs'
export interface Dashboard {
  requestCount: number
  pendingCount: number
  orderAmount: string
  lowStockCount: number
  recentOrders: Entity[]
  lowStocks: Entity[]
  trend: { date: string; amount: number }[]
}
