<template>
  <div class="think-screen" v-loading="loading">
    <!-- 顶部标题栏 -->
    <div class="think-header">
      <ScreenHeader :title="`${currentWeek} 周度思考`" />
      <div class="header-actions">
        <StatusTag type="default" text="重置筛选" @click="resetFilter" />
        <StatusTag type="info" text="全屏展示" @click="toggleFullscreen" />
      </div>
    </div>

    <!-- 加载/错误/空态 -->
    <div v-if="error" class="state-box">
      <div class="state-text">数据加载失败：{{ error }}</div>
    </div>

    <template v-else-if="!loading && parsed">
      <!-- KPI 行 -->
      <div class="kpi-row">
        <StatCard
          theme="classic"
          status="warning"
          title="上周重点困难工作"
          :value="parsed.overall.lastWeekCount"
          unit="项"
        />
        <StatCard
          theme="classic"
          status="danger"
          title="下两周重点风险任务"
          :value="parsed.overall.nextTwoCount"
          unit="项"
        />
        <StatCard
          theme="classic"
          status="primary"
          title="核心风险卡点"
          :value="parsed.overall.riskPointCount"
          unit="个"
        />
        <StatCard
          theme="classic"
          status="success"
          title="需协调资源支持"
          :value="parsed.overall.resourceCount"
          unit="项"
        />
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 左列：车间看板 + 风险类型分布 -->
        <div class="left-col">
          <!-- 车间风险等级看板 -->
          <ScreenCard title="车间风险等级看板">
            <div class="workshop-grid">
              <div
                v-for="ws in parsed.workshops"
                :key="ws.key"
                class="workshop-card"
                :class="ws.level"
              >
                <div class="workshop-name">{{ ws.name }}</div>
                <div class="risk-tag" :class="ws.level">
                  {{ ws.level === 'high' ? '高风险' : ws.level === 'mid' ? '中风险' : '低风险' }}
                </div>
                <div class="workshop-count">{{ ws.total }}项</div>
              </div>
            </div>
          </ScreenCard>

          <!-- 风险类型分布饼图 -->
          <ScreenCard title="风险类型分布" class="pie-card">
            <div ref="pieRef" class="chart-box">
              <BaseChart :option="pieOption" v-if="pieReady" @chart-ready="onPieReady" />
            </div>
          </ScreenCard>
        </div>

        <!-- 右列：任务列表 -->
        <div class="right-col">
          <ScreenCard title="重点任务列表">
            <div class="filter-bar">
              <select v-model="filterCategory" class="filter-select">
                <option value="all">全部分类</option>
                <option value="lastWeek">上周重大/困难工作</option>
                <option value="nextTwo">下两周重大/风险任务</option>
              </select>
              <select v-model="filterWorkshop" class="filter-select">
                <option value="all">全部车间</option>
                <option v-for="ws in parsed.workshops" :key="ws.key" :value="ws.key">
                  {{ ws.name }}
                </option>
              </select>
              <select v-model="filterRisk" class="filter-select">
                <option value="all">全部风险</option>
                <option value="high">高风险</option>
                <option value="mid">中风险</option>
                <option value="low">低风险</option>
              </select>
            </div>

            <div class="task-list" ref="listRef">
              <template v-for="cat in categoryGroups" :key="cat.key">
                <template v-if="groupedTasks[cat.key].length">
                  <div class="category-title">{{ cat.title }}</div>
                  <div
                    v-for="t in groupedTasks[cat.key]"
                    :key="t.taskNo"
                    class="task-card"
                    :class="[
                      t.riskLevel === 'mid' ? 'mid-risk' : (t.riskLevel === 'low' ? 'low-risk' : ''),
                      activeTask && activeTask.taskNo === t.taskNo ? 'active' : '',
                    ]"
                    @click="openTask(t)"
                  >
                    <div class="task-info">
                      <div class="task-workshop">
                        {{ t.workshop }}
                        <Tag v-if="t.coreRiskCount > 0" size="small" status="danger" class="core-mini">
                          {{ t.coreRiskCount }}个核心卡点
                        </Tag>
                      </div>
                      <div class="task-desc">{{ t.desc || t.title }}</div>
                    </div>
                    <div class="task-risk-badge" :class="t.riskLevel">{{ t.riskText }}</div>
                  </div>
                </template>
              </template>
              <div v-if="!filteredTasks.length" class="empty-tip">暂无符合条件的任务</div>
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
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import StatCard from '@/components/common/NewStatCard.vue'
import Tag from '@/components/common/Tag.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import ThinkTaskDetail from '@/components/common/ThinkTaskDetail.vue'
import { loadSheet } from '@/utils/dataLoader.js'
import { parseWeeklyThink } from '@/utils/parseWeeklyThink.js'
import { getCssVar } from '@/utils/color.js'

// ======== 状态 ========
const loading = ref(true)
const error = ref('')
const parsed = ref(null)
const sheet = ref(null)

const filterCategory = ref('all')
const filterWorkshop = ref('all')
const filterRisk = ref('all')

const pieReady = ref(false)
const pieRef = ref(null)
const listRef = ref(null)

const detailVisible = ref(false)
const activeTask = ref(null)

