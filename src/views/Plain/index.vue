<template>
  <div class="plain-screen">
    <!-- 顶部标题 -->
    <ScreenHeader :title="headerTitle">
      <template #right>
        <button class="detail-btn" @click="showDetail = true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          查看完整计划台账
        </button>
      </template>
    </ScreenHeader>

    <!-- 加载态 -->
    <div v-if="loading" class="loading-mask">
      <div class="loading-spinner" />
      <div class="loading-text">加载周度计划数据中...</div>
    </div>
    <div v-else-if="loadError" class="error-mask">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ loadError }}</div>
    </div>

    <template v-else-if="currentWeek">
      <!-- KPI 指标栏 -->
      <div class="kpi-row">
        <NewStatCard
          v-for="k in kpiCards"
          :key="k.title"
          :theme="k.theme"
          :status="k.status"
          :title="k.title"
          :value="k.value"
          :unit="k.unit"
        />
      </div>

      <!-- 核心内容 2x2 -->
      <div class="main-grid">
        <!-- 左上：各车间计划完成对比柱状图 -->
        <ScreenCard title="各车间上周计划完成对比" class="grid-card">
          <div class="chart-box" ref="barRef">
            <BaseChart v-if="barReady" ref="barChartRef" :option="barOption" @chart-ready="onChartReady" />
          </div>
        </ScreenCard>

        <!-- 右上：核心进展与重点 -->
        <ScreenCard title="核心进展与重点" class="grid-card">
          <ul class="highlight-list">
            <li v-for="(h, i) in highlights" :key="i" :class="'h-' + h.type">
              <span class="dot" />
              <span><strong>{{ h.label }}：</strong>{{ h.text }}</span>
            </li>
            <li v-if="highlights.length === 0" class="h-empty">暂无核心进展信息</li>
          </ul>
        </ScreenCard>

        <!-- 左下：计划完成状态占比饼图 -->
        <ScreenCard title="上周计划完成状态" class="grid-card">
          <div class="chart-box" ref="pieRef">
            <BaseChart v-if="pieReady" ref="pieChartRef" :option="pieOption" @chart-ready="onChartReady" />
          </div>
        </ScreenCard>

        <!-- 右下：核心计划简表 -->
        <ScreenCard title="本周核心计划简表" class="grid-card">
          <table class="brief-table">
            <thead>
              <tr>
                <th>车间</th>
                <th class="tc">本周计划数</th>
                <th class="tc">已完成</th>
                <th>核心事项摘要</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in workshopBrief" :key="g.name">
                <td class="group-cell">{{ g.name }}</td>
                <td class="tc">{{ g.total }}项</td>
                <td class="tc"><span class="done-num">{{ g.done }}</span></td>
                <td class="brief-desc">{{ g.brief }}</td>
              </tr>
              <tr v-if="workshopBrief.length === 0">
                <td colspan="4" class="empty-td">暂无计划数据</td>
              </tr>
            </tbody>
          </table>
        </ScreenCard>
      </div>

      <!-- <div class="footer-tip">
        提示：点击右上角「查看完整计划台账」查看明细，支持周切换 / 车间筛选 / 状态筛选 / 负责人搜索；Esc 返回。
      </div> -->
    </template>

    <!-- 明细弹窗 -->
    <WeeklyPlanDetail
      v-model="showDetail"
      :weeks="weeks"
      :workshops="workshops"
      :default-week="defaultWeek"
      title="周度工作计划完整台账"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import WeeklyPlanDetail from '@/components/common/WeeklyPlanDetail.vue'
import { loadSheet } from '@/utils/dataLoader.js'
import { parseWeeklyPlan, STATUS } from '@/utils/parseWeeklyPlan.js'

const loading = ref(true)
const loadError = ref('')
const weeks = ref([])
const workshops = ref([])
const defaultWeek = ref(0)
const showDetail = ref(false)

const barReady = ref(false)
const pieReady = ref(false)
const barRef = ref(null)
const pieRef = ref(null)
const barChartRef = ref(null)
const pieChartRef = ref(null)

// 当前展示周 = 最新一周（weeks[0]）
const currentWeek = computed(() => weeks.value[defaultWeek.value] || null)
// 上周 = weeks[1]（用于对比完成率）
const lastWeek = computed(() => weeks.value[defaultWeek.value + 1] || null)

const headerTitle = computed(() =>
  currentWeek.value ? `${currentWeek.value.title}` : '本周工作计划',
)

