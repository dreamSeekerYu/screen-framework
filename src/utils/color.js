/**
 * CSS颜色变量解析工具
 * 因为Canvas（ECharts渲染底层）无法识别 var(--xxx) 形式的CSS变量，
 * 需要在传给ECharts前把所有CSS变量字符串解析为实际颜色值。
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

/**
 * 递归解析对象/数组中所有的CSS变量字符串
 * @param {any} value - 任意类型值（对象、数组、字符串、数字等）
 * @returns {any} 解析后的值
 */
export const resolveCssVars = (value) => {
  if (value === null || value === undefined) return value

  // 字符串：检测是否包含CSS变量，解析替换
  if (typeof value === 'string') {
    // 匹配所有 var(--xxx) 形式的变量
    return value.replace(/var\(--([a-zA-Z0-9-]+)\)/g, (match) => getCssVar(match))
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
