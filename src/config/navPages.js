/**
 * 大屏业务页白名单
 *
 * 数据源已收敛到「页面注册中心」src/config/pages.js（NAVIGABLE_PAGES），
 * 本文件只负责派生白名单并保留翻页器/导航器的工具函数。
 *
 *   1. 右下角翻页器（移动端 / 平板）PagePager.vue
 *   2. 全局导航器（Alt+K）及 Alt+[ / Alt+] 快捷翻页 DynamicNavigator.vue
 *
 * 不在名单内的页面（组件演示页 / 未完成的 LPA 等）不会出现在翻页链路里。
 */
import { NAVIGABLE_PAGES } from './pages.js'

export const NAV_PAGES = NAVIGABLE_PAGES.map(p => ({
  path: p.path,
  key: p.key,
  title: p.title,
  subtitle: p.subtitle,
}))

/** 过滤出路由表中真实存在的页面（避免页面未开发时翻到空白页） */
export function resolveNavPages(router) {
  const existing = new Set((router?.options?.routes || []).map(r => r.path))
  return NAV_PAGES.filter(p => existing.has(p.path))
}

/**
 * 计算相对当前页偏移 step 的目标页（闭环循环）
 * 当前页不在白名单内（如组件演示页）时，以第一页为基准，与快捷键口径一致
 */
function stepTarget(router, currentPath, step) {
  const pages = resolveNavPages(router)
  const n = pages.length
  if (!n) return null
  let i = pages.findIndex(p => p.path === currentPath)
  if (i < 0) i = 0
  return pages[((i + step) % n + n) % n] || null
}

/** 只查询不跳转：用于按钮标题、禁用态判断等 */
export function peekNavPage(router, currentPath, step = 1) {
  return stepTarget(router, currentPath, step)
}

/** 下一页（保持旧导出名，语义等价于 peekNavPage(..., 1)） */
export function nextNavPage(router, currentPath) {
  return stepTarget(router, currentPath, 1)
}

/**
 * 真正执行翻页：右下角翻页器与 Alt+[ / Alt+] 快捷键共用这一个入口，
 * 保证「点击按钮」与「按快捷键」的行为完全等效（同一份顺序、同一个兜底规则）
 * @returns 目标页对象（无可用页面时为 null）
 */
export function navigateByStep(router, currentPath, step = 1) {
  const target = stepTarget(router, currentPath, step)
  if (!target) return null
  if (target.path !== currentPath) router.push(target.path)
  return target
}
