<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowRight,
  Plus,
  Document,
  Clock,
  Wallet,
  Warning,
  Refresh,
} from '@element-plus/icons-vue'
import { getDashboard } from '../api/system'
import type { Dashboard } from '../types'
import { useAuth } from '../stores/auth'
import { money } from '../utils/money'
import StatusBadge from '../components/StatusBadge.vue'
import TrendChart from '../components/TrendChart.vue'
const auth = useAuth(),
  data = ref<Dashboard>(),
  loading = ref(true),
  failed = ref(false)
const today = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
}).format(new Date())
const stats = computed(() => [
  {
    label: '采购申请',
    value: data.value?.requestCount || 0,
    unit: '笔',
    icon: Document,
    note: '全部状态累计',
    color: 'green',
  },
  {
    label: '待审批申请',
    value: data.value?.pendingCount || 0,
    unit: '笔',
    icon: Clock,
    note: '待处理流转',
    color: 'amber',
  },
  {
    label: '采购订单总额',
    value: money(data.value?.orderAmount),
    unit: '',
    icon: Wallet,
    note: '已批准订单合计',
    color: 'blue',
  },
  {
    label: '库存预警',
    value: data.value?.lowStockCount || 0,
    unit: '项',
    icon: Warning,
    note: '低于安全阈值',
    color: 'rose',
  },
])
async function load() {
  loading.value = true
  failed.value = false
  try {
    data.value = await getDashboard()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <section v-loading="loading" class="dashboard-view">
    <div class="page-heading">
      <div>
        <h1>工作台</h1>
        <p>
          {{ today }} <span class="date-dot">·</span> 欢迎回来，{{ auth.session?.user.name }}（{{
            auth.session?.user.department
          }}）
        </p>
      </div>
      <div class="heading-actions">
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <router-link v-if="auth.can('request:write')" to="/procurement/requests?create=1">
          <el-button type="primary" :icon="Plus">新建采购申请</el-button>
        </router-link>
      </div>
    </div>
    <el-result
      v-if="failed"
      icon="error"
      title="工作台加载失败"
      sub-title="无法获取仪表盘数据，请检查网络或后端服务"
    >
      <template #extra><el-button type="primary" @click="load">重新加载</el-button></template>
    </el-result>
    <template v-else-if="data">
      <div class="workflow-summary">
        <div class="workflow-header">
          <span class="workflow-title">采购与供应链业务链路</span>
          <span class="workflow-desc">业务全流程闭环协同</span>
        </div>
        <div class="workflow-steps">
          <router-link to="/procurement/requests" class="step-item">
            <span class="step-badge">1</span>
            <div class="step-meta">
              <strong>需求申请</strong>
              <small>{{ data.requestCount }} 笔申请</small>
            </div>
          </router-link>
          <div class="step-arrow">→</div>
          <router-link
            to="/procurement/approvals"
            class="step-item"
            :class="{ highlight: data.pendingCount > 0 }"
          >
            <span class="step-badge">2</span>
            <div class="step-meta">
              <strong>审批流转</strong>
              <small>{{ data.pendingCount }} 笔待审</small>
            </div>
          </router-link>
          <div class="step-arrow">→</div>
          <router-link to="/procurement/orders" class="step-item">
            <span class="step-badge">3</span>
            <div class="step-meta">
              <strong>订单履约</strong>
              <small>{{ data.recentOrders.length }} 笔近期订单</small>
            </div>
          </router-link>
          <div class="step-arrow">→</div>
          <router-link
            to="/inventory/stocks"
            class="step-item"
            :class="{ warning: data.lowStockCount > 0 }"
          >
            <span class="step-badge">4</span>
            <div class="step-meta">
              <strong>库存与预警</strong>
              <small>{{ data.lowStockCount }} 项预警</small>
            </div>
          </router-link>
        </div>
      </div>

      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <div class="stat-label">
            <span>{{ stat.label }}</span>
            <span class="stat-icon" :class="stat.color">
              <el-icon><component :is="stat.icon" /></el-icon>
            </span>
          </div>
          <div class="stat-value">
            {{ stat.value }}<small v-if="stat.unit">{{ stat.unit }}</small>
          </div>
          <div class="stat-foot">
            <span class="live-dot" :class="stat.color"></span>
            <span>{{ stat.note }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>采购趋势</h3>
              <p>最近 7 天订单金额走势（元）</p>
            </div>
            <el-tag effect="plain" type="info" size="small">近 7 天</el-tag>
          </div>
          <TrendChart :values="data.trend" />
        </div>
        <div class="panel todos">
          <div class="panel-heading">
            <div>
              <h3>待办与跟进</h3>
              <p>待处理的审批与异常预警</p>
            </div>
            <span class="count-bubble">{{ data.pendingCount + data.lowStockCount }}</span>
          </div>
          <router-link v-if="auth.can('approvals')" to="/procurement/approvals" class="todo-row">
            <span class="todo-icon amber">
              <el-icon><Clock /></el-icon>
            </span>
            <div>
              <strong>采购申请待审批</strong>
              <small>{{ data.pendingCount }} 笔申请待处理</small>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </router-link>
          <router-link
            v-if="auth.can('inventory/stocks')"
            to="/inventory/stocks?status=LOW"
            class="todo-row"
          >
            <span class="todo-icon rose">
              <el-icon><Warning /></el-icon>
            </span>
            <div>
              <strong>库存水位预警</strong>
              <small>{{ data.lowStockCount }} 项物料低于安全库存</small>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </router-link>
          <router-link v-if="auth.can('purchase-orders')" to="/procurement/orders" class="todo-row">
            <span class="todo-icon green">
              <el-icon><Document /></el-icon>
            </span>
            <div>
              <strong>采购订单履约</strong>
              <small>跟进供应商交付与到货入库进度</small>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </router-link>
        </div>
      </div>

      <div class="dashboard-grid bottom-grid">
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>最新采购订单</h3>
              <p>近期生成的业务单据</p>
            </div>
            <router-link to="/procurement/orders" class="text-link">查看全部 →</router-link>
          </div>
          <el-table :data="data.recentOrders">
            <el-table-column prop="id" label="订单编号" min-width="155" />
            <el-table-column prop="name" label="采购内容" min-width="200" />
            <el-table-column label="订单金额" width="145">
              <template #default="{ row }">
                <strong class="money-cell">{{ money(row.amount) }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <StatusBadge :value="row.status" />
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无采购订单" :image-size="60" /></template>
          </el-table>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>库存警戒明细</h3>
              <p>需及时采购补货的物料</p>
            </div>
            <router-link to="/inventory/stocks?status=LOW" class="text-link"
              >查看全部 →</router-link
            >
          </div>
          <div v-for="stock in data.lowStocks" :key="stock.id" class="stock-alert">
            <div class="stock-title">
              <strong>{{ stock.name }}</strong>
              <span
                >{{ stock.available }} <small>/ {{ stock.threshold }}</small></span
              >
            </div>
            <el-progress
              :percentage="Math.round((stock.available! / stock.threshold!) * 100)"
              :show-text="false"
              color="#e6a23c"
              :stroke-width="6"
            />
            <small>{{ stock.warehouse }} · 安全库存 {{ stock.threshold }}</small>
          </div>
          <el-empty
            v-if="!data.lowStocks.length"
            description="库存状态正常，无预警项"
            :image-size="60"
          />
        </div>
      </div>
    </template>
  </section>
</template>
