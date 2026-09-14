<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Key,
  Lock,
  Unlock,
  SwitchButton,
  UserFilled,
  CopyDocument,
} from '@element-plus/icons-vue'
import type { Employee, Entity, PermissionItem } from '../types'
import {
  getEmployee,
  updateEmployee,
  openEmployeeAccount,
  resetEmployeePassword,
  toggleEmployeeAccountStatus,
  unlockEmployeeAccount,
  assignEmployeeRole,
  terminateEmployee,
  listPermissions,
  listAuditLogs,
} from '../api/system'
import StatusBadge from '../components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const empId = computed(() => String(route.params.id || ''))

const loading = ref(false)
const employee = ref<Employee | null>(null)
const activeTab = ref('basic')

const allPermissions = ref<PermissionItem[]>([])
const auditLogs = ref<Entity[]>([])
const auditLoading = ref(false)

const departments = ['运营中心', '采购部', '财务部', '仓储部']
const roleOptions = [
  { id: 'buyer', name: '采购专员', desc: '负责提报采购申请、跟进采购订单履约及库存水位' },
  { id: 'approver', name: '审批经理', desc: '负责采购申请多级业务与财务合规审核、订单生成' },
  { id: 'warehouse', name: '仓库管理员', desc: '负责采购订单到货入库验收、仓库流水与库存盘点' },
  { id: 'admin', name: '系统管理员', desc: '拥有系统全局所有业务操作、员工账号与权限配置权限' },
]

