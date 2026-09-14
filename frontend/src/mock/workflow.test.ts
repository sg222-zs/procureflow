import { beforeEach, describe, expect, it } from 'vitest'
import { handle } from './handlers'
import { resetDb, db } from './db'
import { total } from '../utils/money'
import type { Entity, PageResult } from '../types'
const call = (method: string, path: string, data = {}, role = 'admin') =>
  handle(method, path, data, {}, `mock:${role}`, 'test-trace') as Entity
function draft() {
  return call(
    'POST',
    '/purchase-requests',
    { name: '测试采购', items: [{ skuId: 'SKU-001', quantity: 3 }] },
    'buyer',
  )
}
beforeEach(resetDb)
describe('procurement workflow', () => {
  it('submits, withdraws, rejects with a reason, revises and approves exactly once', () => {
    const pr = draft()
    call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'buyer')
    call('POST', `/purchase-requests/${pr.id}/withdraw`, {}, 'buyer')
    call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'buyer')
    expect(() => call('POST', `/approvals/${pr.id}/reject`, {}, 'approver')).toThrow('驳回原因')
    call('POST', `/approvals/${pr.id}/reject`, { reason: '请补充需求' }, 'approver')
    call('POST', `/purchase-requests/${pr.id}/revise`, {}, 'buyer')
    call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'buyer')
    const approved = call('POST', `/approvals/${pr.id}/approve`, {}, 'approver')
    expect(approved.status).toBe('APPROVED')
    expect(approved.trail).toHaveLength(7)
    expect(() => call('POST', `/approvals/${pr.id}/approve`, {}, 'approver')).toThrow('已处理')
    expect(db['purchase-orders'].filter((o) => o.requestId === pr.id)).toHaveLength(1)
  })
  it('receives partial orders atomically, prevents over-receipt and records stock and audit', () => {
    const pr = draft()
    call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'buyer')
    call('POST', `/approvals/${pr.id}/approve`, {}, 'approver')
    const order = db['purchase-orders'].find((o) => o.requestId === pr.id)!
    const receive = (quantity: number) =>
      call(
        'POST',
        '/warehouse-receipts',
        { orderId: order.id, warehouse: '杭州中心仓', items: [{ skuId: 'SKU-001', quantity }] },
        'warehouse',
      )
    receive(1)
    expect(order.status).toBe('PARTIAL')
    const snapshot = JSON.stringify(db)
    expect(() => receive(3)).toThrow('剩余数量')
    expect(JSON.stringify(db)).toBe(snapshot)
    receive(2)
    expect(order.status).toBe('COMPLETED')
    expect(order.packages).toHaveLength(2)
    expect(db['inventory/stocks'].find((s) => s.id === 'ST-001')?.available).toBe(11)
    expect(db['inventory/transactions'].filter((t) => t.orderId === order.id)).toHaveLength(2)
    expect(db['audit-logs'].filter((a) => a.action === '分批入库')).toHaveLength(2)
    expect(() => receive(1)).toThrow('订单已完成')
  })
  it('enforces role and ownership permissions on the mock API', () => {
    const pr = draft()
    expect(() => call('POST', `/approvals/${pr.id}/approve`, {}, 'buyer')).toThrow('权限')
    expect(() => call('GET', '/system/users', {}, 'warehouse')).toThrow('权限')
    expect(() => call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'warehouse')).toThrow(
      '权限',
    )
    expect(() => handle('GET', '/products')).toThrow('登录')
  })
  it('splits suppliers while preserving immutable prices', () => {
    const pr = call(
      'POST',
      '/purchase-requests',
      {
        name: '多供应商',
        items: [
          { skuId: 'SKU-001', quantity: 2 },
          { skuId: 'SKU-003', quantity: 3 },
        ],
      },
      'buyer',
    )
    call('POST', `/purchase-requests/${pr.id}/submit`, {}, 'buyer')
    call('PUT', '/skus/SKU-001', { price: '300.00' })
    call('POST', `/approvals/${pr.id}/approve`, {}, 'approver')
    const orders = db['purchase-orders'].filter((o) => o.requestId === pr.id)
    expect(orders).toHaveLength(2)
    expect(orders.find((o) => o.supplierId === 'SUP-001')?.amount).toBe('578.00')
  })
  it('rejects duplicate, fractional and negative receipt lines without partial writes', () => {
    const snapshot = JSON.stringify(db)
    for (const items of [
      [
        { skuId: 'SKU-003', quantity: 1 },
        { skuId: 'SKU-003', quantity: 2 },
      ],
      [{ skuId: 'SKU-003', quantity: -1 }],
      [{ skuId: 'SKU-003', quantity: 1.5 }],
    ]) {
      expect(() =>
        call(
          'POST',
          '/warehouse-receipts',
          { orderId: 'PO-001', warehouse: '杭州中心仓', items },
          'warehouse',
        ),
      ).toThrow()
      expect(JSON.stringify(db)).toBe(snapshot)
    }
  })
  it('filters and paginates with the same contract and protects supplier references', () => {
    const result = handle(
      'GET',
      '/purchase-requests',
      {},
      { status: 'DRAFT', page: 1, page_size: 20 },
      'mock:buyer',
    ) as PageResult<Entity>
    expect(result.total).toBe(1)
    expect(result.pageSize).toBe(20)
    expect(() => call('DELETE', '/suppliers/SUP-001')).toThrow('已被引用')
  })
  it('uses integer cents for decimal totals', () => {
    expect(
      total([
        { price: '0.10', quantity: 3 },
        { price: '0.20', quantity: 1 },
      ]),
    ).toBe('0.50')
  })
})

