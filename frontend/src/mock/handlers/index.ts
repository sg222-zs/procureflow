import type { Dashboard, Employee, Entity, Item, Query, Resource, Session } from '../../types'
import { ApiError } from '../../api/error'
import { cents, decimal, total } from '../../utils/money'
import { db } from '../db'
import { rolePermissions } from '../fixtures'

const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
const fail = (status: number, message: string): never => {
  throw new ApiError(status, status, message)
}
const find = (resource: Resource, key?: string) =>
  db[resource].find((r) => r.id === key) || fail(404, '记录不存在')

export const roleNames: Record<string, string> = {
  admin: '系统管理员',
  buyer: '采购专员',
  approver: '审批经理',
  warehouse: '仓库管理员',
}

export function sessionFor(tokenKey: string): Session {
  let emp = db['system/employees']?.find((e) => e.id === tokenKey)
  let user = db['system/users']?.find((u) => u.id === tokenKey)
  if (!emp && user) {
    emp = db['system/employees']?.find((e) => e.id === user?.employeeNo)
  }
  if (!user && emp) {
    user = db['system/users']?.find((u) => u.employeeNo === emp?.id)
  }

  if (emp) {
    if (emp.accountStatus === 'DISABLED') fail(403, '账号已停用，请联系系统管理员')
    if (emp.accountStatus === 'LOCKED') fail(423, '账号已锁定，请联系管理员解锁')
    if (emp.accountStatus === 'NONE') fail(403, '该员工尚未开通系统账号')
    const roleId = emp.role || 'buyer'
    const roleObj = db['system/roles']?.find((r) => r.id === roleId)
    const perms =
      roleObj?.permissions || (roleId === 'admin' ? ['*:*:*'] : rolePermissions[roleId] || [])
    return {
      accessToken: `mock:${emp.id}`,
      user: {
        id: user ? user.id : emp.id,
        employeeNo: emp.id,
        name: emp.name,
        role: roleId,
        department: emp.department || '',
        position: emp.position || '',
        mustChangePassword: Boolean(emp.mustChangePassword),
        accountStatus: emp.accountStatus || 'ENABLED',
      },
      permissions: perms,
    }
  }

  if (user) {
    if (user.status !== 'ACTIVE') fail(403, '账号已停用')
    const roleObj = db['system/roles']?.find((r) => r.id === user?.role)
    const perms =
      roleObj?.permissions ||
      (user.role === 'admin' ? ['*:*:*'] : rolePermissions[user.role!] || [])
    return {
      accessToken: `mock:${user.id}`,
      user: {
        id: user.id,
        employeeNo: user.employeeNo || '00010001',
        name: user.name,
        role: user.role!,
        department: user.department!,
        position: '员工',
        mustChangePassword: false,
        accountStatus: 'ENABLED',
      },
      permissions: perms,
    }
  }

  return fail(404, '记录不存在')
}
const can = (session: Session, permission: string) =>
  session.permissions.includes('*:*:*') || session.permissions.includes(permission)
