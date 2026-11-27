/**
 * 页面注册中心 —— 大屏业务页面的唯一数据源
 *
 * 以下能力全部由本文件派生，新增/调整页面只需改这里：
 *   1. 业务路由表        → src/router/index.js（import PAGE_REGISTRY 生成）
 *   2. 翻页白名单        → src/config/navPages.js（NAV_PAGES 由本文件 filter 生成）
 *   3. 大屏首页环形卡片  → src/views/Home/index.vue（badge/desc/icon 取自本文件）
 *
 * 字段说明：
 *   view       views 目录名（组件自动按 `views/{view}/index.vue` 懒加载）
 *   path       路由路径
 *   title      页面标题（路由守卫同步 document.title / 导航器 / 首页卡片）
 *   subtitle   导航器副标题（英文缩写）
 *   icon       首页环形卡片图标 key（ICONS 表）
 *   business   是否业务大屏页（demo/组件演示页为 false，路由以独立数组维护）
 *   nav        是否进入翻页白名单与首页环形导航（未完成页如 LPA 为 false）
 *   badge      首页卡片角标（如 'PACK · 客户'）
 *   desc       首页卡片描述
 *   carousel   页内 Tab 自动轮播配置（interval 毫秒；null = 不轮播）
 *   layout     布局模板 key（kpi-grid / kpi-table / tabbed-matrix），见 src/layouts/README
 */

export const PAGE_REGISTRY = [
  {
    view: 'Home', path: '/', key: 'Home', title: '大屏首页', subtitle: 'Dashboard',
    icon: 'home', business: true, nav: false, ring: false,
    badge: '', desc: '', carousel: null, layout: null,
  },
  {
    view: 'Pack', path: '/pack', key: 'Pack', title: '客户表现', subtitle: 'PACK',
    icon: 'pack', business: true, nav: true,
    badge: 'PACK · 客户', desc: '5 大客户交付质量表现，月度/周度趋势分析',
    carousel: { interval: 12000 }, layout: 'kpi-grid',
  },
  {
    view: 'Question', path: '/question', key: 'Question', title: '异常闭环', subtitle: 'Question',
    icon: 'question', business: true, nav: true,
    badge: '异常 · 闭环', desc: '重大质量异常闭环率、根因对策、进度追踪',
    carousel: null, layout: 'kpi-grid',
  },
  {
    view: 'Cpk', path: '/cpk', key: 'Cpk', title: '过程能力', subtitle: 'CPK',
    icon: 'cpk', business: true, nav: true,
    badge: '过程 · 能力', desc: '关键工序过程能力指数 Cpk 达标率与趋势',
    carousel: null, layout: 'kpi-grid',
  },
  {
    view: 'Qc', path: '/qc', key: 'Qc', title: '人力规划', subtitle: 'QC HR',
    icon: 'qc', business: true, nav: true,
    badge: '人力 · 规划', desc: 'QC 人力配置、缺口分析、离职率与支援来源',
    carousel: null, layout: 'kpi-grid',
  },
  {
    view: 'Plain', path: '/plain', key: 'Plain', title: '工作计划', subtitle: 'Plan',
    icon: 'plain', business: true, nav: true,
    badge: '工作 · 计划', desc: '本周重点工作计划与节点跟进',
    carousel: null, layout: 'kpi-table',
  },
  {
    view: 'Think', path: '/think', key: 'Think', title: '周度思考', subtitle: 'Thinking',
    icon: 'think', business: true, nav: true,
    badge: '周度 · 思考', desc: '周度思考沉淀与改进方向',
    carousel: null, layout: 'tabbed-matrix',
  },
  {
    // 未完成页：注册保留路由，但不进翻页白名单与首页环形（上线前置 nav: true）
    view: 'LPA', path: '/LPA', key: 'LPA', title: 'LPA', subtitle: 'LPA',
    icon: 'default', business: true, nav: false,
    badge: '过程 · 审核', desc: '分层过程审核（LPA）执行与问题闭环',
    carousel: null, layout: 'kpi-grid',
  },
]

/** 组件演示页（noScale，不进导航链路；保留为组件规范文档页） */
export const DEMO_PAGES = [
  { view: 'Comp', path: '/comp', key: 'Comp', title: '组件展示' },
  { view: 'NewComp', path: '/newcomp', key: 'NewComp', title: '统计卡片组件' },
  { view: 'NewComp/Demo', path: '/tags', key: 'Tags', title: '组件展示' },
  { view: 'NewComp/CustomerQualityCard', path: '/c_q_Card', key: 'C_Q_Card', title: '客户质量卡片' },
  { view: 'NewComp/CommonCompDemo', path: '/commoncomp', key: 'CommonComp', title: '通用组件展示' },
]

/** 首页环形卡片图标（SVG path，stroke 绘制） */
export const PAGE_ICONS = {
  home: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/>',
  pack: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M8 5v14M16 5v14"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1 1-1 1.7M12 17h.01"/>',
  cpk: '<path d="M3 20V8M9 20V4M15 20v-9M21 20v-5"/>',
  qc: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5a3.5 3.5 0 0 1 0 7"/>',
  plain: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  think: '<path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  default: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/>',
}

/** 进入翻页白名单 + 首页环形导航的页面（顺序 = 展示顺序） */
export const NAVIGABLE_PAGES = PAGE_REGISTRY.filter(p => p.nav)

/** 便捷查询：按路径取注册项 */
export function getPageByPath(path) {
  return PAGE_REGISTRY.find(p => p.path === path) || null
}
