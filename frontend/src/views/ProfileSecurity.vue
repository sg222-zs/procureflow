<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuth } from '../stores/auth'
import { changeMyPassword } from '../api/auth'
import StatusBadge from '../components/StatusBadge.vue'

const auth = useAuth()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const busy = ref(false)

async function handleChangePassword() {
  if (!oldPassword.value) {
    ElMessage.warning('请输入当前登录原密码')
    return
  }
  if (!newPassword.value || newPassword.value.length < 8) {
    ElMessage.warning('新密码长度不能少于 8 位')
    return
  }
  if (newPassword.value === oldPassword.value) {
    ElMessage.warning('新密码不能与原密码相同')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  busy.value = true
  try {
    await changeMyPassword({
      old_password: oldPassword.value,
      new_password: newPassword.value,
    })
    ElMessage.success('密码修改成功，后续请使用新密码登录')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch {
    /* error handled */
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="security-page">
    <div class="page-heading">
      <div>
        <h2>账号安全与个人信息</h2>
        <p class="muted">查看当前绑定的员工档案信息及维护系统登录凭证安全</p>
      </div>
    </div>

    <div class="security-layout">
      <!-- 员工档案信息卡片 -->
      <div class="profile-card panel">
        <div class="panel-heading">
          <h3>员工基本档案</h3>
          <StatusBadge :value="auth.session?.user.accountStatus || 'ENABLED'" type="account" />
        </div>
        <div class="panel-body">
          <div class="profile-avatar-row">
            <span class="avatar-lg">{{ auth.session?.user.name.slice(0, 1) }}</span>
            <div class="profile-name-block">
              <strong>{{ auth.session?.user.name }}</strong>
              <span
                >工号: <code>{{ auth.session?.user.employeeNo }}</code></span
              >
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">所属部门</span>
              <span class="info-value">{{ auth.session?.user.department }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">岗位职务</span>
              <span class="info-value">{{ auth.session?.user.position || '员工' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">系统角色</span>
              <span class="info-value">{{ auth.session?.user.role }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">账号状态</span>
              <span class="info-value">正常使用中</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 修改密码卡片 -->
      <div class="password-card panel">
        <div class="panel-heading">
          <h3>修改登录密码</h3>
          <small class="muted">建议定期更新密码以保障业务操作合规与数据安全</small>
        </div>
        <div class="panel-body">
          <el-form
            label-position="top"
            class="password-form"
            @submit.prevent="handleChangePassword"
          >
            <el-form-item label="原密码" required>
              <el-input
                v-model="oldPassword"
                type="password"
                placeholder="请输入当前原密码"
                show-password
              />
            </el-form-item>
            <el-form-item label="新密码" required>
              <el-input
                v-model="newPassword"
                type="password"
                placeholder="至少 8 位，包含字母与数字组合"
                show-password
              />
            </el-form-item>
            <el-form-item label="确认新密码" required>
              <el-input
                v-model="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
            <div class="form-actions">
              <el-button type="primary" native-type="submit" :loading="busy">
                保存新密码
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>