function requirePermission(session: Session, permission: string) {
  if (!can(session, permission)) fail(403, '当前角色没有此操作权限')
}
function audit(session: Session, action: string, module: string, target: string, traceId: string) {
  db['audit-logs'].unshift({
    id: id('LOG'),
    name: target,
    status: 'ACTIVE',
    createdAt: now(),
    actor: session.user.name,
    module,
    action,
    traceId,
  })
}
function requestItems(input: Partial<Entity>): Item[] {
  if (!Array.isArray(input.items) || !input.items.length) return fail(400, '至少添加一条采购明细')
  const seen = new Set<string>()
  return input.items.map((item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100000)
      fail(400, '采购数量必须为 1–100000 的整数')
    if (seen.has(item.skuId)) fail(400, '采购明细不能重复选择 SKU')
    seen.add(item.skuId)
    const sku = find('skus', item.skuId)
    if (
      sku.status !== 'ACTIVE' ||
      find('products', sku.productId).status !== 'ACTIVE' ||
      find('suppliers', sku.supplierId).status !== 'ACTIVE'
    )
      fail(409, '商品、SKU 或供应商已停用')
    return {
      skuId: sku.id,
      name: sku.name,
      price: sku.price!,
      quantity: item.quantity,
      received: 0,
    }
  })
}
function own(session: Session, row: Entity) {
  if (session.user.role !== 'admin' && row.applicantId !== session.user.id)
    fail(403, '只能操作自己的申请')
}
function paged(rows: Entity[], query: Query) {
  let list = rows.filter((row) => {
    const keyword = String(query.keyword || '').toLowerCase()
    const employmentStatus = query.employmentStatus || query.employment_status
    const accountStatus = query.accountStatus || query.account_status
    return (
      (!keyword || JSON.stringify(row).toLowerCase().includes(keyword)) &&
      (!query.status || row.status === query.status) &&
      (!employmentStatus || row.employmentStatus === employmentStatus) &&
      (!accountStatus || row.accountStatus === accountStatus) &&
      (!query.supplierId || row.supplierId === query.supplierId) &&
      (!query.category || row.category === query.category) &&
      (!query.department || row.department === query.department) &&
      (!query.warehouse || row.warehouse === query.warehouse) &&
      (!query.skuId || row.skuId === query.skuId) &&
      (!query.orderId || row.orderId === query.orderId) &&
      (!query.start || row.createdAt.slice(0, 10) >= String(query.start)) &&
      (!query.end || row.createdAt.slice(0, 10) <= String(query.end))
    )
  })
  if (query.tab === 'pending') list = list.filter((r) => r.status === 'PENDING_APPROVAL')
  if (query.tab === 'processed')
    list = list.filter((r) => ['APPROVED', 'REJECTED'].includes(r.status))
  const page = Math.max(1, Number(query.page) || 1),
    pageSize = Math.min(1000, Math.max(1, Number(query.page_size) || 20))
  return {
    items: list.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: list.length,
  }
}

