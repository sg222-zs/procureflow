<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, MoreFilled, CopyDocument } from '@element-plus/icons-vue'
import type { Employee } from '../types'
import {
  listEmployees,
  createEmployee,
  openEmployeeAccount,
  resetEmployeePassword,
  toggleEmployeeAccountStatus,
  unlockEmployeeAccount,
  terminateEmployee,
} from '../api/system'
import StatusBadge from '../components/StatusBadge.vue'

const router = useRouter()

const loading = ref(false)
const employees = ref<Employee[]>([])
const total = ref(0)

const query = reactive({
  keyword: '',
  department: '',
  employmentStatus: '',
  accountStatus: '',
  page: 1,
  pageSize: 20,
})

const departments = ['运营中心', '采购部', '财务部', '仓储部']
const roleOptions = [
  { id: 'buyer', name: '采购专员' },
  { id: 'approver', name: '审批经理' },
  { id: 'warehouse', name: '仓库管理员' },
  { id: 'admin', name: '系统管理员' },
]

async function loadData() {
  loading.value = true
  try {
    const res = await listEmployees({
      keyword: query.keyword.trim() || undefined,
      department: query.department || undefined,
      employmentStatus: query.employmentStatus || undefined,
      accountStatus: query.accountStatus || undefined,
      page: query.page,
      page_size: query.pageSize,
    })
    employees.value = res.items
    total.value = res.total
  } catch {
    /* handled */
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.keyword = ''
  query.department = ''
  query.employmentStatus = ''
  query.accountStatus = ''
  query.page = 1
  loadData()
}

function toDetail(id: string) {
  router.push(`/system/employees/${id}`)
}

// ================= Create Employee Drawer =================
const drawerVisible = ref(false)
const submitting = ref(false)
const createForm = reactive({
  name: '',
  department: '采购部',
  position: '',
  phone: '',
  email: '',
  hireDate: new Date().toISOString().slice(0, 10),
  openAccount: true,
  initialRole: 'buyer',
  passwordType: 'RANDOM' as 'RANDOM' | 'SPECIFIED',
  customPassword: '',
})

function openCreateDrawer() {
  createForm.name = ''
  createForm.department = '采购部'
  createForm.position = ''
  createForm.phone = ''
  createForm.email = ''
  createForm.hireDate = new Date().toISOString().slice(0, 10)
  createForm.openAccount = true
  createForm.initialRole = 'buyer'
  createForm.passwordType = 'RANDOM'
  createForm.customPassword = ''
  drawerVisible.value = true
}

async function handleCreateSubmit() {
  if (!createForm.name.trim()) {
    ElMessage.warning('请填写真实姓名')
    return
  }
  if (!createForm.department) {
    ElMessage.warning('请选择所属部门')
    return
  }
  if (!createForm.position.trim()) {
    ElMessage.warning('请填写岗位职务')
    return
  }
  if (createForm.openAccount && createForm.passwordType === 'SPECIFIED') {
    if (!createForm.customPassword || createForm.customPassword.length < 8) {
      ElMessage.warning('指定初始密码至少需要 8 位字符')
      return
    }
  }

  submitting.value = true
  try {
    const res = await createEmployee({
      name: createForm.name.trim(),
      department: createForm.department,
      position: createForm.position.trim(),
      phone: createForm.phone.trim(),
      email: createForm.email.trim(),
      hireDate: createForm.hireDate,
      openAccount: createForm.openAccount,
      initialRole: createForm.initialRole,
      passwordType: createForm.passwordType,
      customPassword: createForm.customPassword,
    })
    drawerVisible.value = false
    ElMessage.success('员工档案创建成功')
    await loadData()
    if (res.tempPassword) {
      showCredentialModal(res.employee.name, res.employee.id, res.tempPassword)
    }
  } catch {
    /* error handled */
  } finally {
    submitting.value = false
  }
}

// ================= Temporary Credential Modal =================
const credentialVisible = ref(false)
const credentialData = reactive({
  name: '',
  employeeNo: '',
  tempPassword: '',
})

function showCredentialModal(name: string, employeeNo: string, pass: string) {
  credentialData.name = name
  credentialData.employeeNo = employeeNo
  credentialData.tempPassword = pass
  credentialVisible.value = true
}

function copyPassword() {
  navigator.clipboard.writeText(credentialData.tempPassword)
  ElMessage.success('初始临时密码已复制到剪贴板')
}

// ================= Quick Actions =================
// 1. Open Account
const openAccountVisible = ref(false)
const openAccountTarget = ref<Employee | null>(null)
const openAccountRole = ref('buyer')
const openAccountPasswordType = ref<'RANDOM' | 'SPECIFIED'>('RANDOM')
const openAccountCustomPassword = ref('')
const openAccountLoading = ref(false)

function handleOpenAccount(row: Employee) {
  openAccountTarget.value = row
  openAccountRole.value = 'buyer'
  openAccountPasswordType.value = 'RANDOM'
  openAccountCustomPassword.value = ''
  openAccountVisible.value = true
}

async function submitOpenAccount() {
  if (!openAccountTarget.value) return
  if (openAccountPasswordType.value === 'SPECIFIED') {
    if (!openAccountCustomPassword.value || openAccountCustomPassword.value.length < 8) {
      ElMessage.warning('指定初始密码至少需要 8 位字符')
      return
    }
  }
  openAccountLoading.value = true
  try {
    const res = await openEmployeeAccount(openAccountTarget.value.id, {
      role: openAccountRole.value,
      passwordType: openAccountPasswordType.value,
      customPassword: openAccountCustomPassword.value,
    })
    openAccountVisible.value = false
    ElMessage.success(`已为员工 ${openAccountTarget.value.name} 开通系统账号`)
    await loadData()
    if (res.tempPassword) {
      showCredentialModal(
        openAccountTarget.value.name,
        openAccountTarget.value.id,
        res.tempPassword,
      )
    }
  } catch {
    /* handled */
  } finally {
    openAccountLoading.value = false
  }
}

// 2. Reset Password
async function handleResetPassword(row: Employee) {
  try {
    await ElMessageBox.confirm(
      `确定要重置员工 ${row.name} (${row.id}) 的系统密码吗？重置后将生成新的临时密码，员工需在下次登录时强制修改。`,
      '重置密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    const res = await resetEmployeePassword(row.id)
    ElMessage.success('密码已重置')
    await loadData()
    showCredentialModal(row.name, row.id, res.tempPassword)
  } catch {
    /* cancelled */
  }
}

// 3. Toggle Status (Disable / Enable)
async function handleToggleStatus(row: Employee, targetStatus: 'ENABLED' | 'DISABLED') {
  const isDisable = targetStatus === 'DISABLED'
  let reason = ''
  if (isDisable) {
    try {
      const { value } = await ElMessageBox.prompt(
        `请输入停用员工 ${row.name} (${row.id}) 系统账号的原因：`,
        '停用账号确认',
        {
          confirmButtonText: '确认停用',
          cancelButtonText: '取消',
          inputPlaceholder: '如：短期外派暂停权限 / 涉嫌违规风险排查',
          inputValidator: (v) => (!v?.trim() ? '请输入停用原因' : true),
        },
      )
      reason = value
    } catch {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm(
        `确定要重新启用员工 ${row.name} (${row.id}) 的系统账号吗？启用后该员工可正常登录系统。`,
        '启用账号确认',
        { confirmButtonText: '确认启用', cancelButtonText: '取消', type: 'info' },
      )
    } catch {
      return
    }
  }

  try {
    await toggleEmployeeAccountStatus(row.id, targetStatus, reason)
    ElMessage.success(isDisable ? '账号已停用' : '账号已恢复启用')
    await loadData()
  } catch {
    /* handled */
  }
}

// 4. Unlock Account
async function handleUnlock(row: Employee) {
  try {
    await ElMessageBox.confirm(
      `员工 ${row.name} (${row.id}) 因连续多次密码错误已锁定，确定要解除锁定并重置连续失败计数吗？`,
      '解除锁定确认',
      { confirmButtonText: '确认解锁', cancelButtonText: '取消', type: 'warning' },
    )
    await unlockEmployeeAccount(row.id)
    ElMessage.success('账号已成功解锁')
    await loadData()
  } catch {
    /* cancelled */
  }
}

// 5. Terminate Employee
const terminateVisible = ref(false)
const terminateTarget = ref<Employee | null>(null)
const terminateDate = ref(new Date().toISOString().slice(0, 10))
const terminateReason = ref('主动离职')
const terminateNote = ref('')
const terminateLoading = ref(false)

function handleTerminate(row: Employee) {
  terminateTarget.value = row
  terminateDate.value = new Date().toISOString().slice(0, 10)
  terminateReason.value = '主动离职'
  terminateNote.value = ''
  terminateVisible.value = true
}

async function submitTerminate() {
  if (!terminateTarget.value) return
  terminateLoading.value = true
  try {
    await terminateEmployee(terminateTarget.value.id, {
      terminationDate: terminateDate.value,
      terminationReason: terminateReason.value,
      terminationNote: terminateNote.value,
    })
    terminateVisible.value = false
    ElMessage.success(`已为员工 ${terminateTarget.value.name} 办理离职`)
    await loadData()
  } catch {
    /* handled */
  } finally {
    terminateLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="employee-page">
    <!-- Page Heading -->
    <div class="page-heading">
      <div>
        <h2>员工与账号管理</h2>
        <p class="muted">维护企业员工人事组织架构，管理关联系统账号、登录凭证及生命周期状态</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDrawer"> 新增员工 </el-button>
    </div>

    <!-- Filters Bar -->
    <div class="panel filter-panel">
      <div class="filter-row">
        <el-input
          v-model="query.keyword"
          placeholder="搜索工号、姓名、手机或邮箱"
          clearable
          class="filter-search"
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
        />

        <el-select
          v-model="query.department"
          placeholder="所属部门"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
        </el-select>

        <el-select
          v-model="query.employmentStatus"
          placeholder="在职状态"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="在职" value="ACTIVE" />
          <el-option label="休假" value="ON_LEAVE" />
          <el-option label="已离职" value="TERMINATED" />
        </el-select>

        <el-select
          v-model="query.accountStatus"
          placeholder="账号状态"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="正常" value="ENABLED" />
          <el-option label="待首次登录" value="PENDING" />
          <el-option label="已锁定" value="LOCKED" />
          <el-option label="已停用" value="DISABLED" />
          <el-option label="未开通" value="NONE" />
        </el-select>

        <div class="filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <!-- Employees Table -->
    <div class="panel table-panel">
      <el-table v-loading="loading" :data="employees" stripe class="employee-table">
        <el-table-column label="工号" width="120">
          <template #default="{ row }">
            <button class="table-link-btn" @click="toDetail(row.id)">
              <code>{{ row.id }}</code>
            </button>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="department" label="所属部门" width="130" />
        <el-table-column prop="position" label="岗位职务" min-width="130" />
        <el-table-column prop="phone" label="手机号码" width="140" />

        <el-table-column label="在职状态" width="110">
          <template #default="{ row }">
            <StatusBadge :value="row.employmentStatus" type="employment" />
          </template>
        </el-table-column>

        <el-table-column label="系统账号状态" width="130">
          <template #default="{ row }">
            <StatusBadge :value="row.accountStatus || 'NONE'" type="account" />
          </template>
        </el-table-column>

        <el-table-column label="系统角色" width="130">
          <template #default="{ row }">
            <span v-if="row.hasAccount && row.roleName" class="role-text-badge">
              {{ row.roleName }}
            </span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="hireDate" label="入职日期" width="120" />

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <div class="table-actions-cell">
              <el-button link type="primary" size="small" @click="toDetail(row.id)">
                详情
              </el-button>
              <el-dropdown trigger="click">
                <el-button link type="info" size="small" :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <!-- 未开通账号时可开通 -->
                    <el-dropdown-item
                      v-if="!row.hasAccount && row.employmentStatus !== 'TERMINATED'"
                      @click="handleOpenAccount(row)"
                    >
                      开通系统账号
                    </el-dropdown-item>

                    <!-- 已开通账号时的管理动作 -->
                    <template v-if="row.hasAccount && row.employmentStatus !== 'TERMINATED'">
                      <el-dropdown-item @click="handleResetPassword(row)">
                        重置密码
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.accountStatus === 'LOCKED'"
                        @click="handleUnlock(row)"
                      >
                        解锁账号
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.accountStatus === 'ENABLED'"
                        @click="handleToggleStatus(row, 'DISABLED')"
                      >
                        停用账号
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="row.accountStatus === 'DISABLED'"
                        @click="handleToggleStatus(row, 'ENABLED')"
                      >
                        启用账号
                      </el-dropdown-item>
                    </template>

                    <!-- 办理离职 -->
                    <el-dropdown-item
                      v-if="row.employmentStatus !== 'TERMINATED'"
                      divided
                      class="danger-item"
                      @click="handleTerminate(row)"
                    >
                      办理离职
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- Create Employee Drawer -->
    <el-drawer v-model="drawerVisible" title="新增员工档案" size="560px" :destroy-on-close="true">
      <div class="drawer-inner">
        <div class="drawer-tip">
          <span class="tip-icon">ℹ️</span>
          <span>提交后系统将自动生成下一个 8 位企业员工工号，并建立员工档案。</span>
        </div>

        <el-form label-position="top" class="drawer-form">
          <div class="section-title">基本档案信息</div>
          <div class="form-row-2">
            <el-form-item label="真实姓名" required>
              <el-input v-model="createForm.name" placeholder="请输入员工姓名" />
            </el-form-item>
            <el-form-item label="所属部门" required>
              <el-select v-model="createForm.department" placeholder="选择所属部门">
                <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-row-2">
            <el-form-item label="职位职务" required>
              <el-input v-model="createForm.position" placeholder="如：采购专员 / 仓库管理员" />
            </el-form-item>
            <el-form-item label="入职日期">
              <el-date-picker
                v-model="createForm.hireDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择入职日期"
                style="width: 100%"
              />
            </el-form-item>
          </div>

          <div class="form-row-2">
            <el-form-item label="手机号码">
              <el-input v-model="createForm.phone" placeholder="常用联系电话" />
            </el-form-item>
            <el-form-item label="企业邮箱">
              <el-input v-model="createForm.email" placeholder="example@procureflow.com" />
            </el-form-item>
          </div>

          <div class="section-divider"></div>
          <div class="section-title">
            <span>系统账号配置</span>
            <el-switch
              v-model="createForm.openAccount"
              inline-prompt
              active-text="开通"
              inactive-text="跳过"
            />
          </div>

          <template v-if="createForm.openAccount">
            <el-form-item label="初始角色权限" required>
              <el-select
                v-model="createForm.initialRole"
                placeholder="请选择系统角色"
                style="width: 100%"
              >
                <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="初始密码设置">
              <el-radio-group v-model="createForm.passwordType">
                <el-radio value="RANDOM">随机生成临时密码 (推荐)</el-radio>
                <el-radio value="SPECIFIED">指定初始密码</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="createForm.passwordType === 'SPECIFIED'" label="指定密码" required>
              <el-input
                v-model="createForm.customPassword"
                type="password"
                placeholder="请输入至少 8 位初始密码"
                show-password
              />
            </el-form-item>

            <div class="security-callout">
              <strong>首次登录改密安全机制：</strong>
              <span
                >账号创建后状态为【待首次登录】，新员工登录后系统将强制引导修改密码后方可进入系统。</span
              >
            </div>
          </template>
        </el-form>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleCreateSubmit">
            确定创建
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- Credential Result Modal -->
    <el-dialog
      v-model="credentialVisible"
      title="员工账号凭证已生成"
      width="480px"
      :close-on-click-modal="false"
      class="credential-dialog"
    >
      <div class="credential-body">
        <p class="credential-intro">
          已成功为员工 <strong>{{ credentialData.name }}</strong> 生成系统账号与初始临时密码：
        </p>
        <div class="credential-box">
          <div class="cred-row">
            <span class="cred-label">员工工号：</span>
            <code class="cred-value">{{ credentialData.employeeNo }}</code>
          </div>
          <div class="cred-row">
            <span class="cred-label">初始密码：</span>
            <code class="cred-value cred-password">{{ credentialData.tempPassword }}</code>
            <el-button type="primary" link :icon="CopyDocument" @click="copyPassword">
              复制
            </el-button>
          </div>
        </div>

        <div class="credential-warning">
          <span class="warn-badge">⚠️ 安全提醒</span>
          <p>
            出于企业安全策略，此临时密码仅在当前弹窗中展示一次，弹窗关闭后系统将不再提供查询。请妥善记录并安全交付给员工本人。
          </p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="credentialVisible = false">我已记录，关闭弹窗</el-button>
      </template>
    </el-dialog>

    <!-- Open Account Dialog -->
    <el-dialog
      v-model="openAccountVisible"
      :title="`开通系统账号 - ${openAccountTarget?.name || ''}`"
      width="480px"
    >
      <div class="dialog-inner">
        <el-form label-position="top">
          <el-form-item label="分配系统角色" required>
            <el-select v-model="openAccountRole" style="width: 100%">
              <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="初始密码方式">
            <el-radio-group v-model="openAccountPasswordType">
              <el-radio value="RANDOM">随机生成临时密码 (推荐)</el-radio>
              <el-radio value="SPECIFIED">指定初始密码</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="openAccountPasswordType === 'SPECIFIED'" label="指定密码" required>
            <el-input
              v-model="openAccountCustomPassword"
              type="password"
              placeholder="至少 8 位初始密码"
              show-password
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="openAccountVisible = false">取消</el-button>
        <el-button type="primary" :loading="openAccountLoading" @click="submitOpenAccount">
          确认开通
        </el-button>
      </template>
    </el-dialog>

    <!-- Terminate Dialog -->
    <el-dialog
      v-model="terminateVisible"
      :title="`办理离职 - ${terminateTarget?.name || ''} (${terminateTarget?.id || ''})`"
      width="500px"
    >
      <div class="dialog-inner">
        <div class="terminate-callout">
          <strong>数据保留承诺：</strong>
          <p>
            办理离职后，系统将自动停用该员工登录账号并注销权限。该员工此前在系统中提交的采购申请、审批记录及入库流水将完整保留留痕，不会丢失。
          </p>
        </div>

        <el-form label-position="top" class="mt-4">
          <el-form-item label="正式离职日期" required>
            <el-date-picker
              v-model="terminateDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择离职日期"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="离职原因" required>
            <el-select v-model="terminateReason" style="width: 100%">
              <el-option label="主动离职" value="主动离职" />
              <el-option label="合同到期不续签" value="合同到期不续签" />
              <el-option label="协商解除" value="协商解除" />
              <el-option label="退休 / 转岗" value="退休 / 转岗" />
            </el-select>
          </el-form-item>

          <el-form-item label="交接说明与备注">
            <el-input
              v-model="terminateNote"
              type="textarea"
              :rows="3"
              placeholder="说明工作交接人、交接文档或资产归还情况"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="terminateVisible = false">取消</el-button>
        <el-button type="danger" :loading="terminateLoading" @click="submitTerminate">
          确认办理离职
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
