<template>
  <div class="think-screen">
    <!-- 顶部标题栏 -->
    <div class="think-header">
      <ScreenHeader :title="`${activeWeekLabel} 周度思考`" />
      <div class="header-actions">
        <StatusTag type="default" text="重置筛选" @click="resetFilter" />
        <StatusTag type="info" text="全屏展示" @click="toggleFullscreen" />
      </div>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="state-box">
      <div class="state-text">数据加载中…</div>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="state-box">
      <div class="state-text">数据加载失败：{{ error }}</div>
    </div>

    <!-- 空态 -->
    <div v-else-if="!parsed || !parsed.weeks.length" class="state-box">
      <div class="state-text">暂无周度思考数据</div>
    </div>

    <template v-else>
      <!-- 周切换：当前周 = 「周度」列中周序号最大的一周 -->
      <div class="week-bar">
        <Tabs v-model="activeWeek" type="segment" class="week-switch">
          <TabPane
            v-for="w in parsed.weeks"
            :key="w.week"
            :label="`${w.shortText} ${w.week}`"
            :name="w.week"
            :badge="w.stats.total ? String(w.stats.total) : ''"
          />
        </Tabs>
        <div class="week-range">
          当前周 {{ parsed.currentWeek }} · 上周 {{ parsed.lastWeek }} · 共 {{ parsed.weeks.length }} 周数据
        </div>
      </div>

      <!-- KPI 行（均按当前所选周统计） -->
      <div class="kpi-row">
        <StatCard
          theme="classic"
          status="primary"
          :title="`${activeShort}重点任务`"
          :value="activeStats.total"
          unit="项"
          :explain="compareTip('总任务数')"
        />
        <StatCard
          theme="classic"
          status="danger"
          :title="`${activeShort}高风险任务`"
          :value="activeStats.high"
          unit="项"
          :explain="compareTip('高风险任务')"
        />
        <StatCard
          theme="classic"
          status="warning"
          :title="`${activeShort}核心风险卡点`"
          :value="activeStats.coreCount"
          unit="个"
          :explain="compareTip('核心卡点')"
        />
        <StatCard
          theme="classic"
          status="success"
          :title="`${activeShort}需协调资源`"
          :value="activeStats.resourceCount"
          unit="项"
          :explain="compareTip('资源需求')"
        />
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 左列：车间看板 + 风险类型分布（按周） -->
        <div class="left-col">
          <!-- 车间风险等级看板 -->
          <ScreenCard :title="`车间风险等级看板 · ${activeWeekLabel}`">
            <div v-if="activeStats.workshopStats.length" class="workshop-grid">
              <div
                v-for="ws in activeStats.workshopStats"
                :key="ws.key"
                class="workshop-card"
                :class="ws.level"
              >
                <div class="workshop-name">{{ ws.name }}</div>
                <div class="risk-tag" :class="ws.level">{{ ws.levelText }}风险</div>
                <div class="workshop-count">{{ ws.total }}项</div>
              </div>
            </div>
            <div v-else class="empty-tip">该周暂无车间数据</div>
          </ScreenCard>

          <!-- 风险类型分布饼图 -->
          <ScreenCard title="风险类型分布" class="pie-card">
            <template #extra>
              <span class="card-extra">
                卡点 {{ activeStats.riskPointCount }} 个 · 计划完成率 {{ activeStats.planRate }}%
              </span>
            </template>
            <div ref="pieRef" class="chart-box">
              <BaseChart v-if="pieReady" :option="pieOption" @chart-ready="onPieReady" />
            </div>
          </ScreenCard>
        </div>

        <!-- 右列：任务列表（按周） -->
        <div class="right-col">
          <ScreenCard :title="`重点任务列表 · ${activeWeekLabel}`">
            <template #extra>
              <span class="card-extra">共 {{ filteredTasks.length }} 项</span>
            </template>

            <div class="filter-bar">
              <select v-model="filterWorkshop" class="filter-select">
                <option value="all">全部车间</option>
                <option v-for="ws in activeStats.workshopStats" :key="ws.key" :value="ws.key">
                  {{ ws.name }}
                </option>
              </select>
              <select v-model="filterRisk" class="filter-select">
                <option value="all">全部风险</option>
                <option value="high">高风险</option>
                <option value="mid">中风险</option>
                <option value="low">低风险</option>
              </select>
              <input
                v-model="keyword"
                class="filter-input"
                type="text"
                placeholder="搜索任务 / 负责人"
              />
            </div>

            <div class="task-list">
              <div
                v-for="t in filteredTasks"
                :key="t.week + t.taskNo"
                class="task-card"
                :class="[
                  `${t.riskLevel}-risk`,
                  activeTask && activeTask.taskNo === t.taskNo ? 'active' : '',
                ]"
                @click="openTask(t)"
              >
                <div class="task-info">
                  <div class="task-workshop">
                    <span class="ws-name">{{ t.workshop }}</span>
                    <Tag v-if="t.coreRiskCount > 0" size="small" status="danger" class="core-mini">
                      {{ t.coreRiskCount }}个核心卡点
                    </Tag>
                  </div>
                  <div class="task-desc">{{ t.desc || t.title }}</div>
                  <div class="task-meta">
                    <span>负责人：{{ t.owner || '—' }}</span>
                    <span>截止：{{ t.deadline || '—' }}</span>
                    <span>计划 {{ t.donePlanCount }}/{{ t.plans.length }}</span>
                  </div>
                </div>
                <div class="task-risk-badge" :class="t.riskLevel">{{ t.riskText }}</div>
              </div>

              <div v-if="!filteredTasks.length" class="empty-tip">
                {{ activeStats.total ? '暂无符合条件的任务' : '该周暂无任务' }}
              </div>
            </div>
          </ScreenCard>
        </div>
      </div>
    </template>

    <!-- 详情弹窗 -->
    <ThinkTaskDetail
      v-model="detailVisible"
      :task="activeTask"
      @mark-done="onMarkDone"
      @plan-toggle="onPlanToggle"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import StatCard from '@/components/common/NewStatCard.vue'