async function loadEmployee() {
  if (!empId.value) return
  loading.value = true
  try {
    const res = await getEmployee(empId.value)
    employee.value = res
  } catch {
    /* error handled */
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  try {
    const res = await listPermissions()
    allPermissions.value = res.items
  } catch {
    /* handled */
  }
}

async function loadAuditLogs() {
  auditLoading.value = true
  try {
    const res = await listAuditLogs({ keyword: empId.value })
    auditLogs.value = res.items
  } catch {
    /* handled */
  } finally {
    auditLoading.value = false
  }
}

const effectivePermissions = computed(() => {
  if (!employee.value?.permissions?.length) return []
  if (employee.value.permissions.includes('*:*:*')) {
    return allPermissions.value
  }
  return allPermissions.value.filter((p) => employee.value?.permissions?.includes(p.code))
})

// ================= Credential Result Modal =================
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

// ================= Edit Basic Info =================
const editBasicVisible = ref(false)
const editBasicLoading = ref(false)
const basicForm = reactive({
  name: '',
  department: '',
  position: '',
  phone: '',
  email: '',
  hireDate: '',
  employmentStatus: 'ACTIVE' as Employee['employmentStatus'],
})

function openEditBasic() {
  if (!employee.value) return
  basicForm.name = employee.value.name
  basicForm.department = employee.value.department
  basicForm.position = employee.value.position
  basicForm.phone = employee.value.phone || ''
  basicForm.email = employee.value.email || ''
  basicForm.hireDate = employee.value.hireDate
  basicForm.employmentStatus = employee.value.employmentStatus
  editBasicVisible.value = true
}

async function submitEditBasic() {
  if (!basicForm.name.trim()) {
    ElMessage.warning('姓名不能为空')
    return
  }
  if (!basicForm.department) {
    ElMessage.warning('请选择部门')
    return
  }
  if (!basicForm.position.trim()) {
    ElMessage.warning('岗位职务不能为空')
    return
  }
  editBasicLoading.value = true
  try {
    await updateEmployee(empId.value, {
      name: basicForm.name.trim(),
      department: basicForm.department,
      position: basicForm.position.trim(),
      phone: basicForm.phone.trim(),
      email: basicForm.email.trim(),
      hireDate: basicForm.hireDate,
      employmentStatus: basicForm.employmentStatus,
    })
    ElMessage.success('员工基本资料已更新')
    editBasicVisible.value = false
    await loadEmployee()
  } catch {
    /* handled */
  } finally {
    editBasicLoading.value = false
  }
}

// ================= Open Account =================
const openAccountVisible = ref(false)
const openAccountRole = ref('buyer')
const openAccountPasswordType = ref<'RANDOM' | 'SPECIFIED'>('RANDOM')
const openAccountCustomPassword = ref('')
const openAccountLoading = ref(false)

function openOpenAccountDialog() {
  openAccountRole.value = 'buyer'
  openAccountPasswordType.value = 'RANDOM'
  openAccountCustomPassword.value = ''
  openAccountVisible.value = true
}

async function submitOpenAccount() {
  if (openAccountPasswordType.value === 'SPECIFIED') {
    if (!openAccountCustomPassword.value || openAccountCustomPassword.value.length < 8) {
      ElMessage.warning('指定初始密码至少需要 8 位字符')
      return
    }
  }
  openAccountLoading.value = true
  try {
    const res = await openEmployeeAccount(empId.value, {
      role: openAccountRole.value,
      passwordType: openAccountPasswordType.value,
      customPassword: openAccountCustomPassword.value,
    })
    openAccountVisible.value = false
    ElMessage.success('系统账号开通成功')
    await loadEmployee()
    if (res.tempPassword) {
      showCredentialModal(employee.value?.name || '', empId.value, res.tempPassword)
    }
  } catch {
    /* handled */
  } finally {
    openAccountLoading.value = false
  }
}

// ================= Assign Role =================
const assignRoleVisible = ref(false)
const targetRole = ref('buyer')
const assignRoleLoading = ref(false)

function openAssignRoleDialog() {
  targetRole.value = employee.value?.role || 'buyer'
  assignRoleVisible.value = true
}

async function submitAssignRole() {
  assignRoleLoading.value = true
  try {
    await assignEmployeeRole(empId.value, targetRole.value)
    ElMessage.success('系统角色已调整')
    assignRoleVisible.value = false
    await loadEmployee()
  } catch {
    /* handled */
  } finally {
    assignRoleLoading.value = false
  }
}

// ================= Reset Password =================
async function handleResetPassword() {
  if (!employee.value) return
  try {
    await ElMessageBox.confirm(
      `确定重置员工 ${employee.value.name} (${employee.value.id}) 的系统密码吗？重置后将生成新的临时密码，员工登录时将被强制要求修改。`,
      '重置密码确认',
      { confirmButtonText: '确定重置', cancelButtonText: '取消', type: 'warning' },
    )
    const res = await resetEmployeePassword(empId.value)
    ElMessage.success('密码已重置')
    await loadEmployee()
    showCredentialModal(employee.value.name, employee.value.id, res.tempPassword)
  } catch {
    /* cancelled */
  }
}

// ================= Unlock Account =================
async function handleUnlock() {
  if (!employee.value) return
  try {
    await ElMessageBox.confirm(
      `确定为员工 ${employee.value.name} 解除账号锁定吗？解锁后连续失败尝试计数将清零。`,
      '解除锁定确认',
      { confirmButtonText: '确认解锁', cancelButtonText: '取消', type: 'warning' },
    )
    await unlockEmployeeAccount(empId.value)
    ElMessage.success('账号已成功解锁')
    await loadEmployee()
  } catch {
    /* cancelled */
  }
}

// ================= Toggle Status (Disable / Enable) =================
async function handleToggleStatus(targetStatus: 'ENABLED' | 'DISABLED') {
  if (!employee.value) return
  const isDisable = targetStatus === 'DISABLED'
  let reason = ''
  if (isDisable) {
    try {
      const { value } = await ElMessageBox.prompt(
        `请输入停用员工 ${employee.value.name} 系统账号的原因：`,
        '停用账号确认',
        {
          confirmButtonText: '确认停用',
          cancelButtonText: '取消',
          inputPlaceholder: '例如：岗位轮换暂停系统权限',
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
        `确定要重新启用员工 ${employee.value.name} 的系统账号吗？`,
        '启用账号确认',
        { confirmButtonText: '确认启用', cancelButtonText: '取消', type: 'info' },
      )
    } catch {
      return
    }
  }

  try {
    await toggleEmployeeAccountStatus(empId.value, targetStatus, reason)
    ElMessage.success(isDisable ? '账号已停用' : '账号已恢复启用')
    await loadEmployee()
  } catch {
    /* handled */
  }
}

// ================= Terminate =================
const terminateVisible = ref(false)
const terminateDate = ref(new Date().toISOString().slice(0, 10))
const terminateReason = ref('主动离职')
const terminateNote = ref('')
const terminateLoading = ref(false)

function openTerminateDialog() {
  terminateDate.value = new Date().toISOString().slice(0, 10)
  terminateReason.value = '主动离职'
  terminateNote.value = ''
  terminateVisible.value = true
}

async function submitTerminate() {
  terminateLoading.value = true
  try {
    await terminateEmployee(empId.value, {
      terminationDate: terminateDate.value,
      terminationReason: terminateReason.value,
      terminationNote: terminateNote.value,
    })
    terminateVisible.value = false
    ElMessage.success(`已成功办理员工 ${employee.value?.name} 离职`)
    await loadEmployee()
  } catch {
    /* handled */
  } finally {
    terminateLoading.value = false
  }
}

onMounted(() => {
  loadEmployee()
  loadPermissions()
  loadAuditLogs()
})
</script>

<template>
  <div v-loading="loading" class="employee-detail-page">
    <!-- Back & Breadcrumb -->
    <div class="detail-top-nav">
      <el-button link :icon="ArrowLeft" @click="router.push('/system/employees')">
        返回员工列表
      </el-button>
    </div>

    <!-- Header Summary Card -->
    <div v-if="employee" class="detail-header-card panel">
      <div class="header-left">
        <span class="avatar-header">{{ employee.name.slice(0, 1) }}</span>
        <div class="header-titles">
          <div class="name-row">
            <h2>{{ employee.name }}</h2>
            <code class="emp-code-badge">{{ employee.id }}</code>
            <StatusBadge :value="employee.employmentStatus" type="employment" />
            <StatusBadge :value="employee.accountStatus || 'NONE'" type="account" />
          </div>
          <p class="subtitle-meta">
            <span>{{ employee.department }}</span>
            <span class="dot">·</span>
            <span>{{ employee.position }}</span>
            <span class="dot">·</span>
            <span>入职日期: {{ employee.hireDate }}</span>
          </p>
        </div>
      </div>

      <div class="header-actions">
        <!-- 未开通账号 -->
        <el-button
          v-if="!employee.hasAccount && employee.employmentStatus !== 'TERMINATED'"
          type="primary"
          :icon="Key"
          @click="openOpenAccountDialog"
        >
          开通系统账号
        </el-button>

        <!-- 已开通账号 -->
        <template v-if="employee.hasAccount && employee.employmentStatus !== 'TERMINATED'">
          <el-button :icon="Key" @click="handleResetPassword"> 重置密码 </el-button>

          <el-button
            v-if="employee.accountStatus === 'LOCKED'"
            type="warning"
            :icon="Unlock"
            @click="handleUnlock"
          >
            解锁账号
          </el-button>

          <el-button
            v-if="employee.accountStatus === 'ENABLED'"
            :icon="Lock"
            @click="handleToggleStatus('DISABLED')"
          >
            停用账号
          </el-button>

          <el-button
            v-if="employee.accountStatus === 'DISABLED'"
            type="success"
            :icon="Unlock"
            @click="handleToggleStatus('ENABLED')"
          >
            启用账号
          </el-button>

          <el-button :icon="UserFilled" @click="openAssignRoleDialog"> 调整角色 </el-button>
        </template>

        <!-- 办理离职 -->
        <el-button
          v-if="employee.employmentStatus !== 'TERMINATED'"
          type="danger"
          plain
          :icon="SwitchButton"
          @click="openTerminateDialog"
        >
          办理离职
        </el-button>
      </div>
    </div>

    <!-- 4 Tabs Container -->
    <div v-if="employee" class="detail-tabs-wrap panel">
      <el-tabs v-model="activeTab" class="custom-detail-tabs">
        <!-- Tab 1: 基本资料 -->
        <el-tab-pane label="基本资料" name="basic">
          <div class="tab-content-inner">
            <div class="pane-section-head">
              <h3>员工档案与联系信息</h3>
              <el-button
                v-if="employee.employmentStatus !== 'TERMINATED'"
                type="primary"
                link
                :icon="Edit"
                @click="openEditBasic"
              >
                编辑资料
              </el-button>
            </div>

            <div class="detail-grid">
              <div class="detail-cell">
                <span class="cell-label">真实姓名</span>
                <span class="cell-value">{{ employee.name }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">员工工号</span>
                <span class="cell-value font-mono">{{ employee.id }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">所属部门</span>
                <span class="cell-value">{{ employee.department }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">岗位职务</span>
                <span class="cell-value">{{ employee.position }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">手机号码</span>
                <span class="cell-value">{{ employee.phone || '-' }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">企业邮箱</span>
                <span class="cell-value">{{ employee.email || '-' }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">入职日期</span>
                <span class="cell-value">{{ employee.hireDate }}</span>
              </div>
              <div class="detail-cell">
                <span class="cell-label">在职状态</span>
                <span class="cell-value">
                  <StatusBadge :value="employee.employmentStatus" type="employment" />
                </span>
              </div>
            </div>

            <!-- 离职档案追溯 -->
            <template v-if="employee.employmentStatus === 'TERMINATED'">
              <div class="termination-archive-block">
                <h4>离职归档记录</h4>
                <div class="detail-grid mt-3">
                  <div class="detail-cell">
                    <span class="cell-label">离职日期</span>
                    <span class="cell-value text-danger">{{
                      employee.terminationDate || '-'
                    }}</span>
                  </div>
                  <div class="detail-cell">
                    <span class="cell-label">离职原因</span>
                    <span class="cell-value">{{ employee.terminationReason || '-' }}</span>
                  </div>
                  <div class="detail-cell full-width">
                    <span class="cell-label">交接说明与备注</span>
                    <span class="cell-value">{{ employee.terminationNote || '-' }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 账号与安全 -->
        <el-tab-pane label="账号与安全" name="account">
          <div class="tab-content-inner">
            <template v-if="!employee.hasAccount">
              <div class="empty-account-state">
                <div class="empty-icon">🔒</div>
                <h3>该员工尚未开通系统账号</h3>
                <p>员工当前无法登录系统。开通后将自动赋予登录凭证及对应角色功能权限。</p>
                <el-button
                  v-if="employee.employmentStatus !== 'TERMINATED'"
                  type="primary"
                  :icon="Key"
                  @click="openOpenAccountDialog"
                >
                  立即开通系统账号
                </el-button>
              </div>
            </template>

            <template v-else>
              <div class="account-security-cards">
                <!-- 卡片 1: 登录凭证与状态 -->
                <div class="sec-card">
                  <h4>登录凭证与状态</h4>
                  <div class="sec-list">
                    <div class="sec-item">
                      <span class="sec-label">登录工号：</span>
                      <code class="sec-val font-mono">{{ employee.id }}</code>
                    </div>
                    <div class="sec-item">
                      <span class="sec-label">账号状态：</span>
                      <StatusBadge :value="employee.accountStatus" type="account" />
                    </div>
                    <div class="sec-item">
                      <span class="sec-label">连续密码错误：</span>
                      <span class="sec-val">
                        {{ employee.failedLoginCount || 0 }} / 5 次
                        <small v-if="(employee.failedLoginCount || 0) >= 5" class="text-danger"
                          >（已触发防爆破锁定）</small
                        >
                      </span>
                    </div>
                    <div v-if="employee.lockedAt" class="sec-item">
                      <span class="sec-label">锁定触发时间：</span>
                      <span class="sec-val">{{ employee.lockedAt }}</span>
                    </div>
                    <div v-if="employee.disabledReason" class="sec-item">
                      <span class="sec-label">停用说明：</span>
                      <span class="sec-val text-muted">{{ employee.disabledReason }}</span>
                    </div>
                  </div>
                </div>

                <!-- 卡片 2: 安全策略与改密要求 -->
                <div class="sec-card">
                  <h4>安全策略与改密记录</h4>
                  <div class="sec-list">
                    <div class="sec-item">
                      <span class="sec-label">首次登录改密要求：</span>
                      <span v-if="employee.mustChangePassword" class="tag-warn"
                        >强制下次登录修改</span
                      >
                      <span v-else class="tag-ok">已完成首次改密</span>
                    </div>
                    <div class="sec-item">
                      <span class="sec-label">上次密码修改时间：</span>
                      <span class="sec-val">{{ employee.passwordUpdatedAt || '-' }}</span>
                    </div>
                    <div class="sec-item">
                      <span class="sec-label">最近系统登录时间：</span>
                      <span class="sec-val">{{ employee.lastLoginAt || '暂无登录记录' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>

        <!-- Tab 3: 角色与权限 -->
        <el-tab-pane label="角色与权限" name="role">
          <div class="tab-content-inner">
            <template v-if="!employee.hasAccount">
              <div class="empty-account-state">
                <p>员工未开通系统账号，暂未分配系统功能角色与权限点。</p>
              </div>
            </template>

            <template v-else>
              <div class="current-role-banner">
                <div>
                  <span class="banner-tag">当前系统角色</span>
                  <h3>{{ employee.roleName || employee.role }}</h3>
                  <p class="text-muted">
                    {{
                      roleOptions.find((r) => r.id === employee?.role)?.desc || '企业标准业务权限'
                    }}
                  </p>
                </div>
                <el-button
                  v-if="employee.employmentStatus !== 'TERMINATED'"
                  type="primary"
                  plain
                  @click="openAssignRoleDialog"
                >
                  变更分配角色
                </el-button>
              </div>

              <div class="pane-section-head mt-4">
                <h4>生效功能权限点明细清单 (共 {{ effectivePermissions.length }} 项)</h4>
              </div>

              <el-table :data="effectivePermissions" stripe class="permissions-table">
                <el-table-column prop="code" label="权限编码" width="180">
                  <template #default="{ row }">
                    <code class="font-mono">{{ row.code }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="权限名称" width="160" />
                <el-table-column prop="module" label="所属业务模块" width="140" />
                <el-table-column prop="description" label="功能说明" min-width="260" />
              </el-table>
            </template>
          </div>
        </el-tab-pane>

        <!-- Tab 4: 操作记录 -->
        <el-tab-pane label="操作记录" name="audit">
          <div class="tab-content-inner">
            <div class="pane-section-head">
              <h3>相关安全与业务操作审计</h3>
              <el-button link :icon="UserFilled" @click="loadAuditLogs">刷新日志</el-button>
            </div>

            <el-table v-loading="auditLoading" :data="auditLogs" stripe class="audit-table">
              <el-table-column prop="createdAt" label="操作时间" width="180" />
              <el-table-column prop="actor" label="操作执行人" width="130" />
              <el-table-column prop="module" label="所属模块" width="130" />
              <el-table-column prop="action" label="操作动作" width="150" />
              <el-table-column prop="traceId" label="请求 TraceID" width="180">
                <template #default="{ row }">
                  <code class="font-mono text-muted">{{ row.traceId }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="操作对象" min-width="150" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Edit Basic Info Dialog -->
    <el-dialog v-model="editBasicVisible" title="编辑员工基本资料" width="520px">
      <el-form label-position="top">
        <div class="form-row-2">
          <el-form-item label="真实姓名" required>
            <el-input v-model="basicForm.name" />
          </el-form-item>
          <el-form-item label="所属部门" required>
            <el-select v-model="basicForm.department" style="width: 100%">
              <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row-2">
          <el-form-item label="岗位职务" required>
            <el-input v-model="basicForm.position" />
          </el-form-item>
          <el-form-item label="在职状态" required>
            <el-select v-model="basicForm.employmentStatus" style="width: 100%">
              <el-option label="在职" value="ACTIVE" />
              <el-option label="休假" value="ON_LEAVE" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row-2">
          <el-form-item label="手机号码">
            <el-input v-model="basicForm.phone" />
          </el-form-item>
          <el-form-item label="企业邮箱">
            <el-input v-model="basicForm.email" />
          </el-form-item>
        </div>

        <el-form-item label="入职日期">
          <el-date-picker
            v-model="basicForm.hireDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editBasicVisible = false">取消</el-button>
        <el-button type="primary" :loading="editBasicLoading" @click="submitEditBasic">
          保存修改
        </el-button>
      </template>
    </el-dialog>

    <!-- Open Account Dialog -->
    <el-dialog v-model="openAccountVisible" title="开通系统账号" width="480px">
      <el-form label-position="top">
        <el-form-item label="分配初始角色" required>
          <el-select v-model="openAccountRole" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="初始密码生成方式">
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
      <template #footer>
        <el-button @click="openAccountVisible = false">取消</el-button>
        <el-button type="primary" :loading="openAccountLoading" @click="submitOpenAccount">
          确定开通
        </el-button>
      </template>
    </el-dialog>

    <!-- Assign Role Dialog -->
    <el-dialog v-model="assignRoleVisible" title="调整员工系统角色" width="480px">
      <el-form label-position="top">
        <el-form-item label="选择新角色" required>
          <el-select v-model="targetRole" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <p class="muted">
          角色调整后，该员工的菜单可见范围及审批、采购功能权限将立即同步更新生效。
        </p>
      </el-form>
      <template #footer>
        <el-button @click="assignRoleVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignRoleLoading" @click="submitAssignRole">
          确认调整
        </el-button>
      </template>
    </el-dialog>

    <!-- Terminate Dialog -->
    <el-dialog v-model="terminateVisible" title="办理员工离职" width="500px">
      <div class="terminate-callout">
        <strong>数据完整性保留说明：</strong>
        <p>
          办理离职后，系统将自动停用并注销该员工的登录账号。该员工此前在系统中提交的采购申请、审批记录及入库流水将永久完好保留，不影响历史业务审计。
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
      <template #footer>
        <el-button @click="terminateVisible = false">取消</el-button>
        <el-button type="danger" :loading="terminateLoading" @click="submitTerminate">
          确认办理离职
        </el-button>
      </template>
    </el-dialog>

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
          已成功为员工 <strong>{{ credentialData.name }}</strong> 生成系统密码凭证：
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
            出于企业安全策略，此临时密码仅在当前弹窗中展示一次，弹窗关闭后系统将不再提供查询。请妥善记录并安全交付给员工本人。员工首次登录后需修改该密码。
          </p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="credentialVisible = false">我已记录，关闭弹窗</el-button>
      </template>
    </el-dialog>
  </div>
</template>
