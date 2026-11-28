/**
 * 轻量全局提示（替代 alert / 各页面自写提示）
 *
 * 用法：
 *   import { message } from '@/utils/message'
 *   message('已复制到剪贴板')            // info（默认）
 *   message('保存成功', 'success')       // success / warning / danger / info
 *
 * 样式走全局主题 token，自动适配四套主题；同屏最多 3 条，自动堆叠淡出。
 */

const ICONS = {
  success: '✓',
  warning: '!',
  danger: '✕',
  info: 'ℹ'
}

const DURATION = 2400
let container = null

function ensureContainer() {
  if (container && document.body.contains(container)) return container
  container = document.createElement('div')
  container.className = 'ui-message-wrap'
  document.body.appendChild(container)
  return container
}

function show(text, type = 'info') {
  const wrap = ensureContainer()
  // 超过 3 条时立即移除最早一条，避免堆屏
  while (wrap.children.length >= 3) wrap.firstChild.remove()

  const el = document.createElement('div')
  el.className = `ui-message ui-message--${type}`
  el.innerHTML = `<span class="ui-message__ico">${ICONS[type] || ICONS.info}</span><span class="ui-message__text"></span>`
  el.querySelector('.ui-message__text').textContent = text
  wrap.appendChild(el)

  // 入场动画
  requestAnimationFrame(() => el.classList.add('is-show'))

  const timer = setTimeout(() => hide(el), DURATION)
  el.addEventListener('click', () => { clearTimeout(timer); hide(el) })
  return el
}

function hide(el) {
  if (!el.isConnected) return
  el.classList.remove('is-show')
  el.addEventListener('transitionend', () => el.remove(), { once: true })
  // transitionend 兜底（标签页隐藏时可能不触发）
  setTimeout(() => el.remove(), 400)
}

export const message = {
  show,
  info: (t) => show(t, 'info'),
  success: (t) => show(t, 'success'),
  warning: (t) => show(t, 'warning'),
  danger: (t) => show(t, 'danger')
}

export default message