// ======== 数据加载 ========
onMounted(async () => {
  try {
    sheet.value = await loadSheet('think', 0)
    parsed.value = parseWeeklyThink(sheet.value)
  } catch (e) {
    console.error(e)
    error.value = e.message || String(e)
  } finally {
    loading.value = false
    await nextTick()
    // 延迟让 flex 布局完成后再初始化图表
    setTimeout(() => { pieReady.value = true }, 150)
  }
})

// ======== 计算属性 ========
const currentWeek = computed(() => parsed.value?.overall?.latestWeek || '')

const categoryGroups = [
  { key: 'lastWeek', title: '上周最重大/困难的工作' },
  { key: 'nextTwo', title: '下两周最重大/风险任务' },
]

const filteredTasks = computed(() => {
  if (!parsed.value) return []
  return parsed.value.allTasks.filter(t => {
    if (filterCategory.value !== 'all' && t.category !== filterCategory.value) return false
    if (filterWorkshop.value !== 'all' && t.workshopKey !== filterWorkshop.value) return false
    if (filterRisk.value !== 'all' && t.riskLevel !== filterRisk.value) return false
    return true
  })
})

const groupedTasks = computed(() => ({
  lastWeek: filteredTasks.value.filter(t => t.category === 'lastWeek'),
  nextTwo: filteredTasks.value.filter(t => t.category === 'nextTwo'),
}))

// 风险类型饼图
const pieOption = computed(() => {
  if (!parsed.value) return {}
  const palette = {
    '人力风险': '#f56c6c',
    '质量风险': '#e6a23c',
    '产能风险': '#409eff',
    '设备风险': '#909399',
    '普通风险': '#b37feb',
  }
  const data = parsed.value.riskTypes.map(item => ({
    name: item.name,
    value: item.value,
    itemStyle: { color: palette[item.name] || resolveColor('--color-primary', '#409eff') },
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
      textStyle: { color: 'var(--color-text-secondary)', fontSize: 12 },
    },
    series: [{
      name: '风险类型',
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: 'var(--color-bg-card, #fff)',
        borderWidth: 2,
      },
      label: {
        show: true,
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        formatter: '{b}: {d}%',
      },
      labelLine: { length: 8, length2: 8 },
      data,
    }],
  }
})

// ======== 事件 ========
function onPieReady(chart) {
  // 兜底再 resize 一次，防止首次 0 高度
  setTimeout(() => chart && chart.resize(), 200)
}

function openTask(t) {
  activeTask.value = t
  detailVisible.value = true
}

function resetFilter() {
  filterCategory.value = 'all'
  filterWorkshop.value = 'all'
  filterRisk.value = 'all'
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
  padding: 0;
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

.left-col {
  display: flex;
  flex-direction: column;
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

// ======== 车间看板 ========
.workshop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
}

.workshop-card {
  border-radius: $radius-md;
  padding: $spacing-md $spacing-sm;
  text-align: center;
  border: 1px solid;

  &.high { background: #fef0f0; border-color: #fbc4c4; }
  &.mid { background: #fef8e7; border-color: #f5dab1; }
  &.low { background: #f0f9eb; border-color: #c2e7b0; }

  .workshop-name {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: 6px;
    color: var(--color-text-primary);
  }
  .risk-tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: $font-xs;
    color: white;
    margin-bottom: 6px;

    &.high { background: #f56c6c; }
    &.mid { background: #e6a23c; }
    &.low { background: #67c23a; }
  }
  .workshop-count {
    font-size: 22px;
    font-weight: bold;
    color: var(--color-text-primary);
    font-family: 'DIN Alternate', sans-serif;
  }
}

// ======== 饼图 ========
.pie-card {
  flex: 1;
  min-height: 0;

  :deep(.screen-card__body) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
.chart-box {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 280px;
}

// ======== 任务列表 ========
.filter-bar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border, #dcdfe6);
  border-radius: $radius-sm;
  font-size: $font-sm;
  background: var(--color-bg-card, #fff);
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;

  &:focus { border-color: var(--color-primary, #409eff); }
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  min-height: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--color-border, #c0c4cc); border-radius: 3px; }
}

.category-title {
  font-size: $font-md;
  font-weight: bold;
  color: var(--color-text-primary);
  margin: $spacing-md 0 $spacing-sm;

  &:first-child { margin-top: 0; }
}

.task-card {
  border-left: 4px solid #f56c6c;
  background: #fef0f0;
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
    border-left-color: #e6a23c;
    background: #fef8e7;
  }
  &.low-risk {
    border-left-color: #67c23a;
    background: #f0f9eb;
  }
  &:hover {
    transform: translateX(3px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  &.active {
    border-left-color: var(--color-primary, #409eff);
    background: #ecf5ff;
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
  .task-risk-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: $font-xs;
    color: white;
    flex-shrink: 0;
    margin-left: 6px;

    &.high { background: #f56c6c; }
    &.mid { background: #e6a23c; }
    &.low { background: #67c23a; }
  }
}

.empty-tip {
  text-align: center;
  color: var(--color-text-muted);
  padding: 40px 0;
  font-size: $font-sm;
}
</style>