const kpiCards = computed(() => {
  if (!currentWeek.value) return []
  const s = currentWeek.value.stats
  const lastRate = lastWeek.value ? lastWeek.value.stats.rate : 0
  const riskCount = currentWeek.value.items.filter(
    (it) => it.status === STATUS.TODO || (it.status === STATUS.DOING && it.percent < 0.5),
  ).length
  return [
    { title: '本周总计划', value: s.total, unit: '项',theme: 'kpi-side', status: 'primary', trendType: 'normal' },
    { title: '上周计划完成率', value: Math.round(lastRate * 100), unit: '%',theme: 'kpi-side', status: 'success', trendType: lastRate >= 0.8 ? 'up' : 'down' },
    { title: '涉及车间', value: Object.keys(s.groups).length, unit: '个',theme: 'kpi-side', status: 'info', trendType: 'normal' },
    { title: '重点风险管控项', value: riskCount, unit: '项',theme: 'kpi-side', status: 'warning', trendType: riskCount > 0 ? 'down' : 'up' },
  ]
})

const barOption = computed(() => {
  if (!currentWeek.value) return {}
  const groups = currentWeek.value.stats.groups
  const names = Object.keys(groups)
  const done = names.map((n) => groups[n].done)
  const doing = names.map((n) => groups[n].doing)
  const todo = names.map((n) => groups[n].todo)
  const total = names.map((n) => groups[n].total)
  const tooltipStyle = {
    backgroundColor: 'var(--chart-tooltip-bg)',
    borderColor: 'var(--chart-tooltip-border)',
    textStyle: { color: 'var(--chart-tooltip-text)' },
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipStyle },
    legend: { data: ['已完成', '推进中', '待启动'], textStyle: { color: 'var(--chart-text-muted)', fontSize: 11 }, top: 0 },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: 'var(--chart-axis-line)' } }, axisLabel: { color: 'var(--chart-text)' } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'var(--chart-split-line)' } }, axisLabel: { color: 'var(--chart-text-muted)' } },
    series: [
      { name: '已完成', type: 'bar', stack: 'a', data: done, itemStyle: { color: 'var(--color-success)' }, barWidth: 24 },
      { name: '推进中', type: 'bar', stack: 'a', data: doing, itemStyle: { color: 'var(--color-warning)' } },
      { name: '待启动', type: 'bar', stack: 'a', data: todo, itemStyle: { color: 'var(--chart-text-muted)' } },
      { name: '总数', type: 'line', data: total, itemStyle: { color: 'var(--color-accent)' }, symbolSize: 6, lineStyle: { width: 2 } },
    ],
  }
})

const pieOption = computed(() => {
  if (!currentWeek.value) return {}
  const s = currentWeek.value.stats
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}项 ({d}%)', backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', textStyle: { color: 'var(--chart-tooltip-text)' } },
    legend: { bottom: 0, textStyle: { color: 'var(--chart-text-muted)', fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: 'var(--color-bg-card)', borderWidth: 2 },
      label: { show: true, color: 'var(--chart-text)', formatter: '{b}\n{d}%' },
      data: [
        { value: s.done, name: '已完成', itemStyle: { color: 'var(--color-success)' } },
        { value: s.doing, name: '推进中', itemStyle: { color: 'var(--color-warning)' } },
        { value: s.todo, name: '待启动', itemStyle: { color: 'var(--chart-text-muted)' } },
      ],
    }],
  }
})

const highlights = computed(() => {
  if (!currentWeek.value) return []
  const s = currentWeek.value.stats
  const last = lastWeek.value
  const arr = []
  arr.push({
    type: last && last.stats.rate >= 0.8 ? 'ok' : 'info',
    label: '上周进度',
    text: last
      ? `${last.stats.total}项周计划完成${last.stats.done}项，整体完成率${Math.round(last.stats.rate * 100)}%，${last.stats.todo + last.stats.doing}项转本周跟进。`
      : `${s.total}项周计划当前完成${s.done}项，完成率${Math.round(s.rate * 100)}%。`,
  })
  const focusItems = currentWeek.value.items.filter((i) => i.status !== STATUS.DONE).slice(0, 3)
  if (focusItems.length) {
    arr.push({
      type: 'info', label: '重点推进',
      text: focusItems.map((i) => i.plan.slice(0, 18)).join('、') + '。',
    })
  }
  const riskItems = currentWeek.value.items.filter((i) => i.status === STATUS.TODO || i.percent < 0.5).slice(0, 2)
  if (riskItems.length) {
    arr.push({
      type: 'warn', label: '风险管控',
      text: riskItems.map((i) => i.plan.slice(0, 18)).join('、') + '，需关注推进。',
    })
  }
  const dated = currentWeek.value.items.filter((i) => i.finishAt).sort((a, b) => a.finishAt.localeCompare(b.finishAt))[0]
  if (dated) {
    arr.push({ type: 'ok', label: '完成节点', text: `所有事项均明确负责人，最早节点 ${dated.finishAt}。` })
  }
  return arr
})

