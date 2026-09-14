<script setup lang="ts">
// Adapted from pure-admin-thin src/components/ReAuth/src/auth.tsx (MIT).
import { useAuth } from '../stores/auth'
defineProps<{ value: string }>()
const auth = useAuth()
</script>
<template><slot v-if="auth.can(value)" /></template>
