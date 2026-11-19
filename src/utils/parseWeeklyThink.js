/**
 * 周度思考数据解析器
 *
 * 输入：经 indexSheet 处理过的「周度思考.json」sheet0（任务明细表）
 * 输出：{
 *   weeks: [{ week, tasks: [...], stats: {...} }],  // 按周分组，最新周在前
 *   workshops: [...],                              // 所有涉及车间
 *   riskTypes: [...],                              // 所有风险类型
 *   allTasks: [...],                               // 全部任务扁平列表
 *   overall: { lastWeekCount, nextTwoCount, riskPointCount, resourceCount }
 * }
 *
 * 表格结构说明：
 * - A~H 列是任务级信息（合并单元格覆盖该任务所有子项行）：
 *     周度 / 任务编号 / 任务名称 / 任务描述 / 任务风险等级 / 负责人 / 截止日期 / 涉及车间
 * - I~U 列是子项级（每行一个子项）：
 *     子项序号 / 目前进展 / 风险卡点 / 卡点等级 / 风险类型 / 是否核心卡点
 *     / 下一步计划 / 计划时间 / 是否完成 / 需要资源 / 资源类型 / 协同部门 / 备注
 */

/** 风险等级归一化：高/中/低 */
function normRiskLevel(text) {
  if (!text) return 'mid'
  const t = String(text).trim()
  if (t.includes('高')) return 'high'
  if (t.includes('低')) return 'low'
  return 'mid'
}

/** 判断是否"是" */
function isYes(v) {
  if (v == null) return false
  const t = String(v).trim()
  return t === '是' || t === 'Y' || t === 'y' || t === 'true' || t === '1'
}

/** 从截止日期里判断任务属于「上周」还是「下两周」（仅用于分类展示，不严格） */
function categoryOfTask(week, deadline, allWeeks) {
  // 最新一周 = 当前展示周，W47 的下两周任务是指未来两周
  const latestWeek = allWeeks[0]
  if (week === latestWeek) return 'nextTwo'
  return 'lastWeek'
}

/**
 * 解析 sheet 为结构化数据
 * @param {Object} sheet indexSheet 之后的 sheet
 */
