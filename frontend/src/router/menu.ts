import type { Resource } from '../types'
export interface Menu {
  path: string
  title: string
  icon: string
  permission: string
  resource?: Resource
  description?: string
  children?: Menu[]
}
export const menus: Menu[] = [
  { path: '/dashboard', title: '工作台', icon: 'DataBoard', permission: 'dashboard' },
  {
    path: '/procurement',
    title: '采购管理',
    icon: 'ShoppingBag',
    permission: '',
    children: [
      {
        path: '/procurement/requests',
        title: '采购申请',
        icon: 'Document',
        permission: 'purchase-requests',
        resource: 'purchase-requests',
        description: '管理与跟进采购申请及流转进度',
      },
      {
        path: '/procurement/approvals',
        title: '审批中心',
        icon: 'CircleCheck',
        permission: 'approvals',
        resource: 'approvals',
        description: '审核采购申请单据，支持审批与驳回处理',
      },
      {
        path: '/procurement/orders',
        title: '采购订单',
        icon: 'Tickets',
        permission: 'purchase-orders',
        resource: 'purchase-orders',
        description: '管理采购订单履约状态、到货进度与交付记录',
      },
    ],
  },
  {
    path: '/catalog',
    title: '商品中心',
    icon: 'Box',
    permission: '',
    children: [
      {
        path: '/catalog/products',
        title: '商品管理',
        icon: 'Goods',
        permission: 'products',
        resource: 'products',
        description: '维护标准物料分类与基础商品信息',
      },
      {
        path: '/catalog/skus',
        title: 'SKU 管理',
        icon: 'PriceTag',
        permission: 'skus',
        resource: 'skus',
        description: '维护商品规格、采购基准价与供应商关联',
      },
    ],
  },
  {
    path: '/supply/suppliers',
    title: '供应商管理',
    icon: 'OfficeBuilding',
    permission: 'suppliers',
    resource: 'suppliers',
    description: '维护供应商合作名录、联系方式与合作状态',
  },
  {
    path: '/inventory',
    title: '库存中心',
    icon: 'House',
    permission: '',
    children: [
      {
        path: '/inventory/stocks',
        title: '库存管理',
        icon: 'Box',
        permission: 'inventory/stocks',
        resource: 'inventory/stocks',
        description: '监控各仓库可用库存、锁定库存与安全预警',
      },
      {
        path: '/inventory/receipts',
        title: '入库管理',
        icon: 'Van',
        permission: 'warehouse-receipts',
        resource: 'warehouse-receipts',
        description: '处理采购订单到货入库验收与分批收货明细',
      },
      {
        path: '/inventory/transactions',
        title: '库存流水',
        icon: 'Sort',
        permission: 'inventory/transactions',
        resource: 'inventory/transactions',
        description: '查询物料出入库变动明细及关联单据',
      },
    ],
  },
  {
    path: '/system',
    title: '系统管理',
    icon: 'Setting',
    permission: '',
    children: [
      {
        path: '/system/employees',
        title: '员工管理',
        icon: 'User',
        permission: 'system/employees',
        resource: 'system/employees',
        description: '管理企业员工档案与系统账号生命周期',
      },
      {
        path: '/system/roles',
        title: '角色管理',
        icon: 'Key',
        permission: 'system/roles',
        resource: 'system/roles',
        description: '配置系统角色权限与功能操作范围',
      },
      {
        path: '/system/permissions',
        title: '权限管理',
        icon: 'Lock',
        permission: 'system/permissions',
        resource: 'system/permissions',
        description: '查看系统所有功能权限点定义',
      },
      {
        path: '/system/audit-logs',
        title: '操作日志',
        icon: 'Clock',
        permission: 'audit-logs',
        resource: 'audit-logs',
        description: '记录系统关键业务操作留痕与审计追踪',
      },
    ],
  },
]
export const pages = menus.flatMap((m) => m.children || [m])
