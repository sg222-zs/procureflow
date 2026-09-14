<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<template>
  <el-result
    :icon="route.meta.forbidden ? 'warning' : 'info'"
    :title="route.meta.forbidden ? '403 · 当前角色无权访问' : '404 · 页面不存在'"
    sub-title="可以返回工作台，或切换演示角色后重试。"
    ><template #extra
      ><router-link to="/dashboard"
        ><el-button type="primary">返回工作台</el-button></router-link
      ></template
    ></el-result
  >
</template>
