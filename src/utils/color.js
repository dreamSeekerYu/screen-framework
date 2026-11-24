/**
 * CSS颜色变量解析工具
 * 因为Canvas（ECharts渲染底层）无法识别 var(--xxx) 形式的CSS变量，
 * 需要在传给ECharts前把所有CSS变量字符串解析为实际颜色值。
 *
 * 除 var(--xxx) 外，本工具还支持把 CSS Color Level 5 函数求值为 canvas 可识别的实色：
 *  - color-mix(in srgb, A xx%, B)   → rgba(...)
 *  - color(srgb r g b [/ a])        → rgba(...)
 * 求值方式：借用浏览器自身的 CSS 引擎（隐藏探针元素 + getComputedStyle），
 * 结果带缓存，解析失败时降级为表达式中的第一个颜色分量。
 */

/**
 * 获取CSS变量的实际计算值
 * @param {string} varName - CSS变量名，支持 var(--xxx) 或 --xxx 两种形式
 * @param {string} [fallback=''] - 读取失败时的兜底颜色/数值
 * @returns {string} 解析后的颜色/数值字符串
 */
export const getCssVar = (varName, fallback = '') => {
  // 处理 var(--color-primary) 这种写法，提取变量名
  if (varName.startsWith('var(')) {
    varName = varName.slice(4, -1).trim()
  }
  // 确保以 -- 开头
  if (!varName.startsWith('--')) {
    varName = '--' + varName
  }
  // 从html根元素读取计算后的样式值；空值时回退到 fallback
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  return val || fallback
}

/* ============ color-mix / color(srgb) 求值（canvas 不认识这些函数） ============ */

let _colorProbe = null
const _colorCache = new Map()

const ensureProbe = () => {
  if (_colorProbe && _colorProbe.isConnected) return _colorProbe
  _colorProbe = document.createElement('span')
  _colorProbe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;'
  document.body.appendChild(_colorProbe)
  return _colorProbe
}

/** color(srgb 0.1 0.2 0.3 / 0.5) → rgba(26,51,77,0.5)；其余原样返回 */
const srgbToRgba = (val) => {
  const m = val.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i)
  if (!m) return val
  const r = Math.round(parseFloat(m[1]) * 255)
  const g = Math.round(parseFloat(m[2]) * 255)
  const b = Math.round(parseFloat(m[3]) * 255)
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1
  return `rgba(${r},${g},${b},${a})`
}

/** 降级：从表达式中提取第一个可用颜色分量（hex / rgb / rgba），取不到则透明 */
const firstColorFallback = (expr) => {
  const m = expr.match(/(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\))/)
  return m ? m[1] : 'transparent'
}

/**
 * 借浏览器 CSS 引擎求值颜色表达式（color-mix 等），带缓存
 * @param {string} expr - 已把 var() 解析为实色后的颜色表达式
 */
const evalCssColor = (expr) => {
  if (!/color-mix\(|color\(/i.test(expr)) return expr
  if (_colorCache.has(expr)) return _colorCache.get(expr)
  let out = expr
  try {
    const probe = ensureProbe()
    // 先放一个哨兵色：表达式无效时 computed 值会保持哨兵，据此识别失败
    probe.style.color = 'rgb(1, 2, 3)'
    probe.style.color = expr
    const computed = getComputedStyle(probe).color
    probe.style.color = ''
    if (computed && computed !== 'rgb(1, 2, 3)' && computed !== expr) {
      // Chrome 对 color-mix 的计算值可能是 color(srgb ...)，zrender 同样不认识，统一转 rgba
      out = srgbToRgba(computed)
    } else {
      out = firstColorFallback(expr)
    }
  } catch (e) {
    out = firstColorFallback(expr)
  }
  _colorCache.set(expr, out)
  return out
}

/**
 * 递归解析对象/数组中所有的CSS变量字符串
 * 同时会把 color-mix(...) 求值为 canvas 可识别的 rgba 实色
 * @param {any} value - 任意类型值（对象、数组、字符串、数字等）
 * @returns {any} 解析后的值
 */
export const resolveCssVars = (value) => {
  if (value === null || value === undefined) return value

  // 字符串：解析 var(--xxx)，再求值 color-mix 等颜色函数
  if (typeof value === 'string') {
    if (value.indexOf('var(') === -1 && value.indexOf('color-mix(') === -1 && value.indexOf('color(') === -1) {
      return value
    }
    // 匹配所有 var(--xxx) 形式的变量；变量未定义时以 transparent 占位，保证表达式仍合法
    const replaced = value.replace(/var\(--([a-zA-Z0-9-]+)\)/g, (match) => {
      const v = getCssVar(match)
      return v || 'transparent'
    })
    return evalCssColor(replaced)
  }

  // 数组：递归处理每个元素
  if (Array.isArray(value)) {
    return value.map(item => resolveCssVars(item))
  }

  // 对象：递归处理每个属性
  if (typeof value === 'object') {
    const resolved = {}
    for (const key in value) {
      resolved[key] = resolveCssVars(value[key])
    }
    return resolved
  }

  // 数字、布尔值等其他类型直接返回
  return value
}
