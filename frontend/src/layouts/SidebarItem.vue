<script setup lang="ts">
// Trimmed from pure-admin-thin SidebarItem: recursive Element Plus menu,
// single-child flattening and route-driven entries. See THIRD_PARTY_NOTICES.md.
import { computed } from 'vue'
import * as icons from '@element-plus/icons-vue'
import type { Menu } from '../router/menu'
import { useAuth } from '../stores/auth'
const props = defineProps<{ item: Menu }>()
const auth = useAuth()
const showingChildren = computed(() =>
  (props.item.children || []).filter((item) => auth.can(item.permission)),
)
const onlyOneChild = computed(() =>
  showingChildren.value.length === 1 ? showingChildren.value[0]! : props.item,
)
const icon = (name: string) => icons[name as keyof typeof icons]
</script>
<template>
  <el-sub-menu v-if="showingChildren.length > 1" :index="item.path">
    <template #title
      ><el-icon><component :is="icon(item.icon)" /></el-icon><span>{{ item.title }}</span></template
    >
    <SidebarItem v-for="child in showingChildren" :key="child.path" :item="child" />
  </el-sub-menu>
  <el-menu-item v-else-if="auth.can(onlyOneChild.permission)" :index="onlyOneChild.path"
    ><el-icon><component :is="icon(onlyOneChild.icon)" /></el-icon
    ><template #title>{{ onlyOneChild.title }}</template></el-menu-item
  >
</template>