const workshopBrief = computed(() => {
  if (!currentWeek.value) return []
  const g = currentWeek.value.stats.groups
  return Object.keys(g).map((name) => {
    const items = currentWeek.value.items.filter((i) => i.group === name)
    const firstPlans = items.slice(0, 2).map((i) => i.plan.slice(0, 10)).join('、')
    return {
      name,
      total: g[name].total,
      done: g[name].done,
      brief: firstPlans + (items.length > 2 ? '…' : ''),
    }
  })
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const sheet = await loadSheet('plan', 0)
    const { weeks: w, workshops: ws } = parseWeeklyPlan(sheet)
    console.log('weekly plan', w, ws)
    // 按"标题里的 wXX 数字"倒序，最新一周排前面；解析不出来就保持原顺序
    w.sort((a, b) => weekNo(b.title) - weekNo(a.title))
    // 过滤掉 items 为空的周
    weeks.value = w.filter((x) => x.items.length > 0)
    workshops.value = ws
    defaultWeek.value = 0

    // 等待两轮 nextTick：先等 v-if(currentWeek) 把 grid 渲染出来，再等浏览器完成布局，
    // 然后才创建 ECharts 实例，确保容器尺寸 > 0
    await nextTick()
    await new Promise((r) => requestAnimationFrame(r))
    setTimeout(() => {
      barReady.value = true
      setTimeout(() => {
        pieReady.value = true
      }, 60)
    }, 80)
  } catch (e) {
    console.error(e)
    loadError.value = '周度计划数据加载失败：' + (e.message || e)
  } finally {
    loading.value = false
  }
}

function onChartReady() {
  // 等组件挂好后再触发一次 resize，防止首次初始化时容器高度还在 flex 计算中
  requestAnimationFrame(() => {
    ;[barChartRef, pieChartRef].forEach((c) => c.value?.getInstance?.()?.resize())
  })
}

function weekNo(title) {
  const m = /w(\d+)/i.exec(title || '')
  return m ? +m[1] : 0
}

onMounted(load)
</script>

<style lang="scss" scoped>
.plain-screen {
  width: 100%;
  height: 100%;
  padding: 16px 24px 12px;
  box-sizing: border-box;
  background: transparent;
  color: var(--color-text-primary, #1f2937);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  margin-right: 12px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  color: #fff;
  border: none;
  border-radius: $radius-md;
  font-size: $font-sm;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 25%, transparent);
  transition: all .2s;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent); }
}

.loading-mask, .error-mask {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; gap: 14px; color: var(--text-secondary, #6b7280);
}
.loading-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid var(--border-color, #e5e7eb);
  border-top-color: var(--primary, #2563eb);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-icon { font-size: 48px; }

.kpi-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  margin: 12px 0;
  flex-shrink: 0;
}

.main-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
}
.grid-card {
  min-height: 0;
  box-sizing: border-box;
}
.chart-box {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.highlight-list {
  list-style: none; padding: 4px 8px; margin: 0; overflow-y: auto;
  font-size: 13px; line-height: 1.7; color: var(--text-base, #1f2937);
  height: 100%;
  li { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 10px;
    .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 8px; flex-shrink: 0;
      background: var(--primary, #2563eb);
    }
    strong { color: var(--primary-dark, #1e40af); margin-right: 4px; }
  }
  .h-ok .dot { background: var(--success, #10b981); }
  .h-warn .dot { background: var(--danger, #ef4444); }
  .h-info .dot { background: var(--primary, #2563eb); }
  .h-empty { color: var(--text-secondary, #9ca3af); justify-content: center; }
}

.brief-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  height: 100%;
  th, td { padding: 10px 8px; border-bottom: 1px solid var(--border-color, #eef0f4); text-align: left; }
  th { background: var(--primary-soft, #eff6ff); color: var(--primary, #1d4ed8); font-weight: 600; font-size: 12px; }
  .tc { text-align: center; }
  .group-cell { color: var(--primary, #2563eb); font-weight: 600; width: 80px; text-align: center; }
  .done-num { color: var(--success, #10b981); font-weight: 600; font-size: 15px; }
  .brief-desc { color: var(--text-secondary, #4b5563); font-size: 12px; }
  .empty-td { text-align: center; color: var(--text-secondary, #9ca3af); padding: 40px 0; }
}

.footer-tip {
  margin-top: 8px; text-align: center; font-size: 12px; color: var(--text-secondary, #9ca3af);
  flex-shrink: 0;
}
</style>