/** Synchronous mutations make validation + updates atomic after the simulated network delay. */
export function handle(
  method: string,
  path: string,
  input: Partial<Entity> & {
    name?: string
    department?: string
    position?: string
    phone?: string
    email?: string
    hireDate?: string
    hire_date?: string
    employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
    employment_status?: string
    username?: string
    employee_no?: string
    employeeNo?: string
    password?: string
    reason?: string
    old_password?: string
    oldPassword?: string
    new_password?: string
    newPassword?: string
    temp_password?: string
    tempPassword?: string
    openAccount?: boolean
    initialRole?: string
    passwordType?: string
    customPassword?: string
    accountStatus?: string
    terminationDate?: string
    terminationReason?: string
    terminationNote?: string
    [key: string]: any
  } = {},
  query: Query = {},
  token = '',
  traceId = id('REQ'),
): unknown {
  if (path === '/auth/login' && method === 'POST') {
    const key = (input.employee_no || input.employeeNo || input.username || '').trim()
    const password = (input.password || '').trim()

    let emp = db['system/employees']?.find((e) => e.id === key)
    let user = db['system/users']?.find((u) => u.id === key)
    if (!emp && user) {
      emp = db['system/employees']?.find((e) => e.id === user?.employeeNo)
    }

    if (!emp && !user) {
      fail(401, '工号或密码错误')
    }

    if (emp) {
      if (emp.accountStatus === 'DISABLED') {
        fail(403, '账号已停用，请联系系统管理员')
      }
      if (emp.accountStatus === 'LOCKED') {
        fail(423, '账号因连续多次输入错误已锁定，请联系管理员解锁')
      }
      if (emp.accountStatus === 'NONE') {
        fail(403, '该员工尚未开通系统账号，请联系管理员')
      }

      const validPasswords = ['demo123']
      if (emp.id === '00010331') validPasswords.push('temp123')
      if (emp.password) validPasswords.push(String(emp.password))

      if (!validPasswords.includes(password)) {
        emp.failedLoginCount = (emp.failedLoginCount || 0) + 1
        if (emp.failedLoginCount >= 5) {
          emp.accountStatus = 'LOCKED'
          emp.lockedAt = now()
          fail(423, '密码连续错误达到 5 次，账号已自动锁定，请联系系统管理员')
        }
        fail(401, `工号或密码错误（已连续失败 ${emp.failedLoginCount} 次，满 5 次将被锁定）`)
      }

      emp.failedLoginCount = 0
      emp.lastLoginAt = now()
      return sessionFor(emp.id)
    }

    if (!['admin', 'buyer', 'approver', 'warehouse'].includes(key) || password !== 'demo123') {
      fail(401, '演示账号或密码错误')
    }
    return sessionFor(key)
  }

  if (!token.startsWith('mock:')) fail(401, '请先登录')
  const session = sessionFor(token.slice(5))
  if (path === '/users/me') return session

  if (path === '/auth/first-login/change-password' && method === 'PUT') {
    const newPassword = (input.new_password || input.newPassword || '').trim()
    if (!newPassword || newPassword.length < 8) {
      fail(400, '新密码长度不能少于 8 位')
    }
    const emp = db['system/employees']?.find((e) => e.id === session.user.employeeNo)
    if (emp) {
      emp.mustChangePassword = false
      if (emp.accountStatus === 'PENDING') emp.accountStatus = 'ENABLED'
      emp.password = newPassword
      emp.passwordUpdatedAt = now()
      audit(session, '首次登录修改密码', '员工管理', emp.id, traceId)
    }
    return { message: '密码修改成功，请重新登录' }
  }

  if ((path === '/me/password' || path === '/api/v1/me/password') && method === 'PUT') {
    const newPassword = (input.new_password || input.newPassword || '').trim()
    if (!newPassword || newPassword.length < 8) {
      fail(400, '新密码长度不能少于 8 位')
    }
    const emp = db['system/employees']?.find((e) => e.id === session.user.employeeNo)
    if (emp) {
      emp.password = newPassword
      emp.passwordUpdatedAt = now()
      audit(session, '修改个人密码', '员工管理', emp.id, traceId)
    }
    return { message: '密码修改成功' }
  }
  if (path === '/dashboard') {
    requirePermission(session, 'dashboard')
    const lowStocks = db['inventory/stocks'].filter((r) => r.available! < r.threshold!)
    const trend = Array.from({ length: 7 }, (_, i) => {
      const day = new Date()
      day.setDate(day.getDate() - 6 + i)
      const date = day.toISOString().slice(0, 10)
      const amount = db['purchase-orders']
        .filter((r) => r.createdAt.startsWith(date))
        .reduce((sum, r) => sum + cents(r.amount!), 0n)
      return { date: date.slice(5), amount: Number(amount) / 100 }
    })
    return {
      requestCount: db['purchase-requests'].length,
      pendingCount: db['purchase-requests'].filter((r) => r.status === 'PENDING_APPROVAL').length,
      orderAmount: decimal(db['purchase-orders'].reduce((sum, r) => sum + cents(r.amount!), 0n)),
      lowStockCount: lowStocks.length,
      recentOrders: db['purchase-orders'].slice(0, 5),
      lowStocks,
      trend,
    } satisfies Dashboard
  }
  const resource = (Object.keys(db) as Resource[])
    .sort((a, b) => b.length - a.length)
    .find((r) => path === `/${r}` || path.startsWith(`/${r}/`))
  if (!resource) return fail(404, '此接口尚未实现')
  const [key, action] = path.slice(resource.length + 2).split('/')
  if (method === 'GET') {
    requirePermission(session, resource)
    let rows =
      resource === 'approvals'
        ? db['purchase-requests'].filter(
            (r) =>
              (r.approverRole === session.user.role || session.user.role === 'admin') &&
              ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(r.status),
          )
        : db[resource]
    if (resource === 'purchase-requests' && session.user.role !== 'admin')
      rows = rows.filter((r) => r.applicantId === session.user.id)
    if (resource === 'system/employees' && key) {
      const emp = find('system/employees', key) as unknown as Employee
      const roleId = emp.role || ''
      const roleObj = db['system/roles']?.find((r) => r.id === roleId)
      const perms =
        roleObj?.permissions || (roleId === 'admin' ? ['*:*:*'] : rolePermissions[roleId] || [])
      const account = emp.hasAccount
        ? {
            employeeNo: emp.id,
            accountStatus: emp.accountStatus || 'ENABLED',
            role: emp.role || '',
            roleName: emp.roleName || (emp.role ? roleNames[emp.role] : '-'),
            lastLoginAt: emp.lastLoginAt,
            passwordUpdatedAt: emp.passwordUpdatedAt,
            failedLoginCount: emp.failedLoginCount || 0,
            mustChangePassword: Boolean(emp.mustChangePassword),
            lockedAt: emp.lockedAt,
            disabledReason: emp.disabledReason,
          }
        : undefined
      return structuredClone({
        ...emp,
        account,
        permissions: perms,
      })
    }
    return key
      ? structuredClone(rows.find((r) => r.id === key) || fail(404, '记录不存在'))
      : structuredClone(paged(rows, query))
  }
  if (resource === 'system/employees') {
    requirePermission(session, 'system/employees')
    if (method === 'POST' && !key) {
      if (!input.name?.trim()) fail(400, '请填写真实姓名')
      if (!input.department?.trim()) fail(400, '请选择所属部门')
      if (!input.position?.trim()) fail(400, '请填写职位')
      const nums = db['system/employees'].map((e) => parseInt(e.id, 10)).filter((n) => !isNaN(n))
      const nextNum = (nums.length ? Math.max(...nums) : 10000) + 1
      const empId = String(nextNum).padStart(8, '0')

      let tempPassword = ''
      const hasAccount = Boolean(input.openAccount)
      const accountStatus = hasAccount ? 'PENDING' : 'NONE'
      const role = input.initialRole || (hasAccount ? 'buyer' : '')
      const roleName = role ? roleNames[role] || role : '-'
      if (hasAccount) {
        if (input.passwordType === 'SPECIFIED' && input.customPassword) {
          tempPassword = String(input.customPassword)
        } else {
          tempPassword = 'PF' + Math.random().toString(36).slice(2, 8).toUpperCase()
        }
      }
      const emp: Entity & Employee = {
        id: empId,
        name: input.name!.trim(),
        status: 'ACTIVE',
        createdAt: now(),
        department: input.department!,
        position: input.position!,
        phone: input.phone?.trim() || '',
        email: input.email?.trim() || '',
        hireDate: (input.hireDate || input.hire_date || now().slice(0, 10)) as string,
        employmentStatus: 'ACTIVE',
        hasAccount,
        accountStatus,
        role,
        roleName,
        failedLoginCount: 0,
        mustChangePassword: hasAccount,
        password: tempPassword || 'demo123',
        passwordUpdatedAt: hasAccount ? now() : undefined,
      }
      db['system/employees'].unshift(emp)
      audit(session, '新增员工', '员工管理', emp.id, traceId)
      return { employee: structuredClone(emp), tempPassword }
    }

    if (method === 'PUT' && key && !action) {
      const emp = find('system/employees', key) as unknown as Employee
      if (input.name?.trim()) emp.name = input.name.trim()
      if (input.department?.trim()) emp.department = input.department.trim()
      if (input.position?.trim()) emp.position = input.position.trim()
      if (input.phone !== undefined) emp.phone = input.phone.trim()
      if (input.email !== undefined) emp.email = input.email.trim()
      if (input.hireDate || input.hire_date)
        emp.hireDate = (input.hireDate || input.hire_date) as string
      if (input.employmentStatus) emp.employmentStatus = input.employmentStatus as any
      emp.updatedAt = now()
      audit(session, '编辑员工资料', '员工管理', emp.id, traceId)
      return structuredClone(emp)
    }

    if (action === 'open-account') {
      const emp = find('system/employees', key) as unknown as Employee
      if (emp.employmentStatus === 'TERMINATED') fail(400, '已离职员工不能开通系统账号')
      let tempPassword = ''
      if (input.passwordType === 'SPECIFIED' && input.customPassword) {
        tempPassword = String(input.customPassword)
      } else {
        tempPassword = 'PF' + Math.random().toString(36).slice(2, 8).toUpperCase()
      }
      emp.hasAccount = true
      emp.accountStatus = 'PENDING'
      emp.mustChangePassword = true
      emp.role = (input.role as string) || 'buyer'
      emp.roleName = roleNames[emp.role] || emp.role
      emp.password = tempPassword
      emp.passwordUpdatedAt = now()
      emp.failedLoginCount = 0
      audit(session, '开通系统账号', '员工管理', emp.id, traceId)
      return { employee: structuredClone(emp), tempPassword }
    }

    if (action === 'reset-password') {
      const emp = find('system/employees', key) as unknown as Employee
      if (!emp.hasAccount || emp.accountStatus === 'NONE') fail(400, '该员工尚未开通系统账号')
      if (emp.employmentStatus === 'TERMINATED') fail(400, '已离职员工不能重置密码')
      const tempPassword = 'PF' + Math.random().toString(36).slice(2, 8).toUpperCase()
      emp.password = tempPassword
      emp.mustChangePassword = true
      emp.passwordUpdatedAt = now()
      emp.failedLoginCount = 0
      if (emp.accountStatus === 'LOCKED') emp.accountStatus = 'ENABLED'
      audit(session, '重置员工密码', '员工管理', emp.id, traceId)
      return { tempPassword }
    }

    if (action === 'account-status') {
      const emp = find('system/employees', key) as unknown as Employee
      if (!emp.hasAccount || emp.accountStatus === 'NONE') fail(400, '该员工尚未开通系统账号')
      const status = input.accountStatus as string
      if (!['ENABLED', 'DISABLED'].includes(status)) fail(400, '无效的账号状态')
      emp.accountStatus = status as any
      if (status === 'DISABLED') {
        emp.disabledReason = (input.reason as string) || '管理员手动停用'
      } else {
        emp.disabledReason = undefined
      }
      audit(
        session,
        status === 'DISABLED' ? '停用系统账号' : '启用系统账号',
        '员工管理',
        emp.id,
        traceId,
      )
      return structuredClone(emp)
    }

    if (action === 'unlock') {
      const emp = find('system/employees', key) as unknown as Employee
      emp.accountStatus = 'ENABLED'
      emp.failedLoginCount = 0
      emp.lockedAt = undefined
      audit(session, '解锁系统账号', '员工管理', emp.id, traceId)
      return structuredClone(emp)
    }

    if (action === 'assign-role') {
      const emp = find('system/employees', key) as unknown as Employee
      if (!emp.hasAccount || emp.accountStatus === 'NONE') fail(400, '该员工尚未开通系统账号')
      const role = input.role as string
      if (!role) fail(400, '请选择角色')
      emp.role = role
      emp.roleName = roleNames[role] || role
      audit(session, '分配角色', '员工管理', emp.id, traceId)
      return structuredClone(emp)
    }

    if (action === 'terminate') {
      const emp = find('system/employees', key) as unknown as Employee
      emp.employmentStatus = 'TERMINATED'
      if (emp.hasAccount) {
        emp.accountStatus = 'DISABLED'
        emp.disabledReason = '员工离职自动禁用账号'
      }
      emp.terminationDate = (input.terminationDate as string) || now().slice(0, 10)
      emp.terminationReason = (input.terminationReason as string) || '离职'
      emp.terminationNote = (input.terminationNote as string) || ''
      audit(session, '办理员工离职', '员工管理', emp.id, traceId)
      return structuredClone(emp)
    }
  }
  if (resource === 'purchase-requests') {
    requirePermission(session, 'request:write')
    if (!key || (method === 'PUT' && !action)) {
      const previous = key ? find(resource, key) : undefined
      if (previous) {
        own(session, previous)
        if (previous.status !== 'DRAFT') fail(409, '只有草稿可以编辑')
      }
      if (!input.name?.trim()) fail(400, '请填写申请标题')
      const items = requestItems(input)
      const row: Entity = {
        id: previous?.id || id('PR'),
        name: input.name!.trim(),
        status: 'DRAFT',
        createdAt: previous?.createdAt || now(),
        applicantId: session.user.id,
        applicant: session.user.name,
        department: session.user.department,
        approverRole: 'approver',
        items,
        amount: total(items),
        note: input.note,
        trail: previous?.trail || [],
      }
      if (previous) Object.assign(previous, row)
      else db[resource].unshift(row)
      audit(session, previous ? '编辑申请' : '新建申请', '采购申请', row.id, traceId)
      return structuredClone(row)
    }
    const row = find(resource, key)
    own(session, row)
    const target: Record<string, [string, string, string]> = {
      submit: ['DRAFT', 'PENDING_APPROVAL', '提交审批'],
      withdraw: ['PENDING_APPROVAL', 'DRAFT', '撤回申请'],
      cancel: ['DRAFT', 'CANCELLED', '取消申请'],
      revise: ['REJECTED', 'DRAFT', '修订申请'],
    }
    const transition = target[action!]
    if (!transition || row.status !== transition[0]) fail(409, '当前状态不允许此操作，请刷新后重试')
    if (action === 'submit') requestItems(row)
    row.status = transition![1]
    row.trail!.push({ at: now(), actor: session.user.name, action: transition![2] })
    audit(session, transition![2], '采购申请', row.id, traceId)
    return structuredClone(row)
  }
  if (resource === 'approvals') {
    requirePermission(session, 'approval:write')
    const row = find('purchase-requests', key)
    if (session.user.role !== 'admin' && row.approverRole !== session.user.role)
      fail(403, '该申请不属于当前审批角色')
    if (row.status !== 'PENDING_APPROVAL') fail(409, '该申请已处理或已撤回')
    if (!['approve', 'reject'].includes(action!)) fail(400, '无效审批动作')
    if (action === 'reject' && !input.reason?.trim()) fail(400, '驳回原因不能为空')
    if (action === 'approve') {
      // Validate references before writing either approval or orders.
      const grouped = new Map<string, Item[]>()
      row.items!.forEach((item) => {
        const sku = find('skus', item.skuId)
        const supplier = find('suppliers', sku.supplierId)
        if (
          supplier.status !== 'ACTIVE' ||
          sku.status !== 'ACTIVE' ||
          find('products', sku.productId).status !== 'ACTIVE'
        )
          fail(409, '采购明细的商品或供应商已停用')
        grouped.set(supplier.id, [...(grouped.get(supplier.id) || []), structuredClone(item)])
      })
      grouped.forEach((items, supplierId) => {
        const order: Entity = {
          id: id('PO'),
          name: row.name,
          status: 'ORDERED',
          createdAt: now(),
          requestId: row.id,
          supplierId,
          items,
          amount: total(items),
          packages: [],
        }
        db['purchase-orders'].unshift(order)
        audit(session, '创建订单', '采购订单', order.id, traceId)
      })
    }
    row.status = action === 'approve' ? 'APPROVED' : 'REJECTED'
    row.trail!.push({
      at: now(),
      actor: session.user.name,
      action: action === 'approve' ? '批准' : '驳回',
      reason: input.reason?.trim(),
    })
    audit(session, action === 'approve' ? '批准' : '驳回', '审批中心', row.id, traceId)
    return structuredClone(row)
  }
  if (resource === 'warehouse-receipts' && method === 'POST') {
    requirePermission(session, 'receipt:write')
    const order = find('purchase-orders', input.orderId)
    if (!['ORDERED', 'PARTIAL'].includes(order.status)) fail(409, '订单已完成，不能继续入库')
    if (!['杭州中心仓', '上海分仓'].includes(input.warehouse || '')) fail(400, '请选择有效仓库')
    if (!input.items?.length) fail(400, '请填写本次入库数量')
    const seen = new Set<string>()
    const lines = input.items!.map((line) => {
      const planned = order.items!.find((i) => i.skuId === line.skuId)
      if (
        !planned ||
        seen.has(line.skuId) ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > planned.quantity - planned.received
      )
        fail(409, '入库数量必须为正整数且不能超过剩余数量')
      seen.add(line.skuId)
      return { ...planned!, quantity: line.quantity, received: line.quantity }
    })
    const receipt: Entity = {
      id: id('RC'),
      name: order.name,
      status: 'COMPLETED',
      createdAt: now(),
      orderId: order.id,
      warehouse: input.warehouse,
      quantity: lines.reduce((n, i) => n + i.quantity, 0),
      items: lines,
    }
    lines.forEach((line) => {
      const planned = order.items!.find((i) => i.skuId === line.skuId)!
      planned.received += line.quantity
      let stock = db['inventory/stocks'].find(
        (s) => s.skuId === line.skuId && s.warehouse === input.warehouse,
      )
      if (!stock) {
        stock = {
          id: id('ST'),
          name: line.name,
          createdAt: now(),
          status: 'OK',
          skuId: line.skuId,
          warehouse: input.warehouse,
          available: 0,
          locked: 0,
          threshold: 10,
        }
        db['inventory/stocks'].push(stock)
      }
      stock.available! += line.quantity
      stock.status = stock.available! < stock.threshold! ? 'LOW' : 'OK'
      db['inventory/transactions'].unshift({
        id: id('TX'),
        name: line.name,
        createdAt: now(),
        status: 'INBOUND',
        action: 'INBOUND',
        skuId: line.skuId,
        warehouse: input.warehouse,
        orderId: order.id,
        note: receipt.id,
        quantity: line.quantity,
      })
    })
    order.status = order.items!.every((i) => i.received === i.quantity) ? 'COMPLETED' : 'PARTIAL'
    order.packages!.push({
      id: id('PKG'),
      status: 'COMPLETED',
      quantity: receipt.quantity!,
      warehouse: input.warehouse!,
      at: now(),
    })
    db[resource].unshift(receipt)
    audit(session, '分批入库', '库存管理', receipt.id, traceId)
    return structuredClone(receipt)
  }
  if (['suppliers', 'products', 'skus'].includes(resource)) {
    requirePermission(session, 'catalog:write')
    const previous = key ? find(resource, key) : undefined
    if (method === 'DELETE') {
      if (resource !== 'suppliers') fail(405, '此资源不支持删除')
      if (
        db.skus.some((s) => s.supplierId === key) ||
        db['purchase-orders'].some((o) => o.supplierId === key)
      )
        fail(409, '供应商已被引用，请使用停用')
      db.suppliers = db.suppliers.filter((s) => s.id !== key)
      audit(session, '删除供应商', resource, key!, traceId)
      return null
    }
    if (!['POST', 'PUT'].includes(method)) fail(405, '不支持的请求方法')
    const value = { ...previous, ...input }
    if (!value.name?.trim()) fail(400, '名称不能为空')
    if (!['ACTIVE', 'INACTIVE'].includes(value.status || 'ACTIVE')) fail(400, '无效状态')
    if (
      resource === 'suppliers' &&
      (!value.contact?.trim() || !/^[+\d ()-]{6,25}$/.test(value.phone || ''))
    )
      fail(400, '请填写联系人和有效联系电话')
    if (resource === 'products' && !value.category?.trim()) fail(400, '请选择商品分类')
    if (resource === 'skus') {
      if (!value.productId || !value.supplierId || !value.spec?.trim())
        fail(400, '请选择商品、供应商并填写规格')
      find('products', value.productId)
      find('suppliers', value.supplierId)
      try {
        if (cents(value.price || '') <= 0n) fail(400, '价格必须大于零')
      } catch {
        fail(400, '价格必须为正数且最多两位小数')
      }
      value.price = decimal(cents(value.price!))
    }
    const row: Entity = {
      ...value,
      id: previous?.id || id(resource.slice(0, 3).toUpperCase()),
      name: value.name!.trim(),
      status: value.status || 'ACTIVE',
      createdAt: previous?.createdAt || now(),
    }
    if (previous) Object.assign(previous, row)
    else db[resource].unshift(row)
    audit(session, previous ? '编辑' : '新建', resource, row.id, traceId)
    return structuredClone(row)
  }
  return fail(405, 'Starter 阶段此资源仅支持查看')
}
