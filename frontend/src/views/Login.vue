<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../stores/auth'
import { apiMode } from '../api/request'

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const employeeNo = ref('00010001')
const password = ref('demo123')
const busy = ref(false)

const demoAccounts = [
  { id: '00010001', name: '管理员', role: '系统管理员', pass: 'demo123', tag: '全部权限' },
  { id: '00010002', name: '林晓', role: '采购专员', pass: 'demo123', tag: '采购业务' },
  { id: '00010003', name: '周宁', role: '审批经理', pass: 'demo123', tag: '审批中心' },
  { id: '00010004', name: '许川', role: '仓库管理员', pass: 'demo123', tag: '多仓收货' },
  { id: '00010331', name: '孙小萌', role: '待改密员工', pass: 'temp123', tag: '体验首次改密' },
]

function onInputEmployeeNo(val: string) {
  employeeNo.value = val.replace(/\D/g, '').slice(0, 8)
}

function selectAccount(acc: (typeof demoAccounts)[0]) {
  employeeNo.value = acc.id
  password.value = acc.pass
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
      await router.push('/first-login/change-password')
      return
    }
    const redirect = String(route.query.redirect || '/dashboard')
    await router.push(
      redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
        ? redirect
        : '/dashboard',
    )
  } catch {
    /* error handled */
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
          <p class="muted">
            {{
              apiMode === 'mock'
                ? '演示环境支持点击卡片一键填入不同岗位工号'
                : '请使用企业分配的8位员工工号与密码登录'
            }}
          </p>
        </div>

        <div v-if="apiMode === 'mock'" class="demo-roles-selector">
          <label class="role-selector-label">快捷体验工号卡片</label>
          <div class="role-chips">
            <button
              v-for="acc in demoAccounts"
              :key="acc.id"
              type="button"
              class="role-chip"
              :class="{ active: employeeNo === acc.id }"
              @click="selectAccount(acc)"
            >
              <div class="role-chip-head">
                <strong>{{ acc.name }}</strong>
                <span class="role-chip-tag">{{ acc.tag }}</span>
              </div>
              <small>{{ acc.role }} · {{ acc.id }}</small>
            </button>
          </div>
        </div>

        <el-form label-position="top" @submit.prevent="submit">
          <el-form-item label="员工工号">
            <el-input
              :model-value="employeeNo"
              inputmode="numeric"
              maxlength="8"
              placeholder="请输入8位员工工号 (如 00010001)"
              clearable
              @update:model-value="onInputEmployeeNo"
            />
          </el-form-item>
          <el-form-item label="登录密码">
            <el-input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="current-password"
            />
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="busy" class="login-submit">
            立即登录
          </el-button>
        </el-form>

        <div class="login-card-foot">
          <span class="contact-admin">无法登录？请联系系统管理员</span>
        </div>

        <div v-if="apiMode === 'mock'" class="login-tip">
          <span class="tip-icon">ℹ️</span>
          <span>正常账号默认密码 <code>demo123</code>，待改密专员密码 <code>temp123</code></span>
        </div>
      </div>
    </section>
  </div>
</template>
