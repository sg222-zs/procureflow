<script setup lang="ts">
import type { Entity } from '../types'
import { money } from '../utils/money'
import StatusBadge from './StatusBadge.vue'
defineProps<{ record: Entity }>()
const labels: Partial<Record<keyof Entity, string>> = {
  contact: '联系人',
  phone: '电话',
  email: '邮箱',
  category: '分类',
  department: '部门',
  role: '角色',
  supplierId: '供应商',
  productId: '商品',
  spec: '规格',
  applicant: '申请人',
  requestId: '来源申请',
  orderId: '订单',
  warehouse: '仓库',
  skuId: 'SKU',
  available: '可用库存',
  locked: '锁定库存',
  threshold: '预警线',
  quantity: '数量',
  actor: '操作人',
  module: '模块',
  action: '动作',
  traceId: '请求 ID',
  note: '说明',
}
</script>
<template>
  <div class="detail-heading">
    <div class="detail-title-line">
      <span class="detail-id-badge">{{ record.id }}</span>
      <StatusBadge v-if="record.status" :value="record.status" />
    </div>
    <h2>{{ record.name }}</h2>
  </div>
  <el-descriptions :column="2" border>
    <el-descriptions-item label="创建时间" :span="2">
      {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
    </el-descriptions-item>
    <template v-for="(label, key) in labels" :key="key">
      <el-descriptions-item v-if="record[key] !== undefined" :label="label">
        {{ record[key] }}
      </el-descriptions-item>
    </template>
    <el-descriptions-item v-if="record.amount || record.price" label="金额">
      {{ money(record.amount || record.price) }}
    </el-descriptions-item>
  </el-descriptions>

  <template v-if="record.permissions">
    <h3>菜单与按钮权限</h3>
    <div class="permission-tags">
      <el-tag v-for="p in record.permissions" :key="p" effect="plain">
        {{ p === '*:*:*' ? '全部权限' : p }}
      </el-tag>
    </div>
  </template>

  <template v-if="record.items">
    <h3>物料明细快照</h3>
    <el-table :data="record.items">
      <el-table-column prop="name" label="物料 / 规格" min-width="200" />
      <el-table-column prop="quantity" label="计划数量" width="100" />
      <el-table-column prop="received" label="已入库" width="90" />
      <el-table-column label="单价" width="120">
        <template #default="{ row }">{{ money(row.price) }}</template>
      </el-table-column>
    </el-table>
  </template>

  <template v-if="record.packages">
    <h3>到货履约进度</h3>
    <div class="progress-wrap">
      <el-progress
        :percentage="
          Math.round(
            ((record.items?.reduce((n, i) => n + i.received, 0) || 0) /
              (record.items?.reduce((n, i) => n + i.quantity, 0) || 1)) *
              100,
          )
        "
        :stroke-width="8"
      />
    </div>
    <el-empty v-if="!record.packages.length" description="暂无到货包裹记录" :image-size="60" />
    <div v-for="p in record.packages" :key="p.id" class="package-row">
      <strong>{{ p.id }}</strong>
      <span>{{ p.warehouse }} · {{ p.quantity }} 件</span>
      <StatusBadge :value="p.status" />
    </div>
  </template>

  <template v-if="record.trail">
    <h3>审批流转记录</h3>
    <el-empty v-if="!record.trail.length" description="暂无审批记录" :image-size="60" />
    <el-timeline v-else>
      <el-timeline-item
        v-for="(t, i) in record.trail"
        :key="i"
        :timestamp="new Date(t.at).toLocaleString('zh-CN')"
        color="#0f766e"
      >
        <strong>{{ t.actor }} · {{ t.action }}</strong>
        <p v-if="t.reason" class="trail-reason">{{ t.reason }}</p>
      </el-timeline-item>
    </el-timeline>
  </template>
</template>
