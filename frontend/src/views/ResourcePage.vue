<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, MoreFilled } from '@element-plus/icons-vue'
import type { Entity, Query, Resource } from '../types'
import { configs } from './resources'
import { useAuth } from '../stores/auth'
import { money } from '../utils/money'
import { statusText } from '../utils/status'
import { getDetail } from '../api/system'
import {
  approvePurchaseRequest,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  withdrawPurchaseRequest,
  cancelPurchaseRequest,
  revisePurchaseRequest,
} from '../api/procurement'
import { deleteSupplier } from '../api/supplier'
import Auth from '../components/Auth.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EntityForm from '../components/EntityForm.vue'
import EntityDetail from '../components/EntityDetail.vue'
const route = useRoute(),
  router = useRouter(),
  auth = useAuth()
const resource = computed(() => route.meta.resource as Resource),
  config = computed(() => configs[resource.value])
const rows = ref<Entity[]>([]),
  totalRows = ref(0),
  loading = ref(false),
  failed = ref(false),
  busy = ref(false)
const formOpen = ref(false),
  detailOpen = ref(false),
  editing = ref<Entity>(),
  detail = ref<Entity>()
if (route.query.create === '1' && config.value.create && auth.can(config.value.permission!))
  formOpen.value = true
const filters = reactive({
  keyword: '',
  status: '',
  category: '',
  supplierId: '',
  warehouse: '',
  skuId: '',
  orderId: '',
  department: '',
  start: '',
  end: '',
  tab: 'pending',
  page: 1,
  page_size: 20,
})
const dates = ref<[string, string] | null>(null)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true
  failed.value = false
  try {
    const data = await config.value.list({
      ...filters,
      tab: resource.value === 'approvals' ? filters.tab : undefined,
    })
    if (current === generation) {
      rows.value = data.items
      totalRows.value = data.total
    }
  } catch {
    if (current === generation) failed.value = true
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => route.query,
  (query) => {
    for (const key of [
      'keyword',
      'status',
      'category',
      'supplierId',
      'warehouse',
      'skuId',
      'orderId',
      'department',
      'start',
      'end',
    ] as const)
      filters[key] = typeof query[key] === 'string' ? (query[key] as string) : ''
    filters.page = Math.max(1, Number(query.page) || 1)
    filters.page_size = [20, 50, 100].includes(Number(query.page_size))
      ? Number(query.page_size)
      : 20
    filters.tab = query.tab === 'processed' ? 'processed' : 'pending'
    dates.value = filters.start && filters.end ? [filters.start, filters.end] : null
    load()
  },
  { immediate: true },
)
async function search(reset = true) {
  if (reset) filters.page = 1
  filters.start = dates.value?.[0] || ''
  filters.end = dates.value?.[1] || ''
  const query: Record<string, string> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && (key !== 'tab' || resource.value === 'approvals'))
      query[key] = String(value)
  })
  if (JSON.stringify(route.query) === JSON.stringify(query)) await load()
  else await router.replace({ query })
}
function reset() {
  router.replace({ query: {} })
  if (!Object.keys(route.query).length) load()
}
function create() {
  editing.value = undefined
  formOpen.value = true
}
function edit(row: Entity) {
  editing.value = row
  formOpen.value = true
}
async function saved() {
  formOpen.value = false
  await load()
}
async function showDetail(row: Entity) {
  if (busy.value) return
  busy.value = true
  try {
    detail.value = await getDetail(resource.value, row.id)
    detailOpen.value = true
  } catch {
    /* centralized */
  } finally {
    busy.value = false
  }
}
function actions(row: Entity) {
  const items: { key: string; label: string }[] = []
  if (['suppliers', 'products', 'skus'].includes(resource.value) && auth.can('catalog:write')) {
    items.push(
      { key: 'edit', label: '编辑' },
      { key: 'toggle', label: row.status === 'ACTIVE' ? '停用' : '启用' },
    )
    if (resource.value === 'suppliers') items.push({ key: 'delete', label: '删除' })
  }
  if (resource.value === 'purchase-requests' && auth.can('request:write')) {
    if (row.status === 'DRAFT')
      items.push(
        { key: 'edit', label: '编辑' },
        { key: 'submit', label: '提交审批' },
        { key: 'cancel', label: '取消申请' },
      )
    if (row.status === 'PENDING_APPROVAL') items.push({ key: 'withdraw', label: '撤回' })
    if (row.status === 'REJECTED') items.push({ key: 'revise', label: '修订为草稿' })
  }
  if (
    resource.value === 'approvals' &&
    row.status === 'PENDING_APPROVAL' &&
    auth.can('approval:write')
  )
    items.push({ key: 'approve', label: '批准' }, { key: 'reject', label: '驳回' })
  return items
}
async function action(key: string, row: Entity) {
  if (busy.value) return
  if (key === 'edit') {
    edit(row)
    return
  }
  busy.value = true
  try {
    let reason = ''
    if (key === 'reject') {
      const result = await ElMessageBox.prompt('请输入驳回原因：', '驳回申请', {
        inputType: 'textarea',
        inputValidator: (v) => !!v?.trim() || '驳回原因不能为空',
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
      })
      reason = result.value
    } else
      await ElMessageBox.confirm(
        `确认${actions(row).find((a) => a.key === key)?.label}「${row.name}」？`,
        '确认操作',
        { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' },
      )
    const calls: Record<string, () => Promise<unknown>> = {
      submit: () => submitPurchaseRequest(row.id),
      withdraw: () => withdrawPurchaseRequest(row.id),
      cancel: () => cancelPurchaseRequest(row.id),
      revise: () => revisePurchaseRequest(row.id),
      approve: () => approvePurchaseRequest(row.id),
      reject: () => rejectPurchaseRequest(row.id, reason),
      toggle: () =>
        config.value.save!(
          { ...row, status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
          row.id,
        ),
      delete: () => deleteSupplier(row.id),
    }
    await calls[key]!()
    ElMessage.success(key === 'approve' ? '审批通过，采购订单已生成' : '操作成功')
    await load()
  } catch {
    /* dialog cancellation or centralized API error */
  } finally {
    busy.value = false
  }
}
function display(row: Entity, key: keyof Entity) {
  const value = row[key]
  return Array.isArray(value) ? value.join(' · ') : (value ?? '—')
}
function progress(row: Entity) {
  return Math.round(
    ((row.items?.reduce((n, i) => n + i.received, 0) || 0) /
      (row.items?.reduce((n, i) => n + i.quantity, 0) || 1)) *
      100,
  )
}
</script>
<template>
  <section class="resource-view">
    <div class="page-heading">
      <div>
        <h1>{{ route.meta.title }}</h1>
        <p>{{ route.meta.description }}</p>
      </div>
      <Auth v-if="config.create" :value="config.permission!">
        <el-button type="primary" :icon="Plus" @click="create">
          {{ config.create }}
        </el-button>
      </Auth>
    </div>
    <div v-if="resource === 'approvals'" class="approval-tabs">
      <el-radio-group v-model="filters.tab" @change="search()"
        ><el-radio-button value="pending">待我审批</el-radio-button
        ><el-radio-button value="processed">已处理</el-radio-button></el-radio-group
      >
    </div>
    <div class="panel list-panel">
      <form class="filter-bar" @submit.prevent="search()">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索名称、编号或关键词"
          :prefix-icon="Search"
          clearable
          class="keyword-input"
          aria-label="关键词"
        /><el-select
          v-if="config.statuses.length"
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          class="filter-select"
          aria-label="状态"
          ><el-option
            v-for="s in config.statuses"
            :key="s"
            :label="statusText(s)"
            :value="s" /></el-select
        ><el-select
          v-if="resource === 'products'"
          v-model="filters.category"
          placeholder="全部分类"
          clearable
          class="filter-select"
          ><el-option
            v-for="v in ['数码设备', '办公家具', '办公耗材']"
            :key="v"
            :value="v" /></el-select
        ><el-input
          v-if="['skus', 'purchase-orders'].includes(resource)"
          v-model="filters.supplierId"
          placeholder="供应商编号"
          class="filter-select"
          clearable
        /><el-input
          v-if="['purchase-requests', 'approvals'].includes(resource)"
          v-model="filters.department"
          placeholder="所属部门"
          class="filter-select"
          clearable
        /><el-select
          v-if="resource.startsWith('inventory') || resource === 'warehouse-receipts'"
          v-model="filters.warehouse"
          placeholder="全部仓库"
          clearable
          class="filter-select"
          ><el-option v-for="w in ['杭州中心仓', '上海分仓']" :key="w" :value="w" /></el-select
        ><el-input
          v-if="resource === 'inventory/transactions'"
          v-model="filters.skuId"
          placeholder="SKU 编号"
          class="filter-select"
          clearable
        /><el-input
          v-if="resource === 'inventory/transactions'"
          v-model="filters.orderId"
          placeholder="业务订单号"
          class="filter-select"
          clearable
        /><el-date-picker
          v-model="dates"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px; flex-grow: 0"
        /><el-button type="primary" native-type="submit">查询</el-button
        ><el-button @click="reset">重置</el-button>
      </form>
      <div class="table-heading">
        <h3>
          {{ route.meta.title }}<span>{{ totalRows }} 条记录</span>
        </h3>
        <el-button text :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-result
        v-if="failed"
        icon="error"
        title="数据加载失败"
        sub-title="请检查服务状态，或重试本次请求。"
        ><template #extra><el-button @click="load">重新加载</el-button></template></el-result
      >
      <el-table v-else v-loading="loading" :data="rows" row-key="id" style="width: 100%"
        ><template #empty><el-empty description="暂无匹配的数据记录" :image-size="70" /></template
        ><el-table-column prop="id" label="编号" min-width="160"
          ><template #default="{ row }"
            ><button class="text-link mono" @click="showDetail(row)">{{ row.id }}</button></template
          ></el-table-column
        ><el-table-column
          v-for="column in config.columns"
          :key="column.key"
          :label="column.label"
          :min-width="column.width || 130"
          show-overflow-tooltip
          ><template #default="{ row }"
            ><span :class="{ 'money-cell': column.money }">{{
              column.money ? money(row[column.key]) : display(row, column.key)
            }}</span></template
          ></el-table-column
        ><el-table-column v-if="resource === 'purchase-orders'" label="到货进度" min-width="150"
          ><template #default="{ row }"
            ><el-progress
              :percentage="progress(row)"
              :stroke-width="5" /></template></el-table-column
        ><el-table-column v-if="config.statuses.length" label="状态" width="125"
          ><template #default="{ row }"
            ><StatusBadge :value="row.status" /></template></el-table-column
        ><el-table-column label="创建时间" width="125"
          ><template #default="{ row }">{{
            new Date(row.createdAt).toLocaleDateString('zh-CN')
          }}</template></el-table-column
        ><el-table-column label="操作" width="115" fixed="right"
          ><template #default="{ row }"
            ><el-button text type="primary" :disabled="busy" @click="showDetail(row)"
              >详情</el-button
            ><el-dropdown v-if="actions(row).length" @command="(key: string) => action(key, row)"
              ><el-button text :disabled="busy" aria-label="更多操作"
                ><el-icon><MoreFilled /></el-icon></el-button
              ><template #dropdown
                ><el-dropdown-menu
                  ><el-dropdown-item v-for="a in actions(row)" :key="a.key" :command="a.key">{{
                    a.label
                  }}</el-dropdown-item></el-dropdown-menu
                ></template
              ></el-dropdown
            ></template
          ></el-table-column
        ></el-table
      >
      <div class="pagination">
        <span>共 {{ totalRows }} 条记录</span
        ><el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.page_size"
          :page-sizes="[20, 50, 100]"
          :total="totalRows"
          layout="sizes, prev, pager, next"
          @current-change="search(false)"
          @size-change="search()"
        />
      </div>
    </div>
    <el-drawer
      v-model="formOpen"
      :title="editing ? `编辑${route.meta.title}` : config.create"
      size="min(760px, 96vw)"
      destroy-on-close
      :close-on-click-modal="false"
      ><EntityForm
        v-if="formOpen"
        :resource="resource"
        :initial="editing"
        @saved="saved"
        @cancel="formOpen = false"
    /></el-drawer>
    <el-drawer v-model="detailOpen" title="业务详情" size="min(820px, 96vw)" destroy-on-close
      ><EntityDetail v-if="detail" :record="detail"
    /></el-drawer>
  </section>
</template>
