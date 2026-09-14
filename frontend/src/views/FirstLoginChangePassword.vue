<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '../stores/auth'
import { firstLoginChangePassword } from '../api/auth'

const auth = useAuth()
const router = useRouter()

const tempPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const busy = ref(false)

async function submit() {
  if (!tempPassword.value) {
    ElMessage.warning('请输入当前临时密码')
    return
  }
  if (!newPassword.value || newPassword.value.length < 8) {
    ElMessage.warning('新密码长度不能少于 8 位')
    return
  }
  if (newPassword.value === tempPassword.value) {
    ElMessage.warning('新密码不能与临时密码相同')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  busy.value = true
  try {
    await firstLoginChangePassword({
      temp_password: tempPassword.value,
      new_password: newPassword.value,
    })
    ElMessage.success('密码修改成功，请使用新密码重新登录')
    auth.signOut()
    await router.push('/login')
  } catch {
    /* error handled */
  } finally {
    busy.value = false
  }
}

function cancel() {
  auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="first-login-page">
    <div class="first-login-card">
      <div class="first-login-head">
        <span class="brand-mark">P<span>f</span></span>
        <h2>首次登录修改密码</h2>
        <p class="first-login-desc">
          系统检测到您当前使用的是初始/临时密码。为保障企业数据与账号安全，首次登录必须设置新密码。修改成功后需重新登录。
        </p>
      </div>

      <div class="employee-badge-bar">
        <span class="badge-label">当前登录员工</span>
        <strong class="badge-user">
          {{ auth.session?.user.name }} (工号: {{ auth.session?.user.employeeNo }})
        </strong>
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="当前临时密码" required>
          <el-input
            v-model="tempPassword"
            type="password"
            placeholder="请输入管理员提供的初始临时密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="设置新密码" required>
          <el-input
            v-model="newPassword"
            type="password"
            placeholder="至少 8 位字符，建议字母与数字组合"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认新密码" required>
          <el-input
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入新密码以确认"
            show-password
          />
        </el-form-item>

        <div class="first-login-actions">
          <el-button type="primary" native-type="submit" :loading="busy" class="submit-btn">
            确认修改并重新登录
          </el-button>
          <el-button text class="cancel-btn" @click="cancel"> 返回登录页 </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>
