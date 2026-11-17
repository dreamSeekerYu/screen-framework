import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    // 路由懒加载
    component: () => import('@/views/Home/index.vue'),
    meta: { title: '大屏首页' }
  }, {
    path: '/pack',
    name: 'Pack',
    // 路由懒加载
    component: () => import('@/views/Pack/index.vue'),
    meta: { title: '客户表现' }
  }, {
    path: '/question',
    name: 'Question',
    // 路由懒加载
    component: () => import('@/views/Question/index.vue'),
    meta: { title: '异常闭环' }
  }, {
    path: '/cpk',
    name: 'Cpk',
    // 路由懒加载
    component: () => import('@/views/Cpk/index.vue'),
    meta: { title: '过程能力' }
  }, {
    path: '/qc',
    name: 'Qc',
    // 路由懒加载
    component: () => import('@/views/Qc/index.vue'),
    meta: { title: '人力规划' }
  }, {
    path: '/plain',
    name: 'Plain',
    // 路由懒加载
    component: () => import('@/views/Plain/index.vue'),
    meta: { title: '工作计划' }
  }, {
    path: '/think',
    name: 'Think',
    // 路由懒加载
    component: () => import('@/views/Think/index.vue'),
    meta: { title: '周度思考' }
  },
  {
    path: '/LPA',
    name: 'LPA',
    // 路由懒加载
    component: () => import('@/views/LPA/index.vue'),
    meta: { title: 'LPA' }
  },
  {
    path: '/comp',
    name: 'Comp',
    component: () => import('@/views/Comp/index.vue'),
    meta: { title: '组件展示', noScale: true }
  },
  {
    path: '/newcomp',
    name: 'NewComp',
    component: () => import('@/views/NewComp/index.vue'),
    meta: { title: '统计卡片组件', noScale: true }
  },
  {
    path: '/tags',
    name: 'Tags',
    component: () => import('@/views/NewComp/Demo.vue'),
    meta: { title: '组件展示', noScale: true }
  },
{
    path: '/c_q_Card',
    name: 'C_Q_Card',
    component: () => import('@/views/NewComp/CustomerQualityCard.vue'),
    meta: { title: '客户质量卡片', noScale: true }
  },
  {
    path: '/commoncomp',
    name: 'CommonComp',
    component: () => import('@/views/NewComp/CommonCompDemo.vue'),
    meta: { title: '通用组件展示', noScale: true }
  },
]

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
