<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { PermissionItem } from '../types'
import { listPermissions } from '../api/system'
import { rolePermissions } from '../mock/fixtures'

const loading = ref(false)
const permissions = ref<PermissionItem[]>([])
const keyword = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await listPermissions()
    permissions.value = res.items
  } catch {
    /* handled */
  } finally {
    loading.value = false
  }
}

const roleNames: Record<string, string> = {
  admin: '系统管理员',
  buyer: '采购专员',
  approver: '审批经理',
  warehouse: '仓库管理员',
}

function getRolesForPerm(code: string): string[] {
  const matched: string[] = ['系统管理员'] // admin has *:*
  for (const [roleId, perms] of Object.entries(rolePermissions)) {
    if (roleId === 'admin') continue
    if (perms.includes(code) || perms.includes('*:*:*')) {
      matched.push(roleNames[roleId] || roleId)
    }
  }
  return matched
}

const filteredPermissions = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return permissions.value
  return permissions.value.filter(
    (p) =>
      p.code.toLowerCase().includes(kw) ||
      p.name.toLowerCase().includes(kw) ||
      p.module.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw),
  )
})

const moduleCounts = computed(() => {
  const set = new Set(permissions.value.map((p) => p.module))
  return set.size
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="permission-page">
    <div class="page-heading">
      <div>
        <h2>权限管理</h2>
        <p class="muted">查看系统所有功能权限点定义、受控业务资源及角色授权策略</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="perm-stats-grid">
      <div class="stat-card panel">
        <div class="stat-label">系统权限点总数</div>
        <div class="stat-number">{{ permissions.length }}</div>
        <div class="stat-meta">已定义受控操作点</div>
      </div>
      <div class="stat-card panel">
        <div class="stat-label">覆盖业务模块</div>
        <div class="stat-number">{{ moduleCounts }}</div>
        <div class="stat-meta">系统、采购、库存、商品等</div>
      </div>
      <div class="stat-card panel">
        <div class="stat-label">预设系统角色</div>
        <div class="stat-number">4</div>
        <div class="stat-meta">管理员、采购、审批、仓储</div>
      </div>
    </div>

    <!-- Table panel -->
    <div class="panel table-panel">
      <div class="table-toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索权限编码、名称、所属模块或说明"
          clearable
          :prefix-icon="Search"
          class="perm-search"
        />
      </div>

      <el-table v-loading="loading" :data="filteredPermissions" stripe class="permission-table">
        <el-table-column prop="code" label="权限编码" width="200">
          <template #default="{ row }">
            <code class="font-mono perm-code">{{ row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="权限名称" width="160" />
        <el-table-column prop="module" label="所属模块" width="140">
          <template #default="{ row }">
            <span class="module-badge">{{ row.module }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="功能与操作说明" min-width="260" />
        <el-table-column label="已配置角色" min-width="240">
          <template #default="{ row }">
            <div class="role-tags-wrap">
              <el-tag
                v-for="r in getRolesForPerm(row.code)"
                :key="r"
                size="small"
                effect="plain"
                class="role-tag-badge"
              >
                {{ r }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
