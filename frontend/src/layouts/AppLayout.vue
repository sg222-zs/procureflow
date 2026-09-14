<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Expand, Fold, ArrowDown, Connection, Lock, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { menus } from '../router/menu'
import { useAuth } from '../stores/auth'
import { apiMode, simulateNextError } from '../api/request'
import { health } from '../api/auth'
import SidebarItem from './SidebarItem.vue'
const auth = useAuth(),
  route = useRoute(),
  router = useRouter()
const collapsed = ref(false),
  checking = ref(false)

const currentParent = computed(() => {
  return menus.find((m) => m.path === route.path || m.children?.some((c) => c.path === route.path))
})

function logout() {
  auth.signOut()
  router.push('/login')
}
function handleProfileCommand(command: string) {
  if (command === 'security') {
    router.push('/profile/security')
  } else if (command === 'logout') {
    logout()
  }
}
async function checkHealth() {
  checking.value = true
  try {
    const result = await health()
    ElMessage.success(`后端服务运行正常（状态：${result.status}）`)
  } catch {
    /* request reports error */
  } finally {
    checking.value = false
  }
}
function simulate(status: number) {
  simulateNextError(status)
  ElMessage.info(`下一次 Mock 请求将返回 ${status}`)
}
</script>
<template>
  <div class="app-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <router-link to="/dashboard" class="brand">
        <span class="brand-mark">P<span>f</span></span>
        <span v-if="!collapsed" class="brand-text">
          ProcureFlow
          <small>采购协同管理系统</small>
        </span>
      </router-link>
      <div v-if="!collapsed" class="nav-section-title">功能导航</div>
      <el-menu
        router
        :default-active="route.path"
        :collapse="collapsed"
        :default-openeds="['/procurement', '/catalog', '/inventory']"
        :collapse-transition="false"
      >
        <SidebarItem v-for="item in menus" :key="item.path" :item="item" />
      </el-menu>
      <div v-if="!collapsed" class="sidebar-foot">
        <div class="status-indicator-wrap">
          <span class="live-dot"></span>
          <span>系统就绪</span>
        </div>
        <small>ProcureFlow v1.0</small>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="topbar-left">
          <el-button text circle aria-label="折叠菜单" @click="collapsed = !collapsed">
            <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
          </el-button>
          <div class="breadcrumb">
            <template v-if="currentParent && currentParent.path !== route.path">
              <span>{{ currentParent.title }}</span>
              <span class="breadcrumb-sep">/</span>
            </template>
            <strong>{{ route.meta.title }}</strong>
          </div>
        </div>
        <div class="topbar-actions">
          <el-tag class="mode-tag" type="info" effect="plain">
            {{ apiMode === 'mock' ? 'Mock 演示环境' : 'Server 在线环境' }}
          </el-tag>
          <el-tooltip content="检查后端服务连接状态" placement="bottom">
            <el-button
              text
              circle
              :loading="checking"
              aria-label="检查后端服务连接状态"
              @click="checkHealth"
            >
              <el-icon><Connection /></el-icon>
            </el-button>
          </el-tooltip>
          <el-dropdown v-if="apiMode === 'mock'" @command="simulate">
            <el-button text>
              模拟异常 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="s in [400, 401, 403, 409, 500]" :key="s" :command="s">
                  模拟 {{ s }} 响应
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleProfileCommand">
            <button class="profile">
              <span class="avatar">{{ auth.session?.user.name.slice(0, 1) }}</span>
              <span class="profile-info">
                {{ auth.session?.user.name }} /
                {{ auth.session?.user.employeeNo || auth.session?.user.id }}
                <small
                  >{{ auth.session?.user.department }} ·
                  {{ auth.session?.user.position || '员工' }}</small
                >
              </span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="security">
                  <el-icon><Lock /></el-icon> 账号安全
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="page-container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
      <footer class="app-footer">
        <span>ProcureFlow 企业采购与供应链协同管理平台</span>
        <span>© 2026 ProcureFlow Platform</span>
      </footer>
    </div>
  </div>
</template>
