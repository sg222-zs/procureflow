<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../stores/auth'

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const employeeNo = ref('')
const password = ref('')
const busy = ref(false)

// 部门定义
const departments = [
  { id: 'management', name: '管理部', desc: '系统配置 · 审批决策' },
  { id: 'procurement', name: '采购部', desc: '供应商 · 需求提报' },
  { id: 'warehouse', name: '仓储部', desc: '订单入库 · 库存监控' },
  { id: 'finance', name: '财务部', desc: '应付账款 · 审批中心' },
]

const selectedDepartment = ref('采购部')

function onInputEmployeeNo(val: string) {
  employeeNo.value = val.replace(/\D/g, '').slice(0, 8)
}

function selectDept(deptName: string) {
  selectedDepartment.value = deptName
}

async function submit() {
  const empNo = employeeNo.value.trim()
  if (!empNo) {
    ElMessage.warning('请输入8位员工工号')
    return
  }
  if (!/^\d{8}$/.test(empNo)) {
    ElMessage.warning('员工工号必须为8位数字')
    return
  }
  if (!password.value) {
    ElMessage.warning('请输入登录密码')
    return
  }
  busy.value = true
  try {
    await auth.signIn(empNo, password.value)
    if (auth.session?.user.mustChangePassword) {
      ElMessage.info('首次登录需修改初始密码')
      await router.push('/first-login/change-password')
      return
    }
    ElMessage.success(`欢迎回来，${auth.session?.user.name}`)
    const redirect = String(route.query.redirect || '/dashboard')
    await router.push(
      redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
        ? redirect
        : '/dashboard',
    )
  } catch (err: any) {
    ElMessage.error(err?.message || '登录失败，请检查工号或密码')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-story">
      <div class="brand">
        <span class="brand-mark">P<span>f</span></span>
        <div>
          <span>ProcureFlow</span>
          <small>采购协同管理系统</small>
        </div>
      </div>
      <div class="story-content">
        <h1>企业采购与供应链<br />数字化协同平台</h1>
        <p>
          规范化员工与账号生命周期管控，打通采购申请、多级审批、合同订单与多仓收发货链路，让供应链数据真实可溯、权限分明。
        </p>
        <div class="feature-pills">
          <div class="pill-item">
            <strong>组织与账号</strong>
            <span>员工档案与系统权限强管控</span>
          </div>
          <div class="pill-item">
            <strong>需求与审批</strong>
            <span>全流程合规申请与审批流转</span>
          </div>
          <div class="pill-item">
            <strong>订单与履约</strong>
            <span>供应商交付与分批到货入库</span>
          </div>
        </div>
      </div>
      <div class="story-footer">
        <span>© 2026 ProcureFlow Platform. All rights reserved.</span>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-card">
        <div class="login-card-head">
          <h2>欢迎登录</h2>
          <p class="muted">请选择所属业务部门并输入工号密码</p>
        </div>

        <div class="demo-roles-selector">
          <label class="role-selector-label">选择所属部门</label>
          <div class="role-chips">
            <button
              v-for="dept in departments"
              :key="dept.id"
              type="button"
              class="role-chip"
              :class="{ active: selectedDepartment === dept.name }"
              @click="selectDept(dept.name)"
            >
              <div class="role-chip-head">
                <strong>{{ dept.name }}</strong>
              </div>
              <small>{{ dept.desc }}</small>
            </button>
          </div>
        </div>

        <el-form label-position="top" @submit.prevent="submit">
          <el-form-item label="员工工号">
            <el-input
              :model-value="employeeNo"
              inputmode="numeric"
              maxlength="8"
              placeholder="请输入8位员工工号 (如 00000001)"
              clearable
              @update:model-value="onInputEmployeeNo"
            />
          </el-form-item>
          <el-form-item label="登录密码">
            <el-input
              v-model="password"
              type="password"
              placeholder="请输入登录密码"
              show-password
              autocomplete="current-password"
            />
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="busy" class="login-submit">
            立即登录
          </el-button>
        </el-form>

        <div class="login-card-foot">
          <span class="contact-admin">无法登录？请联系系统管理员解锁或重置密码</span>
        </div>
      </div>
    </section>
  </div>
</template>
