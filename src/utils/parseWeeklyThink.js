/**
 * 周度思考数据解析器
 *
 * 输入：经 indexSheet 处理过的「周度思考.json」sheet0（任务明细表）
 *
 * 周维度口径（重要）：
 * - 「周度」列形如 W46，数字 46 表示当年的第 46 个工作周；
 * - 取「周度」列中周序号最大的一周为【当前周（本周）】；
 * - 【上周】= 当前周序号 - 1；再往前的周统一归为【历史周】；
 * - 统计与展示维度全部按周切分，每个周各自持有一份 stats。
 *
 * 表格结构：
 * - A~H 列为任务级信息（合并单元格覆盖该任务的全部子项行）：
 *     周度 / 任务编号 / 任务名称 / 任务描述 / 任务风险等级 / 负责人 / 截止日期 / 涉及车间
 * - I~U 列为子项级（每行一个子项）：
 *     子项序号 / 目前进展 / 风险卡点 / 卡点等级 / 风险类型 / 是否核心卡点
 *     / 下一步计划 / 计划时间 / 是否完成 / 需要资源 / 资源类型 / 协同部门 / 备注
 *
 * 输出：
 * {
 *   weeks: [{ week, rawWeek, weekNo, role, roleText, tasks, stats }],  // 按周序号倒序
 *   weekMap,                       // week(归一化标签) -> 周对象
 *   currentWeek, lastWeek,         // 归一化标签：W47 / W46
 *   currentWeekNo, lastWeekNo,
 *   current, last,                 // 周对象（可能为 null）
 *   weekCompare,                   // 本周 vs 上周 的对比
 *   allTasks,                      // 全部任务（含 weekRole / category）
 *   workshops,                     // 全量车间列表
 *   riskTypes,                     // 全量风险类型分布
 *   overall                        // 全量汇总
 * }
 */

/** 父级（任务级）列，合并单元格需要向下续传 */
const PARENT_KEYS = [
  '周度',
  '任务编号',
  '任务名称',
  '任务描述',
  '任务风险等级',
  '负责人',
  '截止日期',
  '涉及车间',
]

const WEEK_RE = /(\d+)/

