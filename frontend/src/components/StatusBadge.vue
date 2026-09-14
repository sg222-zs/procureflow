<script setup lang="ts">
import { computed } from 'vue'
import { statusText } from '../utils/status'

const props = defineProps<{
  value?: string
  text?: string
  type?: 'employment' | 'account' | 'default'
}>()

const displayStatus = computed(() => {
  if (props.text) return props.text
  const val = props.value || ''
  if (props.type === 'employment') {
    if (val === 'ACTIVE') return '在职'
    if (val === 'ON_LEAVE') return '休假'
    if (val === 'TERMINATED') return '已离职'
  }
  if (props.type === 'account') {
    if (val === 'ENABLED') return '正常'
    if (val === 'PENDING') return '待首次登录'
    if (val === 'LOCKED') return '已锁定'
    if (val === 'DISABLED') return '已停用'
    if (val === 'NONE') return '未开通'
  }
  return statusText(val)
})
</script>
<template>
  <span class="status-badge" :class="(value || '').toLowerCase()"><i></i>{{ displayStatus }}</span>
</template>
