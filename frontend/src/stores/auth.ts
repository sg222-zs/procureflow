import { defineStore } from 'pinia'
import { ref } from 'vue'
import { currentUser, login } from '../api/auth'
import type { Session } from '../types'
export const useAuth = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)
  function can(permission: string) {
    return !!session.value?.permissions.some((p) => p === '*:*:*' || p === permission)
  }
  async function signIn(employeeNo: string, password: string) {
    session.value = await login(employeeNo, password)
    sessionStorage.setItem('pf-token', session.value.accessToken)
    ready.value = true
    return session.value
  }
  async function restore() {
    if (ready.value) return
    try {
      if (sessionStorage.getItem('pf-token')) session.value = await currentUser()
    } catch {
      session.value = null
      sessionStorage.removeItem('pf-token')
    } finally {
      ready.value = true
    }
  }
  function signOut() {
    session.value = null
    sessionStorage.removeItem('pf-token')
    ready.value = true
  }
  return { session, ready, can, signIn, restore, signOut }
})