describe('employee and account lifecycle', () => {
  it('authenticates with 8-digit employee ID and handles password changes and account locks', () => {
    // 1. Success login with 00010001
    const s1 = handle('POST', '/auth/login', {
      employee_no: '00010001',
      password: 'demo123',
    }) as any
    expect(s1.user.employeeNo).toBe('00010001')
    expect(s1.user.name).toBe('管理员')

    // 2. Pending account with mustChangePassword flag (00010331)
    const s2 = handle('POST', '/auth/login', {
      employee_no: '00010331',
      password: 'temp123',
    }) as any
    expect(s2.user.mustChangePassword).toBe(true)

    // 3. First login change password
    const res = handle(
      'PUT',
      '/auth/first-login/change-password',
      { new_password: 'newpassword123' },
      {},
      `mock:00010331`,
    ) as any
    expect(res.message).toContain('密码修改成功')
    const emp331 = db['system/employees'].find((e) => e.id === '00010331')!
    expect(emp331.mustChangePassword).toBe(false)
    expect(emp331.accountStatus).toBe('ENABLED')

    // 4. Reject login when disabled (00010329 is TERMINATED & DISABLED)
    expect(() =>
      handle('POST', '/auth/login', { employee_no: '00010329', password: 'demo123' }),
    ).toThrow('账号已停用')

    // 5. Reject login when no account (00010330)
    expect(() =>
      handle('POST', '/auth/login', { employee_no: '00010330', password: 'demo123' }),
    ).toThrow('尚未开通')

    // 6. Wrong password increments failedLoginCount and locks after 5 attempts
    const emp327 = db['system/employees'].find((e) => e.id === '00010327')!
    emp327.failedLoginCount = 4
    expect(() =>
      handle('POST', '/auth/login', { employee_no: '00010327', password: 'wrong' }),
    ).toThrow('已自动锁定')
    expect(emp327.accountStatus).toBe('LOCKED')
  })

  it('manages full employee lifecycle: create, open-account, reset-password, toggle-status, unlock, assign-role, terminate', () => {
    // 1. Create employee without account
    const createRes1 = handle(
      'POST',
      '/system/employees',
      {
        name: '新人小赵',
        department: '采购部',
        position: '助理专员',
        openAccount: false,
      },
      {},
      'mock:admin',
    ) as any
    expect(createRes1.employee.id).toMatch(/^\d{8}$/)
    expect(createRes1.employee.accountStatus).toBe('NONE')
    const newId = createRes1.employee.id

    // 2. Open account for employee
    const openRes = handle(
      'POST',
      `/system/employees/${newId}/open-account`,
      { role: 'buyer', passwordType: 'SPECIFIED', customPassword: 'custompass123' },
      {},
      'mock:admin',
    ) as any
    expect(openRes.tempPassword).toBe('custompass123')
    expect(openRes.employee.accountStatus).toBe('PENDING')
    expect(openRes.employee.mustChangePassword).toBe(true)

    // 3. Reset password
    const resetRes = handle(
      'POST',
      `/system/employees/${newId}/reset-password`,
      {},
      {},
      'mock:admin',
    ) as any
    expect(resetRes.tempPassword).toMatch(/^PF/)

    // 4. Toggle account status (disable / enable)
    handle(
      'POST',
      `/system/employees/${newId}/account-status`,
      { accountStatus: 'DISABLED', reason: '测试停用' },
      {},
      'mock:admin',
    )
    let emp = db['system/employees'].find((e) => e.id === newId)!
    expect(emp.accountStatus).toBe('DISABLED')
    expect(emp.disabledReason).toBe('测试停用')

    handle(
      'POST',
      `/system/employees/${newId}/account-status`,
      { accountStatus: 'ENABLED' },
      {},
      'mock:admin',
    )
    expect(emp.accountStatus).toBe('ENABLED')

    // 5. Unlock
    emp.accountStatus = 'LOCKED'
    emp.failedLoginCount = 5
    handle('POST', `/system/employees/${newId}/unlock`, {}, {}, 'mock:admin')
    expect(emp.accountStatus).toBe('ENABLED')
    expect(emp.failedLoginCount).toBe(0)

    // 6. Assign role
    handle('POST', `/system/employees/${newId}/assign-role`, { role: 'approver' }, {}, 'mock:admin')
    expect(emp.role).toBe('approver')

    // 7. Terminate employee
    handle(
      'POST',
      `/system/employees/${newId}/terminate`,
      { terminationDate: '2026-09-30', terminationReason: '合同到期' },
      {},
      'mock:admin',
    )
    expect(emp.employmentStatus).toBe('TERMINATED')
    expect(emp.accountStatus).toBe('DISABLED')
    expect(emp.terminationReason).toBe('合同到期')
  })
})
