import { createRouter, createWebHashHistory } from 'vue-router'
import { PAGE_REGISTRY } from '@/config/pages.js'

/**
 * 业务路由由「页面注册中心」(src/config/pages.js) 生成：
 * 新增大屏页面只需在注册中心加一条记录 + 建 views/{view}/index.vue，无需改本文件。
 * 组件按 views/{view}/index.vue 懒加载（import.meta.glob 保证 Vite 正确分包）。
 */
const viewModules = import.meta.glob('../views/*/index.vue')

const businessRoutes = PAGE_REGISTRY
  .map(p => {
    const component = viewModules[`../views/${p.view}/index.vue`]
    if (!component) {
      // 注册了但文件未创建：跳过并告警，避免白屏
      console.warn(`[pages] 注册页面 views/${p.view}/index.vue 不存在，已跳过路由 ${p.path}`)
      return null
    }
    return {
      path: p.path,
      name: p.key,
      component,
      meta: { title: p.title, business: p.business, noScale: !p.business }
    }
  })
  .filter(Boolean)

// 组件演示页（noScale，单文件组件）：保留为组件规范文档，不进导航链路
const demoRoutes = [
  { path: '/comp', name: 'Comp', component: () => import('@/views/Comp/index.vue'), meta: { title: '组件展示', noScale: true } },
  { path: '/newcomp', name: 'NewComp', component: () => import('@/views/NewComp/index.vue'), meta: { title: '统计卡片组件', noScale: true } },
  { path: '/tags', name: 'Tags', component: () => import('@/views/NewComp/Demo.vue'), meta: { title: '组件展示', noScale: true } },
  { path: '/c_q_Card', name: 'C_Q_Card', component: () => import('@/views/NewComp/CustomerQualityCard.vue'), meta: { title: '客户质量卡片', noScale: true } },
  { path: '/commoncomp', name: 'CommonComp', component: () => import('@/views/NewComp/CommonCompDemo.vue'), meta: { title: '通用组件展示', noScale: true } },
]

const routes = [...businessRoutes, ...demoRoutes]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