export function parseWeeklyThink(sheet) {
  const rows = sheet.rows || []
  if (!rows.length) {
    return { weeks: [], workshops: [], riskTypes: [], allTasks: [], overall: emptyOverall() }
  }

  // 1. 按"任务编号"分组（B列合并单元格里的 T01/T02/...）
  const taskMap = new Map() // taskNo -> task
  const weekSet = new Set()
  const workshopSet = new Set()
  const riskTypeSet = new Set()

  for (const row of rows) {
    const taskNo = String(row['任务编号'] || '').trim()
    if (!taskNo) continue
    if (!taskMap.has(taskNo)) {
      taskMap.set(taskNo, {
        taskNo,
        week: String(row['周度'] || '').trim(),
        title: String(row['任务名称'] || '').trim(),
        desc: String(row['任务描述'] || '').trim(),
        riskLevel: normRiskLevel(row['任务风险等级']),
        riskText: String(row['任务风险等级'] || '中').trim(),
        owner: String(row['负责人'] || '').trim(),
        deadline: String(row['截止日期'] || '').trim(),
        workshop: String(row['涉及车间'] || '').trim(),
        items: [], // 子项
      })
      weekSet.add(taskMap.get(taskNo).week)
      workshopSet.add(taskMap.get(taskNo).workshop)
    }
    const task = taskMap.get(taskNo)

    // 子项行：子项序号 / 进展 / 风险卡点 / 计划 / 资源
    const seq = row['子项序号']
    // 没有子项序号也不应该被跳过（兼容数据）；这里只在 4 个核心子项列都为空时跳过
    const hasProgress = !!row['目前进展']
    const hasRisk = !!row['风险卡点']
    const hasPlan = !!row['下一步计划']
    const hasResource = !!row['需要资源']
    if (!hasProgress && !hasRisk && !hasPlan && !hasResource && seq == null) continue

    const item = {
      seq: seq == null ? null : Number(seq),
      progress: String(row['目前进展'] || '').trim(),
      risk: {
        text: String(row['风险卡点'] || '').trim(),
        level: normRiskLevel(row['卡点等级']),
        type: String(row['风险类型'] || '').trim() || '普通风险',
        isCore: isYes(row['是否核心卡点']),
      },
      plan: {
        text: String(row['下一步计划'] || '').trim(),
        time: String(row['计划时间'] || '').trim(),
        done: isYes(row['是否完成']),
      },
      resource: {
        text: String(row['需要资源'] || '').trim(),
        type: String(row['资源类型'] || '').trim(),
        dept: String(row['协同部门'] || '').trim(),
      },
      note: String(row['备注'] || '').replace(/^备注[：:]\s*/, '').trim(),
    }
    // 去掉空内容的子项
    if (item.progress || item.risk.text || item.plan.text || item.resource.text || item.note) {
      task.items.push(item)
      if (item.risk.text && item.risk.type) riskTypeSet.add(item.risk.type)
    }
  }

  // 2. 把每个任务聚合为前端需要的 5 块数据结构
  const allTasks = []
  for (const task of taskMap.values()) {
    // 进展：汇总所有子项的 progress
    const progress = task.items.filter(i => i.progress).map(i => i.progress)
    // 风险卡点
    const risks = task.items
      .filter(i => i.risk.text)
      .map(i => ({ text: i.risk.text, level: i.risk.level, type: i.risk.type, isCore: i.risk.isCore }))
    // 下一步计划
    const plans = task.items
      .filter(i => i.plan.text)
      .map(i => ({ text: i.plan.text, time: i.plan.time, done: i.plan.done }))
    // 需要资源
    const resources = []
    const depts = new Set()
    for (const it of task.items) {
      if (it.resource.text) {
        resources.push({ text: it.resource.text, type: it.resource.type, dept: it.resource.dept })
        if (it.resource.dept) depts.add(it.resource.dept)
      }
    }
    // 备注：取第一个非空
    const note = task.items.map(i => i.note).find(Boolean) || ''

    // 核心卡点数
    const coreRisks = risks.filter(r => r.isCore).length

    // 统计：已完成/待办计划
    const donePlans = plans.filter(p => p.done).length
    const todoPlans = plans.length - donePlans

    // 风险等级：优先用任务级 E 列；若该任务里有高风险卡点则升为 high
    let riskLevel = task.riskLevel
    if (risks.some(r => r.level === 'high')) riskLevel = 'high'

    allTasks.push({
      ...task,
      category: '', // 后面按周填
      categoryText: '',
      progress,
      risks,
      plans,
      resources,
      note,
      coreRiskCount: coreRisks,
      donePlanCount: donePlans,
      todoPlanCount: todoPlans,
      deptCount: depts.size,
      riskLevel,
    })
  }

  // 3. 按周分组（W47 最新），并给任务分类
  const allWeeks = Array.from(weekSet).sort((a, b) => weekKey(b) - weekKey(a)) // 最新在前
  for (const t of allTasks) {
    t.category = t.week === allWeeks[0] ? 'nextTwo' : 'lastWeek'
    t.categoryText = t.category === 'nextTwo' ? '下两周最重大/风险任务' : '上周最重大/困难的工作'
    t.workshopKey = workshopKey(t.workshop)
  }

  const weeks = allWeeks.map(week => {
    const weekTasks = allTasks.filter(t => t.week === week)
    const stats = calcWeekStats(weekTasks)
    return { week, tasks: weekTasks, stats }
  })

  // 4. 车间看板：每个车间聚合高/中风险任务数
  const workshops = Array.from(workshopSet).map(ws => {
    const wsTasks = allTasks.filter(t => t.workshop === ws)
    const high = wsTasks.filter(t => t.riskLevel === 'high').length
    const mid = wsTasks.filter(t => t.riskLevel === 'mid').length
    const low = wsTasks.filter(t => t.riskLevel === 'low').length
    const level = high > 0 ? 'high' : mid > 0 ? 'mid' : 'low'
    return {
      name: ws,
      key: workshopKey(ws),
      high, mid, low,
      total: wsTasks.length,
      level,
    }
  })

  // 5. 风险类型分布
  const riskTypeCount = new Map()
  for (const t of allTasks) {
    for (const r of t.risks) {
      riskTypeCount.set(r.type, (riskTypeCount.get(r.type) || 0) + 1)
    }
  }
  const riskTypes = Array.from(riskTypeCount.entries()).map(([name, value]) => ({ name, value }))

  // 6. 首页 KPI
  const lastWeekTasks = allTasks.filter(t => t.category === 'lastWeek')
  const nextTwoTasks = allTasks.filter(t => t.category === 'nextTwo')
  const coreRiskPoints = allTasks.reduce((n, t) => n + t.coreRiskCount, 0)
  const resourceItems = allTasks.reduce((n, t) => n + t.resources.length, 0)

  return {
    weeks,
    workshops,
    riskTypes,
    allTasks,
    overall: {
      lastWeekCount: lastWeekTasks.length,
      nextTwoCount: nextTwoTasks.length,
      riskPointCount: coreRiskPoints,
      resourceCount: resourceItems,
      latestWeek: allWeeks[0] || '',
      prevWeek: allWeeks[1] || '',
    },
  }
}

function emptyOverall() {
  return { lastWeekCount: 0, nextTwoCount: 0, riskPointCount: 0, resourceCount: 0, latestWeek: '', prevWeek: '' }
}

/** W46 → 46，用于排序 */
function weekKey(w) {
  const m = String(w).match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

/** 车间名 → key（A1&A2 → A1A2，便于筛选） */
function workshopKey(name) {
  return String(name || '').replace(/[^A-Za-z0-9]/g, '')
}

function calcWeekStats(tasks) {
  const total = tasks.length
  const high = tasks.filter(t => t.riskLevel === 'high').length
  const mid = tasks.filter(t => t.riskLevel === 'mid').length
  const low = tasks.filter(t => t.riskLevel === 'low').length
  const totalPlans = tasks.reduce((n, t) => n + t.plans.length, 0)
  const donePlans = tasks.reduce((n, t) => n + t.donePlanCount, 0)
  const planRate = totalPlans > 0 ? Math.round(donePlans / totalPlans * 100) : 0
  const workshops = Array.from(new Set(tasks.map(t => t.workshop))).filter(Boolean)
  return { total, high, mid, low, planRate, workshops, workshopCount: workshops.length }
}