import Tabs from '@/components/common/Tabs.vue'
import TabPane from '@/components/common/TabPane.vue'
import Tag from '@/components/common/Tag.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import ThinkTaskDetail from '@/components/common/ThinkTaskDetail.vue'
import { loadSheet } from '@/utils/dataLoader.js'
import { parseWeeklyThink } from '@/utils/parseWeeklyThink.js'
import { getCssVar } from '@/utils/color.js'
import { useThemeStore } from '@/stores/theme'

// ======== 状态 ========
const loading = ref(true)
const error = ref('')
const parsed = ref(null)

// 当前选中的周（归一化标签，如 W47）
const activeWeek = ref('')

const filterWorkshop = ref('all')
const filterRisk = ref('all')
const keyword = ref('')

const pieReady = ref(false)
const pieRef = ref(null)

const detailVisible = ref(false)
const activeTask = ref(null)

const themeStore = useThemeStore()

// ======== 数据加载 ========
onMounted(async () => {
  try {
    const sheet = await loadSheet('think', 0)
    const result = parseWeeklyThink(sheet)
    parsed.value = result
    // 默认展示当前周（「周度」列中周序号最大的一周）
    activeWeek.value = result.currentWeek || (result.weeks[0] && result.weeks[0].week) || ''
  } catch (e) {
    console.error(e)
    error.value = e.message || String(e)
  } finally {
    loading.value = false
    await nextTick()
    // 等布局完成后再挂载图表，避免容器 0 高度
    setTimeout(() => { pieReady.value = true }, 150)
  }
})

// ======== 周维度计算 ========
const activeWeekObj = computed(() => {
  if (!parsed.value) return null
  return parsed.value.weekMap[activeWeek.value] || parsed.value.weeks[0] || null
})
const activeWeekLabel = computed(() => (activeWeekObj.value ? activeWeekObj.value.week : ''))
const activeShort = computed(() => {
  const w = activeWeekObj.value
  return w ? w.shortText : '当前周'
})
const activeStats = computed(() => {
  const w = activeWeekObj.value
  return w ? w.stats : emptyStats()
})

// 对比周：本周 ↔ 上周 互相对照，历史周对比当前周
const compareWeekObj = computed(() => {
  const p = parsed.value
  const w = activeWeekObj.value
  if (!p || !w) return null
  if (w.role === 'current') return p.weekMap[p.lastWeek] || null
  return p.weekMap[p.currentWeek] || null
})
const compareShort = computed(() => {
  const c = compareWeekObj.value
  return c ? c.shortText : '对比周'
})
const compareStats = computed(() => {
  const c = compareWeekObj.value
  return c ? c.stats : emptyStats()
})

