import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { useAuth } from './stores/auth'
const app = createApp(App)
app.use(createPinia()).use(router).use(ElementPlus, { locale: zhCn }).mount('#app')
window.addEventListener('pf-unauthorized', () => {
  useAuth().signOut()
  router.push('/login')
})
