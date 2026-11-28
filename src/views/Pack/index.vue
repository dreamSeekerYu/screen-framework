<template>
  <div class="home-screen pack-screen">
    <ScreenHeader title="PACK客户质量表现监控大屏" :sub-title="`CALB 中创新航 | 数据截止：${packData.asOf} | 实时监控`" />

    <div v-if="loading" class="p-loading">数据加载中...</div>
    <div v-else-if="loadError" class="p-loading">数据加载失败：{{ loadError }}</div>

    <template v-else>
      <PackMainTabs
        :tabs="MAIN_TABS"
        :active="mainTab"
        :rotating="rotateOn"
        @select="selectTab"
        @toggle-rotate="toggleRotate"
      />

      <div class="pack-content">
        <PackOverviewPanel
          v-if="mainTab === 'overview'"
          :kpis="overviewKpis"
          :cards="overviewCards"
          :active-client="activeClient"
          :trend-option="overviewTrendOption"
          :radar-option="overviewRadarOption"
          @jump="jumpToDetail"
        />

        <PackDetailPanel
          v-if="mainTab === 'detail'"
          :clients="CLIENT_TABS"
          :active-client="activeClient"
          :window-tabs="WINDOW_TABS"
          :time-window="timeWindow"
          :current-a="currentA"
          :current-risk="currentRisk"
          :current-a-charts="currentACharts"
          :current-a-weeks="currentAWeeks"
          :current-a-rows="currentARows"
          :m5="m5"
          :m5-risk="m5Risk"
          :m5-chart-option="m5ChartOption"
          :m5-rows="m5Rows"
          :m5-conclusion="m5Conclusion"
          :m6="m6"
          :m6-risk="m6Risk"
          :m6-chart-option="m6ChartOption"
          :m6-table-headers="m6TableHeaders"
          :m6-table-rows="m6TableRows"
          :m6-peak-delivery="m6PeakDelivery"
          :m6-conclusion="m6Conclusion"
          @select-client="selectClient"
          @select-window="selectWindow"
        />

        <PackIssuesPanel
          v-if="mainTab === 'issues'"
          :issues="issueItems"
          :concludes="concludeItems"
          :suggestions="suggestions"
          :issue-type-option="issueTypeOption"
          :risk-score-option="riskScoreOption"
          @locate="locateIssue"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import { useCarousel } from '@/composables/useCarousel.js'
import { useTimeWindow } from '@/composables/useTimeWindow.js'
import { useMarkPointLink } from '@/composables/useMarkPointLink.js'
import { usePageOverflowGuard } from '@/composables/usePageOverflowGuard.js'
import { fmtNum } from '@/utils/packRiskRules.js'
import PackMainTabs from './components/PackMainTabs.vue'
import PackOverviewPanel from './components/PackOverviewPanel.vue'
import PackDetailPanel from './components/PackDetailPanel.vue'
import PackIssuesPanel from './components/PackIssuesPanel.vue'
import { usePackData } from './composables/usePackData.js'
import { usePackOverview } from './composables/usePackOverview.js'
import { usePackDetail } from './composables/usePackDetail.js'
import { usePackIssues } from './composables/usePackIssues.js'

const MAIN_TABS = [
  { key: 'overview', label: '总览仪表盘', icon: '📊' },
  { key: 'detail',   label: '客户详情分析', icon: '📈' },
  { key: 'issues',   label: '问题与偏差分析', icon: '⚠️' },
]
const CLIENT_TABS = [
  { key: 'A1', label: 'A1客户' },
  { key: 'A2', label: 'A2客户' },
  { key: 'A3', label: 'A3客户' },
  { key: 'M5', label: 'A4-M5客户' },
  { key: 'M6', label: 'A4-M6客户' },
]

const mainTab = ref('overview')

/* ========== 数据层：加载 + 风险引擎 ========== */
const {
  loading,
  loadError,
  packData,
  activeClient,
  a1,
  a2,
  a3,
  m5,
  m6,
  currentA,
  insight,
  riskOf,
  currentRisk
} = usePackData()

/* ========== 时间窗口 / 投屏轮播 / 问题联动高亮（公共 composables） ========== */
const { timeWindow, WINDOW_TABS, windowLabels } = useTimeWindow()

/** 投屏轮播：总览 → 客户详情（逐客户）→ 问题分析 循环，手动操作自动重新计时 */
function rotateTick() {
  if (mainTab.value === 'detail') {
    // 详情 Tab：逐客户轮换，轮完进入问题分析
    const idx = CLIENT_TABS.findIndex(t => t.key === activeClient.value)
    if (idx >= CLIENT_TABS.length - 1) mainTab.value = 'issues'
    else activeClient.value = CLIENT_TABS[idx + 1].key
  } else if (mainTab.value === 'overview') {
    mainTab.value = 'detail'
  } else {
    // 问题分析 → 总览，并重置客户游标，保证下一轮详情从 A1 开始
    mainTab.value = 'overview'
    activeClient.value = CLIENT_TABS[0].key
  }
}
const { on: rotateOn, toggle: toggleRotate, touch: touchRotate } =
  useCarousel({ interval: 12000, tick: rotateTick })

/** 问题联动高亮：{ custKey, periodKey, week } → 详情图表 markPoint 定位超标点 */
const { set: setHighlight, clear: clearHighlight, markOf: _markOf } = useMarkPointLink()
/** Pack 便捷封装：pin 数值统一走 fmtNum */
function highlightMark(custKey, periodKey, labels, values) {
  return _markOf(custKey, periodKey, labels, values, { fmt: fmtNum })
}

// dev 模式下守卫 1080 一屏约束
usePageOverflowGuard()

/* ========== 总览 / 详情 / 问题分析（视图逻辑按域拆分） ========== */
const { overviewKpis, overviewCards, overviewTrendOption, overviewRadarOption } =
  usePackOverview({ packData, insight, a1, a2, a3, m5, m6, riskOf })

const {
  currentAWeeks,
  currentARows,
  currentACharts,
  m5ChartOption,
  m5Rows,
  m6ChartOption,
  m6TableHeaders,
  m6TableRows,
  m6PeakDelivery
} = usePackDetail({ m5, m6, currentA, timeWindow, windowLabels, highlightMark })

const {
  issueItems,
  concludeItems,
  suggestions,
  m5Conclusion,
  m6Conclusion,
  issueTypeOption,
  riskScoreOption
} = usePackIssues({ insight, m5, m6 })

const m5Risk = computed(() => riskOf('M5'))
const m6Risk = computed(() => riskOf('M6'))

/* ========== 交互：Tab/客户/窗口切换（手动操作时轮播重新计时） ========== */
function selectTab(key) { mainTab.value = key; touchRotate() }
function selectClient(key) { activeClient.value = key; clearHighlight(); touchRotate() }
function selectWindow(key) { timeWindow.value = key; touchRotate() }
function jumpToDetail(clientKey) {
  activeClient.value = clientKey
  mainTab.value = 'detail'
  touchRotate()
}

/** 点击问题条目 → 跳转对应客户详情，并 markPoint 高亮该周期峰值点 */
function locateIssue(it) {
  if (!it.custKey) return
  setHighlight({ custKey: it.custKey, periodKey: it.periodKey, week: it.week || it.period })
  jumpToDetail(it.custKey)
}
</script>

<style lang="scss" src="./pack.scss"></style>