function str(v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

/** 风险等级归一化为 high / mid / low */
function normRiskLevel(text) {
  const t = str(text)
  if (t.includes('高')) return 'high'
  if (t.includes('低')) return 'low'
  return 'mid'
}

/** 中文字面量：高 / 中 / 低 */
function levelText(level) {
  return level === 'high' ? '高' : level === 'low' ? '低' : '中'
}

/** 是否勾选"是" */
function isYes(v) {
  const t = str(v)
  return t === '是' || t === 'Y' || t === 'y' || t === 'true' || t === '1'
}

/**
 * 风险类型续传：表格里风险类型通常只写在任务的第一个子项行，
 * 后续子项行留空，这里按任务向下继承（同一任务内共享同一风险类型）。
 */
function carryRiskType(task, rawType) {
  if (rawType) task._lastRiskType = rawType
  return rawType || task._lastRiskType || '普通风险'
}

/** 备注归一化：去掉"备注："前缀，过滤"有则写，无则空"这类占位文案 */
function normalizeNote(v) {
  const t = str(v).replace(/^备注[：:]\s*/, '')
  if (!t) return ''
  if (/有则写|无则空|无则填/.test(t)) return ''
  return t
}

/** 从「周度」文本里取周序号：W46 -> 46 */
function weekNoOf(week) {
  const m = WEEK_RE.exec(str(week))
  return m ? Number(m[1]) : 0
}

/** 周序号 -> 归一化标签：47 -> W47 */
function weekLabel(no) {
  return no > 0 ? `W${no}` : '未分周'
}

/** 车间名 -> key（A1&A2 -> A1A2），用于筛选 */
function workshopKey(name) {
  return str(name).replace(/[^A-Za-z0-9]/g, '')
}

/**
 * 解析 sheet 为结构化数据
 * @param {Object} sheet indexSheet 之后的 sheet
 */
export function parseWeeklyThink(sheet) {
  const rawRows = (sheet && sheet.rows) || []
  if (!rawRows.length) return emptyResult()

  // ---------- 1. 父级列向下续传（兼容未续填的 JSON） ----------
  const carry = {}
  PARENT_KEYS.forEach((k) => { carry[k] = '' })
  const rows = rawRows.map((row) => {
    const out = { ...row }
    for (const k of PARENT_KEYS) {
      const v = str(row[k])
      if (v) carry[k] = v
      else if (!str(out[k])) out[k] = carry[k]
    }
    return out
  })

  // ---------- 2. 按「周 + 任务编号」聚合任务 ----------
  const taskMap = new Map()
  const allRiskTypes = new Set()

  for (const row of rows) {
    const taskNo = str(row['任务编号'])
    if (!taskNo) continue
    const weekRaw = str(row['周度'])
    const key = `${weekRaw || '未分周'}#${taskNo}`

    if (!taskMap.has(key)) {
      taskMap.set(key, {
        taskNo,
        week: weekRaw || '未分周',
        weekNo: weekNoOf(weekRaw),
        title: str(row['任务名称']),
        desc: str(row['任务描述']),
        riskLevel: normRiskLevel(row['任务风险等级']),
        riskText: str(row['任务风险等级']) || '中',
        owner: str(row['负责人']),
        deadline: str(row['截止日期']),
        workshop: str(row['涉及车间']),
        items: [],
        // 内部字段：风险类型通常只写在任务的第一个子项行，需要向下续传
        _lastRiskType: '',
      })
    }
    const task = taskMap.get(key)

    // 子项行：四个业务列全空且没有子项序号时跳过（空行）
    const seq = row['子项序号']
    const hasProgress = !!str(row['目前进展'])
    const hasRisk = !!str(row['风险卡点'])
    const hasPlan = !!str(row['下一步计划'])
    const hasResource = !!str(row['需要资源'])
    if (!hasProgress && !hasRisk && !hasPlan && !hasResource && seq == null) continue

    const item = {
      seq: seq == null || seq === '' ? null : Number(seq),
      progress: str(row['目前进展']),
      risk: {
        text: str(row['风险卡点']),
        level: normRiskLevel(row['卡点等级']),
        // 风险类型只有任务的第一个子项行有值，这里按任务向下续传
        type: carryRiskType(task, str(row['风险类型'])),
        isCore: isYes(row['是否核心卡点']),
      },
      plan: {
        text: str(row['下一步计划']),
        time: str(row['计划时间']),
        done: isYes(row['是否完成']),
      },
      resource: {
        text: str(row['需要资源']),
        type: str(row['资源类型']),
        dept: str(row['协同部门']),
      },
      note: normalizeNote(row['备注']),
    }

    if (item.progress || item.risk.text || item.plan.text || item.resource.text || item.note) {
      task.items.push(item)
      if (item.risk.text) allRiskTypes.add(item.risk.type)
    }
  }

  // ---------- 3. 聚合任务的五块内容 ----------
  const allTasks = []
  for (const task of taskMap.values()) {
    const progress = task.items.filter((i) => i.progress).map((i) => i.progress)
    const risks = task.items
      .filter((i) => i.risk.text)
      .map((i) => ({ text: i.risk.text, level: i.risk.level, type: i.risk.type, isCore: i.risk.isCore }))
    const plans = task.items
      .filter((i) => i.plan.text)
      .map((i) => ({ text: i.plan.text, time: i.plan.time, done: i.plan.done }))

    const resources = []
    const depts = new Set()
    for (const it of task.items) {
      if (it.resource.text) {
        resources.push({ text: it.resource.text, type: it.resource.type, dept: it.resource.dept })
        if (it.resource.dept) depts.add(it.resource.dept)
      }
    }

    const note = task.items.map((i) => i.note).find(Boolean) || ''
    const donePlanCount = plans.filter((p) => p.done).length

    // 任务风险等级：任务级优先，若存在高风险卡点则升级为 high
    let riskLevel = task.riskLevel
    if (risks.some((r) => r.level === 'high')) riskLevel = 'high'

    // 内部字段不对外暴露
    const { _lastRiskType, ...base } = task

    allTasks.push({
      ...base,
      workshopKey: workshopKey(task.workshop),
      progress,
      risks,
      plans,
      resources,
      note,
      riskPointCount: risks.length,
      coreRiskCount: risks.filter((r) => r.isCore).length,
      donePlanCount,
      todoPlanCount: plans.length - donePlanCount,
      deptCount: depts.size,
      riskLevel,
    })
  }

  // ---------- 4. 周维度：最大周序号 = 当前周 ----------
  const weekNos = Array.from(new Set(allTasks.map((t) => t.weekNo))).sort((a, b) => b - a)
  const currentWeekNo = weekNos[0] || 0
  const lastWeekNo = currentWeekNo > 0 ? currentWeekNo - 1 : 0

  const roleOf = (no) => {
    if (no === currentWeekNo) return 'current'
    if (no === lastWeekNo) return 'last'
    return 'history'
  }
  const roleTextOf = (role, label) => {
    if (role === 'current') return `本周（${label}）`
    if (role === 'last') return `上周（${label}）`
    return `${label}`
  }

  const currentWeek = weekLabel(currentWeekNo)
  const lastWeek = weekLabel(lastWeekNo)

  for (const t of allTasks) {
    t.weekLabel = weekLabel(t.weekNo)
    t.weekRole = roleOf(t.weekNo)
    t.category = t.weekRole // 兼容详情弹窗的分类标签
    t.categoryText = roleTextOf(t.weekRole, t.weekLabel)
  }

  // ---------- 5. 分组统计（按周） ----------
  const weeks = weekNos.map((no) => {
    const label = weekLabel(no)
    const role = roleOf(no)
    const tasks = allTasks.filter((t) => t.weekNo === no)
    return {
      week: label,
      rawWeek: tasks[0] ? tasks[0].week : label,
      weekNo: no,
      role,
      roleText: roleTextOf(role, label),
      shortText: role === 'current' ? '本周' : role === 'last' ? '上周' : label,
      tasks,
      stats: calcWeekStats(tasks),
    }
  })

  const weekMap = {}
  weeks.forEach((w) => { weekMap[w.week] = w })

  const current = weekMap[currentWeek] || null
  const last = weekMap[lastWeek] || null

  // ---------- 6. 本周 vs 上周 对比 ----------
  const weekCompare = {
    currentWeek,
    lastWeek,
    current: current ? current.stats : emptyStats(),
    last: last ? last.stats : emptyStats(),
    delta: diffStats(current ? current.stats : emptyStats(), last ? last.stats : emptyStats()),
  }

  // ---------- 7. 全量维度 ----------
  const workshops = buildWorkshopStats(allTasks)
  const riskTypes = buildRiskTypeDist(allTasks)

  const overall = {
    totalTasks: allTasks.length,
    totalRiskPoints: allTasks.reduce((n, t) => n + t.riskPointCount, 0),
    totalCore: allTasks.reduce((n, t) => n + t.coreRiskCount, 0),
    totalResources: allTasks.reduce((n, t) => n + t.resources.length, 0),
    currentWeekCount: current ? current.stats.total : 0,
    lastWeekCount: last ? last.stats.total : 0,
    currentWeek,
    lastWeek,
    // 兼容旧字段
    latestWeek: currentWeek,
    prevWeek: lastWeek,
    nextTwoCount: current ? current.stats.total : 0,
    riskPointCount: allTasks.reduce((n, t) => n + t.coreRiskCount, 0),
    resourceCount: allTasks.reduce((n, t) => n + t.resources.length, 0),
  }

  return {
    weeks,
    weekMap,
    currentWeek,
    lastWeek,
    currentWeekNo,
    lastWeekNo,
    current,
    last,
    weekCompare,
    allTasks,
    workshops,
    riskTypes,
    allRiskTypes: Array.from(allRiskTypes),
    overall,
  }
}

/** 单周统计 */
function calcWeekStats(tasks) {
  const total = tasks.length
  const high = tasks.filter((t) => t.riskLevel === 'high').length
  const mid = tasks.filter((t) => t.riskLevel === 'mid').length
  const low = tasks.filter((t) => t.riskLevel === 'low').length
  const coreCount = tasks.reduce((n, t) => n + t.coreRiskCount, 0)
  const riskPointCount = tasks.reduce((n, t) => n + t.riskPointCount, 0)
  const resourceCount = tasks.reduce((n, t) => n + t.resources.length, 0)
  const planTotal = tasks.reduce((n, t) => n + t.plans.length, 0)
  const planDone = tasks.reduce((n, t) => n + t.donePlanCount, 0)
  const planRate = planTotal > 0 ? Math.round((planDone / planTotal) * 100) : 0
  const workshopStats = buildWorkshopStats(tasks)

  return {
    total,
    high,
    mid,
    low,
    coreCount,
    riskPointCount,
    resourceCount,
    planTotal,
    planDone,
    planRate,
    workshopCount: workshopStats.length,
    workshopStats,
    riskTypeDist: buildRiskTypeDist(tasks),
    owners: Array.from(new Set(tasks.map((t) => t.owner).filter(Boolean))),
  }
}

function emptyStats() {
  return {
    total: 0, high: 0, mid: 0, low: 0, coreCount: 0, riskPointCount: 0,
    resourceCount: 0, planTotal: 0, planDone: 0, planRate: 0,
    workshopCount: 0, workshopStats: [], riskTypeDist: [], owners: [],
  }
}

/** 车间维度统计 */
function buildWorkshopStats(tasks) {
  const map = new Map()
  for (const t of tasks) {
    const name = t.workshop || '未标注'
    if (!map.has(name)) {
      map.set(name, { name, key: workshopKey(name), total: 0, high: 0, mid: 0, low: 0, coreCount: 0 })
    }
    const w = map.get(name)
    w.total += 1
    w[t.riskLevel] += 1
    w.coreCount += t.coreRiskCount
  }
  const list = Array.from(map.values())
  list.forEach((w) => {
    w.level = w.high > 0 ? 'high' : w.mid > 0 ? 'mid' : 'low'
    w.levelText = levelText(w.level)
  })
  // 高风险在前
  list.sort((a, b) => (b.high - a.high) || (b.total - a.total))
  return list
}

/** 风险类型分布 */
function buildRiskTypeDist(tasks) {
  const map = new Map()
  for (const t of tasks) {
    for (const r of t.risks) {
      const k = r.type || '普通风险'
      map.set(k, (map.get(k) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** 两周差值 */
function diffStats(cur, pre) {
  return {
    total: cur.total - pre.total,
    high: cur.high - pre.high,
    mid: cur.mid - pre.mid,
    low: cur.low - pre.low,
    coreCount: cur.coreCount - pre.coreCount,
    riskPointCount: cur.riskPointCount - pre.riskPointCount,
    resourceCount: cur.resourceCount - pre.resourceCount,
    planRate: cur.planRate - pre.planRate,
  }
}

function emptyResult() {
  return {
    weeks: [],
    weekMap: {},
    currentWeek: '',
    lastWeek: '',
    currentWeekNo: 0,
    lastWeekNo: 0,
    current: null,
    last: null,
    weekCompare: { currentWeek: '', lastWeek: '', current: emptyStats(), last: emptyStats(), delta: diffStats(emptyStats(), emptyStats()) },
    allTasks: [],
    workshops: [],
    riskTypes: [],
    allRiskTypes: [],
    overall: {
      totalTasks: 0, totalRiskPoints: 0, totalCore: 0, totalResources: 0,
      currentWeekCount: 0, lastWeekCount: 0, currentWeek: '', lastWeek: '',
      latestWeek: '', prevWeek: '', nextTwoCount: 0, riskPointCount: 0, resourceCount: 0,
    },
  }
}

export { weekNoOf, weekLabel, levelText, workshopKey }
