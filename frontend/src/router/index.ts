import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'
import { pages } from './menu'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
    {
      path: '/first-login/change-password',
      component: () => import('../views/FirstLoginChangePassword.vue'),
      meta: { title: '首次登录修改密码' },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: '/profile/security',
          component: () => import('../views/ProfileSecurity.vue'),
          meta: { title: '账号安全' },
        },
        {
          path: '/system/employees/:id',
          component: () => import('../views/EmployeeDetail.vue'),
          meta: { title: '员工详情', permission: 'system/employees' },
        },
        ...pages.map((page) => ({
          path: page.path,
          component:
            page.path === '/dashboard'
              ? () => import('../views/Dashboard.vue')
              : page.path === '/system/employees'
                ? () => import('../views/EmployeeList.vue')
                : page.path === '/system/permissions'
                  ? () => import('../views/PermissionList.vue')
                  : () => import('../views/ResourcePage.vue'),
          meta: { ...page },
        })),
        {
          path: '/403',
          component: () => import('../views/NotFound.vue'),
          meta: { title: '无权访问', forbidden: true },
        },
        {
          path: '/:pathMatch(.*)*',
          component: () => import('../views/NotFound.vue'),
          meta: { title: '页面不存在' },
        },
      ],
    },
  ],
})
router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.restore()
  if (!auth.session && to.path !== '/login')
    return { path: '/login', query: { redirect: to.fullPath } }
  if (auth.session) {
    if (auth.session.user.mustChangePassword) {
      if (to.path !== '/first-login/change-password') {
        return '/first-login/change-password'
      }
    } else {
      if (to.path === '/first-login/change-password' || to.path === '/login') {
        return '/dashboard'
      }
    }
  }
  if (to.meta.permission && !auth.can(String(to.meta.permission))) return '/403'
  document.title = `${to.meta.title || '工作台'} · ProcureFlow`
})
