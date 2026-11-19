/**
 * 重大质量异常闭环明细解析
 * 数据源：public/data/重大质量异常闭环.json → sheet[0]
 * 表头：A1~AJ1；数据行从第2行开始。
 */
import { loadSheet } from './dataLoader.js'

const COL_MAP = {
  cw: 'A', factory: 'B', workshop: 'C', line: 'D', title: 'E', type: 'F',
  occurDate: 'G', occurProcess: 'H', findProcess: 'I', dept: 'J', owner: 'K',
  dueDate: 'L', closeDate: 'M', leakOut: 'N', packNo: 'O',
  what: 'P', who: 'Q', when: 'R', where: 'S', why: 'T', howFind: 'U', howMany: 'V',
  directCause: 'W', rootCause: 'X', leakCause: 'Y',
  tempAction: 'Z', permanentAction: 'AA', tags: 'AB', categories: 'AC',
  img1: 'AD', img2: 'AE', img3: 'AF',
  proof1: 'AG', proof2: 'AH', proof3: 'AI',
  remark: 'AJ',
}

// Excel 序列日期转 YYYY-MM-DD（1900 系统，沿用项目现有 getDataFromJson 约定）
const EXCEL_EPOCH = new Date(1899, 11, 30)
function excelDateToYMD(serial) {
  if (serial == null || serial === '' || serial === '/') return ''
  const n = Number(serial)
  if (!isFinite(n)) return String(serial)
  const d = new Date(EXCEL_EPOCH.getTime() + n * 86400000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function excelDateToMD(serial) {
  const s = excelDateToYMD(serial)
  return s ? s.slice(5).replace('-', '/') : ''
}

function cellAt(sheet, ref) {
  const c = sheet.cells?.[ref]
  if (c == null) return ''
  if (typeof c === 'object') return c.value ?? ''
  return c
}

function parseCw(v) {
  const m = String(v || '').match(/CW(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}

function splitMulti(str) {
  if (!str) return []
  return String(str)
    .split(/[\/、,，;；\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const TYPE_COLOR = {
  '装配类': '#f59e0b',
  '焊接类': '#0ea5e9',
  '来料类': '#8b5cf6',
  '包装类': '#10b981',
  '测试类': '#ef4444',
  '其他': '#94a3b8',
}

function resolveStatus(closeDate, dueDateSerial) {
  // 已实际关闭 => done；否则如果 due<today 超期，否则推进中
  const today = Date.now()
  const dueTs = dueDateSerial ? EXCEL_EPOCH.getTime() + Number(dueDateSerial) * 86400000 : 0
  if (closeDate && closeDate !== '/' && String(closeDate).trim()) return 'done'
  if (dueTs && dueTs < today) return 'overdue'
  return 'doing'
}

/**
 * 解析全部异常明细
 * @returns {Object} { items, byCw, typeDist, cwList, currentCw, currentWeekItems, kpi, facts }
 */
export async function parseQualityIssues() {
  const sheet = await loadSheet('question', 0)
  const totalRows = sheet.totalRows || 25

  const items = []
  for (let r = 2; r <= totalRows; r++) {
    const get = (k) => cellAt(sheet, `${COL_MAP[k]}${r}`)
    const cw = parseCw(get('cw'))
    if (cw == null) continue
    const closeDate = get('closeDate')
    const dueSerial = get('dueDate')
    const status = resolveStatus(closeDate, dueSerial)
    const occurDateStr = excelDateToYMD(get('occurDate'))
    const dueDateStr = excelDateToYMD(dueSerial)
    const closeDateStr = excelDateToYMD(closeDate)
    const dueMD = excelDateToMD(dueSerial)
    const closeMD = excelDateToMD(closeDate)

    const tags = splitMulti(get('tags'))
    const categories = splitMulti(get('categories'))

    // 收集图片（问题现场3张+凭证3张）
    const imgs = ['img1', 'img2', 'img3', 'proof1', 'proof2', 'proof3']
      .map((k) => {
        const v = get(k)
        if (!v) return null
        if (typeof v === 'object') {
          // indexSheet 后可能已经解析出图片 url
          return v.url || v.src || v.path || null
        }
        return String(v).trim() || null
      })
      .filter(Boolean)

    // 进度：已完成=100；推进中按是否有节点估算（本批精选数据统一 80%）
    let progress = 100
    if (status === 'doing') progress = 80
    if (status === 'overdue') progress = 60
    // 从责任人/节点字段可能已有 80% 文本，但本数据无，统一估算
    const nodeText = status === 'done'
      ? `${closeMD || ''} 已完成`
      : `节点：${dueMD || ''}`

    items.push({
      row: r,
      cw,
      cwLabel: `CW${cw}`,
      factory: get('factory'),
      workshop: get('workshop'),
      line: get('line'),
      title: get('title'),
      type: get('type'),
      typeColor: TYPE_COLOR[get('type')] || TYPE_COLOR['其他'],
      occurDate: occurDateStr,
      occurProcess: get('occurProcess'),
      findProcess: get('findProcess'),
      dept: get('dept'),
      owner: get('owner'),
      dueDate: dueDateStr,
      closeDate: closeDateStr,
      dueMD, closeMD,
      leakOut: get('leakOut'),
      packNo: get('packNo'),
      what: get('what'),
      who: get('who'),
      when: get('when'),
      where: get('where'),
      why: get('why'),
      howFind: get('howFind'),
      howMany: get('howMany'),
      directCause: get('directCause'),
      rootCause: get('rootCause'),
      leakCause: get('leakCause'),
      tempAction: get('tempAction'),
      permanentAction: get('permanentAction'),
      tags, categories,
      images: imgs,
      remark: get('remark'),
      status,
      progress,
      nodeText,
    })
  }

  // 按周分组
  const byCw = {}
  const cwSet = new Set()
  items.forEach((it) => {
    cwSet.add(it.cw)
    ;(byCw[it.cw] = byCw[it.cw] || []).push(it)
  })
  const cwList = Array.from(cwSet).sort((a, b) => b - a)
  const currentCw = cwList[0]
  const currentWeekItems = byCw[currentCw] || []

  // 类型分布（本周）
  const typeDist = {}
  currentWeekItems.forEach((it) => {
    typeDist[it.type] = (typeDist[it.type] || 0) + 1
  })
  const typeDistArr = Object.entries(typeDist).map(([name, value]) => ({
    name, value, color: TYPE_COLOR[name] || '#94a3b8',
  }))
  const mainType = typeDistArr.sort((a, b) => b.value - a.value)[0]

  // 本周 KPI
  const weekDone = currentWeekItems.filter((i) => i.status === 'done').length
  const weekDoing = currentWeekItems.filter((i) => i.status === 'doing').length
  const weekOverdue = currentWeekItems.filter((i) => i.status === 'overdue').length
  const weekRate = currentWeekItems.length
    ? Math.round((weekDone / currentWeekItems.length) * 100)
    : 0

  // 永久对策覆盖：有 permanentAction 且非空
  const permanentCovered = items.filter((i) => (i.permanentAction || '').trim().length > 0).length
  const permanentRate = items.length ? Math.round((permanentCovered / items.length) * 100) : 100
  // 零流出：leakOut !== '是'
  const leakOutCount = items.filter((i) => String(i.leakOut).includes('是')).length

  return {
    items,
    byCw,
    cwList,
    currentCw,
    currentWeekItems,
    weekDone,
    weekDoing,
    weekOverdue,
    weekRate,
    typeDistArr,
    mainType,
    facts: {
      total: items.length,
      permanentCovered,
      permanentRate,
      leakOutCount,
    },
  }
}