/** KPI 副标题：与该周对照的周做差值 */
function compareTip(label) {
  const map = {
    总任务数: ['total', '项'],
    高风险任务: ['high', '项'],
    核心卡点: ['coreCount', '个'],
    资源需求: ['resourceCount', '项'],
  }
  const [key, unit] = map[label]
  if (!compareWeekObj.value) return `${label}：无对比周`
  const d = activeStats.value[key] - compareStats.value[key]
  if (d === 0) return `较${compareShort.value}持平`
  return `较${compareShort.value} ${d > 0 ? '↑' : '↓'}${Math.abs(d)}${unit}`
}

function emptyStats() {
  return {
    total: 0, high: 0, mid: 0, low: 0, coreCount: 0, riskPointCount: 0,
    resourceCount: 0, planTotal: 0, planDone: 0, planRate: 0,
    workshopCount: 0, workshopStats: [], riskTypeDist: [], owners: [],
  }
}

// 切换周时，若原车间筛选在新周不存在，则重置筛选，避免列表恒为空
watch(activeWeek, () => {
  if (filterWorkshop.value === 'all') return
  const exists = activeStats.value.workshopStats.some((w) => w.key === filterWorkshop.value)
  if (!exists) filterWorkshop.value = 'all'
})

// ======== 任务列表 ========
const filteredTasks = computed(() => {
  const w = activeWeekObj.value
  if (!w) return []
  const kw = keyword.value.trim().toLowerCase()
  return w.tasks
    .filter((t) => {
      if (filterWorkshop.value !== 'all' && t.workshopKey !== filterWorkshop.value) return false
      if (filterRisk.value !== 'all' && t.riskLevel !== filterRisk.value) return false
      if (kw) {
        const hay = `${t.title} ${t.desc} ${t.owner} ${t.workshop}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
    .sort((a, b) => levelOrder(b.riskLevel) - levelOrder(a.riskLevel))
})

function levelOrder(l) {
  return l === 'high' ? 3 : l === 'mid' ? 2 : 1
}

// ======== 风险类型饼图（按周） ========
function cssVar(name, fallback) {
  try {
    return getCssVar(name) || fallback
  } catch (e) {
    return fallback
  }
}

const RISK_TYPE_COLOR = {
  人力风险: 'var(--color-danger)',
  质量风险: 'var(--color-warning)',
  产能风险: 'var(--color-primary)',
  设备风险: 'var(--chart-text-muted)',
  普通风险: 'var(--color-accent)',
}

const pieOption = computed(() => {
  // 依赖主题，切换主题时重新取色
  const themeKey = themeStore.currentTheme
  const textColor = cssVar('--color-text-secondary', '#909399')
  const fallbackColor = cssVar('--color-primary', '#409eff')
  const data = (activeStats.value.riskTypeDist || []).map((item) => ({
    name: item.name,
    value: item.value,
    itemStyle: { color: RISK_TYPE_COLOR[item.name] || fallbackColor },
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}个 ({d}%)',
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 12,
      itemHeight: 10,
      textStyle: { color: textColor, fontSize: 12 },
    },
    series: [
      {
        name: '风险类型',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: cssVar('--color-bg-card', '#ffffff'),
          borderWidth: 2,
        },
        label: {
          show: true,
          fontSize: 12,
          color: textColor,
          formatter: '{b}: {d}%',
        },
        labelLine: { length: 8, length2: 8 },
        data,
      },
    ],
    __themeKey: themeKey,
  }
})

function onPieReady(chart) {
  // 兜底再 resize 一次，防止首次容器高度未就绪
  setTimeout(() => chart && chart.resize(), 200)
}

// ======== 交互 ========
function openTask(t) {
  activeTask.value = t
  detailVisible.value = true
}

function resetFilter() {
  filterWorkshop.value = 'all'
  filterRisk.value = 'all'
  keyword.value = ''
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300)
}

function onMarkDone(task) {
  // 仅在前端打标记，不写回 JSON（可扩展为本地存储）
  if (task) task._followed = true
}
function onPlanToggle() {
  // 勾选事件预留
}
</script>

<style scoped lang="scss">
.think-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.think-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-md;
  flex-shrink: 0;

  .header-actions {
    display: flex;
    gap: $spacing-sm;
  }
}

.state-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .state-text {
    color: var(--color-text-muted);
    font-size: $font-md;
  }
}

// ======== 周切换 ========
.week-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-md;
  flex-shrink: 0;
}

.week-switch {
  width: auto;

  // 仅作为切换器使用，隐藏内容区
  :deep(.ui-tabs__content) {
    display: none;
  }
}

.week-range {
  font-size: $font-xs;
  color: var(--color-text-muted);
  white-space: nowrap;
}

// ======== KPI 行 ========
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
  padding: 0 $spacing-md $spacing-md;
  flex-shrink: 0;
}

// ======== 主区 ========
.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
  padding: 0 $spacing-md $spacing-md;
  min-height: 0;
  overflow: hidden;
}

// 关键：给车间看板固定行高，饼图吃掉剩余高度（否则首张卡片 height:100% 会把饼图挤成 0 高）
.left-col {
  display: grid;
  grid-template-rows: 190px 1fr;
  gap: $spacing-md;
  min-height: 0;
  overflow: hidden;
}

.right-col {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-extra {
  font-size: $font-xs;
  color: var(--color-text-secondary);
}

// ======== 车间看板 ========
.workshop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
}

.workshop-card {
  border-radius: $radius-md;
  padding: $spacing-sm;
  text-align: center;
  border: 1px solid;

  &.high { background: var(--color-danger-bg); border-color: var(--color-danger); }
  &.mid { background: var(--color-warning-bg); border-color: var(--color-warning); }
  &.low { background: var(--color-success-bg); border-color: var(--color-success); }

  .workshop-name {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--color-text-primary);
  }
  .risk-tag {
    display: inline-block;
    padding: 1px 10px;
    border-radius: 4px;
    font-size: $font-xs;
    color: white;
    margin-bottom: 4px;

    &.high { background: var(--color-danger); }
    &.mid { background: var(--color-warning); }
    &.low { background: var(--color-success); }
  }
  .workshop-count {
    font-size: 20px;
    font-weight: bold;
    color: var(--color-text-primary);
  }
}

// ======== 饼图 ========
.pie-card {
  min-height: 0;
}

.chart-box {
  flex: 1;
  width: 100%;
  min-height: 0;
}

// ======== 筛选栏 ========
.filter-bar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-select,
.filter-input {
  padding: 6px 12px;
  border: 1px solid var(--color-border, #dcdfe6);
  border-radius: $radius-sm;
  font-size: $font-sm;
  background: var(--color-bg-card, #fff);
  color: var(--color-text-primary);
  outline: none;
}

.filter-input {
  flex: 1;
  min-width: 120px;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--color-primary, #409eff);
}

// ======== 任务列表 ========
.task-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  min-height: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--color-border, #c0c4cc); border-radius: 3px; }
}

.task-card {
  border-left: 4px solid var(--color-danger);
  background: var(--color-danger-bg);
  border-radius: $radius-sm;
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-sm;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-sm;

  &.mid-risk {
    border-left-color: var(--color-warning);
    background: var(--color-warning-bg);
  }
  &.low-risk {
    border-left-color: var(--color-success);
    background: var(--color-success-bg);
  }
  &:hover {
    transform: translateX(3px);
    box-shadow: var(--shadow-card);
  }
  &.active {
    border-left-color: var(--color-primary, #409eff);
    background: var(--color-info-bg);
  }

  .task-info { flex: 1; min-width: 0; }
  .task-workshop {
    font-size: $font-sm;
    font-weight: bold;
    color: var(--color-text-primary);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;

    .ws-name { flex-shrink: 0; }
    .core-mini {
      font-weight: normal;
      flex-shrink: 0;
    }
  }
  .task-desc {
    font-size: $font-xs;
    color: var(--color-text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 4px;
    font-size: $font-xs;
    color: var(--color-text-muted);
  }
  .task-risk-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: $font-xs;
    color: white;
    flex-shrink: 0;
    margin-left: 6px;

    &.high { background: var(--color-danger); }
    &.mid { background: var(--color-warning); }
    &.low { background: var(--color-success); }
  }
}

.empty-tip {
  text-align: center;
  color: var(--color-text-muted);
  padding: 40px 0;
  font-size: $font-sm;
}
</style>
