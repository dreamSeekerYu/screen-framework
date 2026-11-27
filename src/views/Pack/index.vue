<template>
  <div class="home-screen pack-screen">
    <ScreenHeader title="PACK客户质量表现监控大屏" :sub-title="`CALB 中创新航 | 数据截止：${packData.asOf} | 实时监控`" />

    <div v-if="loading" class="p-loading">数据加载中...</div>
    <div v-else-if="loadError" class="p-loading">数据加载失败：{{ loadError }}</div>

    <template v-else>
      <!-- 主Tab导航（总览仪表盘 / 客户详情分析 / 问题与偏差分析） -->
      <div class="pack-main-tabs">
        <button
          v-for="t in MAIN_TABS"
          :key="t.key"
          class="pack-tab-btn"
          :class="{ active: mainTab === t.key }"
          @click="selectTab(t.key)"
        >
          <span class="icon">{{ t.icon }}</span>{{ t.label }}
        </button>
        <button
          class="pack-tab-btn rotate-btn"
          :class="{ active: rotateOn }"
          :title="rotateOn ? '轮播中：总览 → 客户详情（逐客户）→ 问题分析 自动循环，点击关闭' : '开启投屏轮播（每 12 秒自动切换，手动操作自动重新计时）'"
          @click="toggleRotate"
        >
          <span class="icon">{{ rotateOn ? '⏸' : '📺' }}</span>{{ rotateOn ? '轮播中' : '投屏轮播' }}
        </button>
      </div>

      <div class="pack-content">
        <!-- ========== 总览仪表盘 ========== -->
        <div v-if="mainTab === 'overview'" class="pack-tab-panel pack-tab-panel--overview">
          <!-- KPI 行：StatCardRow + NewStatCard，副标题/状态色由风险规则引擎动态生成 -->
          <StatCardRow class="pack-kpi-row" :gap="16" :min-card-width="200" :max-card-width="460">
            <NewStatCard
              v-for="(k, i) in overviewKpis"
              :key="k.title"
              theme="kpi-top"
              :status="k.status"
              :title="k.title"
              :sub-title="k.sub"
              :value="k.value"
              :count-up="true"
              :fit-value="false"
              animated
              :animation-delay="i * 80"
            />
          </StatCardRow>

          <!-- 客户健康度矩阵：风险标签 + 达标率环形 + 0KM PPM sparkline 迷你趋势 -->
          <div class="pack-client-grid">
            <div
              v-for="c in overviewCards"
              :key="c.key"
              class="pack-client-card"
              :class="{ selected: activeClient === c.key }"
              @click="jumpToDetail(c.key)"
            >
              <div class="cc-head">
                <h3 class="cc-name">{{ c.name }}</h3>
                <StatusTag :type="c.riskLevel" effect="light" size="small" :text="c.riskText" />
              </div>
              <div class="cc-body">
                <div class="cc-metrics">
                  <div v-for="m in c.metrics" :key="m.label" class="cc-row">
                    <span class="cc-label">{{ m.label }}</span>
                    <span class="cc-val" :class="m.colorClass">{{ m.value }}</span>
                  </div>
                </div>
                <div class="cc-ring" :style="ringStyle(c)">
                  <div class="cc-ring-hole">
                    <span class="cc-ring-num">{{ c.passRate }}%</span>
                    <span class="cc-ring-label">达标率</span>
                  </div>
                </div>
              </div>
              <div class="cc-spark">
                <svg viewBox="0 0 100 26" preserveAspectRatio="none" class="cc-spark-svg">
                  <polygon :points="`0,26 ${c.sparkPoints} 100,26`"
                    :fill="`var(--color-${c.sparkColor}-bg)`" opacity="0.5" />
                  <polyline :points="c.sparkPoints" fill="none" stroke-width="1.6"
                    :stroke="`var(--color-${c.sparkColor})`" vector-effect="non-scaling-stroke" />
                </svg>
                <span class="cc-spark-label">0KM PPM 走势</span>
              </div>
              <div class="cc-remark">{{ c.remark }}</div>
            </div>
          </div>

          <!-- 图表区域：ScreenCard + BaseChart -->
          <div class="pack-chart-grid">
            <ScreenCard class="pack-chart-card" :show-corners="false">
              <template #title>
                <div class="chart-title"><span class="chart-bar"></span>各客户0KM PPM趋势对比</div>
              </template>
              <div class="chart-box-h300">
                <BaseChart :option="overviewTrendOption" />
              </div>
            </ScreenCard>
            <ScreenCard class="pack-chart-card" :show-corners="false">
              <template #title>
                <div class="chart-title"><span class="chart-bar"></span>各周期PPM达标情况统计</div>
              </template>
              <template #subTitle>
                <div class="chart-sub">得分 = 目标/实际×100（封顶100），由数据实时计算</div>
              </template>
              <div class="chart-box-h300">
                <BaseChart :option="overviewRadarOption" />
              </div>
            </ScreenCard>
          </div>
        </div>

        <!-- ========== 客户详情分析 ========== -->
        <div v-if="mainTab === 'detail'" class="pack-tab-panel">
          <!-- 客户选择器 + 时间窗口切换（消灭 60+ 周挤一图的内滚动问题） -->
          <div class="pack-client-tabs">
            <button
              v-for="t in CLIENT_TABS"
              :key="t.key"
              class="client-tab-btn"
              :class="{ active: activeClient === t.key }"
              @click="selectClient(t.key)"
            >{{ t.label }}</button>
            <div class="pack-window-tabs">
              <span class="window-label">时间窗口</span>
              <button
                v-for="w in WINDOW_TABS"
                :key="w.key"
                class="window-tab-btn"
                :class="{ active: timeWindow === w.key }"
                @click="selectWindow(w.key)"
              >{{ w.label }}</button>
            </div>
          </div>

          <!-- A1/A2/A3/M5 详情：通用A型布局 -->
          <div v-if="currentA" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">{{ currentA.meta.fullName }} - 质量表现详情</h3>
              <StatusTag :type="currentRisk.level" effect="light" size="small" :text="`${currentRisk.text} · ${currentRisk.score}分`" />
            </div>

            <div class="detail-chart-grid">
              <ScreenCard v-for="p in A_PERIODS" :key="p.key" class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">{{ p.title }}</div>
                </template>
                <div class="chart-box-h240">
                  <BaseChart :option="periodOption(currentA, p.key)" />
                </div>
              </ScreenCard>
            </div>

            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">详细数据表（最近 5 周）</h4>
              <table class="pack-data-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th v-for="w in detailWeeks(currentA)" :key="w">{{ w }}</th>
                    <th>目标</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailRows(currentA)" :key="row.name">
                    <td class="tl">{{ row.name }}</td>
                    <td v-for="(v,i) in row.weekly" :key="i" :class="valColor(row, v)">{{ formatVal(v) }}</td>
                    <td>{{ row.target === '—' ? '—' : '≤' + row.target + ' PPM' }}</td>
                    <td>
                      <span class="cc-status" :class="`status-${row.status}`">{{ row.statusText }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- A4-M5 详情 -->
          <div v-if="activeClient === 'M5' && m5" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">A4客户 - M5-XP (D03E) 质量表现</h3>
              <StatusTag :type="riskOf('M5').level" effect="light" size="small" :text="`${riskOf('M5').text} · ${riskOf('M5').score}分`" />
            </div>
            <div class="detail-chart-grid--wide">
              <ScreenCard class="detail-chart-block full" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">M5-XP 集成0KM表现</div>
                </template>
                <div class="chart-box-h300">
                  <BaseChart :option="m5ChartOption" />
                </div>
              </ScreenCard>
            </div>
            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">M5-XP 关键数据</h4>
              <table class="pack-data-table">
                <thead>
                  <tr><th>周期</th><th>故障数</th><th>供货数</th><th>0KM实际PPM</th><th>目标PPM</th><th>状态</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in m5Rows" :key="r.period">
                    <td class="tl">{{ r.period }}</td>
                    <td>{{ r.fail }}</td>
                    <td>{{ r.supply }}</td>
                    <td :class="r.ppmColor">{{ r.ppm }}</td>
                    <td>{{ r.target }}</td>
                    <td><span class="cc-status" :class="`status-${r.status}`">{{ r.statusText }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="detail-note note-blue">
              <h4>M5集成结论（由数据自动生成）</h4>
              <p>{{ m5Conclusion }}</p>
            </div>
          </div>

          <!-- A4-M6 详情 -->
          <div v-if="activeClient === 'M6' && m6" class="pack-detail-card">
            <div class="detail-head">
              <h3 class="detail-title">A4客户 - M6-XM (小米-N1) 质量表现</h3>
              <StatusTag :type="riskOf('M6').level" effect="light" size="small" :text="`${riskOf('M6').text} · ${riskOf('M6').score}分`" />
            </div>
            <div class="detail-chart-grid">
              <ScreenCard class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">小米-N1 0KM客户表现</div>
                </template>
                <div class="chart-box-h300">
                  <BaseChart :option="m6ChartOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="detail-chart-block" :show-corners="false">
                <template #title>
                  <div class="detail-sub-title">关键指标数据</div>
                </template>
                <div class="m6-metrics">
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>{{ m6.kpi.km0.peakWeek || '窗口' }} 外观PPM峰值</span>
                      <span class="m6-val" :class="m6.kpi.km0.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(m6.kpi.km0.ppm) }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill" :class="m6.kpi.km0.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, m6.kpi.km0.target ? m6.kpi.km0.ppm / m6.kpi.km0.target * 100 : 100) + '%' }"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km0.target || 300 }}PPM，{{ m6.kpi.km0.ppm > m6.kpi.km0.target ? `超标${(m6.kpi.km0.ppm / m6.kpi.km0.target).toFixed(1)}倍` : '达标' }}</div>
                  </div>
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>{{ m6.kpi.km3.peakWeek || '窗口' }} 性能PPM峰值</span>
                      <span class="m6-val" :class="m6.kpi.km3.status === 'success' ? 'text-green' : 'text-red'">{{ fmt(m6.kpi.km3.ppm) }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill" :class="m6.kpi.km3.status === 'success' ? 'bar-green' : 'bar-red'" :style="{ width: Math.min(100, m6.kpi.km3.target ? m6.kpi.km3.ppm / m6.kpi.km3.target * 100 : 100) + '%' }"></div></div>
                    <div class="m6-sub">目标值：{{ m6.kpi.km3.target || 150 }}PPM，{{ m6.kpi.km3.ppm <= m6.kpi.km3.target ? '达标' : '超标' }}</div>
                  </div>
                  <div class="m6-metric-item">
                    <div class="m6-m-head">
                      <span>周交付量峰值</span>
                      <span class="m6-val text-blue">{{ m6PeakDelivery.value }}</span>
                    </div>
                    <div class="m6-bar"><div class="m6-bar-fill bar-blue" style="width:100%"></div></div>
                    <div class="m6-sub">{{ m6PeakDelivery.week }} 交付峰值，产能爬坡期</div>
                  </div>
                </div>
              </ScreenCard>
            </div>
            <div class="detail-table-wrap">
              <h4 class="detail-sub-title">小米-N1 详细数据表</h4>
              <table class="pack-data-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th v-for="h in m6TableHeaders" :key="h">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in m6TableRows" :key="row.name">
                    <td class="tl">{{ row.name }}</td>
                    <td v-for="(v,i) in row.values" :key="i" :class="row.color[i]">{{ v }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="detail-note note-yellow">
              <h4>M6集成结论（由数据自动生成）与未计入问题说明</h4>
              <p>{{ m6Conclusion }}</p>
              <p><strong>未计入0KM问题（业务备注）：</strong></p>
              <ul>
                <li>• 水管磕伤（翻包导致），客户端已处理，不计入</li>
                <li>• 箱盖及箱体变形6例（出厂照片无异常），判定为中储物流责任，不计入</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ========== 问题与偏差分析（全部由风险规则引擎生成） ========== -->
        <div v-if="mainTab === 'issues'" class="pack-tab-panel">
          <div class="pack-issues-grid">
            <div class="issues-left">
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title"><span class="text-red">⚠️</span> 偏差问题汇总</h3>
                </template>
                <template #subTitle>
                  <div class="chart-sub">由各客户各周期 PPM 实际值 vs 目标值自动扫描生成</div>
                </template>
                <div class="issue-list">
                  <div
                    v-for="it in issueItems"
                    :key="it.title"
                    class="issue-item issue-item--click"
                    :class="`issue-item--${it.severity}`"
                    :title="`点击查看 ${it.custKey || ''} 详情并定位该周期`"
                    @click="locateIssue(it)"
                  >
                    <div class="issue-head">
                      <StatusTag :type="it.statusType === 'fail' ? 'danger' : (it.severity === 'info' ? 'info' : 'warning')" effect="light" size="small" :text="it.statusText" />
                      <h4>{{ it.title }}</h4>
                    </div>
                    <p class="issue-desc"><strong>问题描述：</strong>{{ it.desc }}</p>
                    <p class="issue-meta">
                      影响周期：{{ it.period }} | 涉及产品：{{ it.product }}
                      <span v-if="it.custKey" class="issue-locate">🔍 查看详情 →</span>
                    </p>
                  </div>
                  <div v-if="!issueItems.length" class="issue-empty">当前窗口内未扫描到超标或趋势预警事件，各客户指标均在目标范围内。</div>
                </div>
              </ScreenCard>

              <ScreenCard class="pack-chart-card" :show-corners="false">
                <template #title>
                  <h3 class="section-title"><span class="text-blue">📋</span> 集成达标结论汇总</h3>
                </template>
                <div class="conclude-grid">
                  <div v-for="c in concludeItems" :key="c.name" class="conclude-card" :class="c.modifier">
                    <h4 :class="c.titleColor">{{ c.name }}<span v-if="c.score != null" class="conclude-score">{{ c.score }}分</span></h4>
                    <p>{{ c.text }}</p>
                  </div>
                </div>
              </ScreenCard>
            </div>

            <div class="issues-right">
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">问题类型分布</h3>
                </template>
                <div class="chart-box-h250">
                  <BaseChart :option="issueTypeOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="pack-chart-card mb" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">各客户风险评级</h3>
                </template>
                <template #subTitle>
                  <div class="chart-sub">评分 = 100 - Σ事件扣分（超标按倍数、预警小额扣）</div>
                </template>
                <div class="chart-box-h250">
                  <BaseChart :option="riskScoreOption" />
                </div>
              </ScreenCard>
              <ScreenCard class="pack-chart-card" :show-corners="false">
                <template #title>
                  <h3 class="section-title sm">改进建议（按风险排序自动生成）</h3>
                </template>
                <div class="suggest-list">
                  <div v-for="(s,i) in suggestions" :key="i" class="suggest-item">
                    <span class="suggest-no" :class="s.color">{{ i+1 }}</span>
                    <p>{{ s.text }}</p>
                  </div>
                </div>
              </ScreenCard>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useCarousel } from '@/composables/useCarousel.js'
import { useTimeWindow } from '@/composables/useTimeWindow.js'
import { useMarkPointLink } from '@/composables/useMarkPointLink.js'
import { usePageOverflowGuard } from '@/composables/usePageOverflowGuard.js'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import NewStatCard from '@/components/common/NewStatCard.vue'
import StatCardRow from '@/components/common/StatCardRow.vue'
import { loadPackData, PERIOD_FIELD } from '@/utils/parsePack.js'
import { buildPackInsight, fmtNum, riskLevelOf } from '@/utils/packRiskRules.js'
import { chartC, tooltipStyle, legendStyle, gridStyle, axisStyle, valueAxisStyle, chartPalette } from '@/utils/chartTheme.js'

const loading = ref(true)
const loadError = ref('')
const packData = reactive({ asOf: '', customers: [], peak0km: { value: 0 }, peak3m: { value: 0 }, peak12m: { value: 0 }, totalCustomers: 0 })
const mainTab = ref('overview')
const activeClient = ref('A1')

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
const A_PERIODS = [
  { key: 'km0',  title: '集成0KM表现' },
  { key: 'km3',  title: '集成3MIS表现' },
  { key: 'km6',  title: '集成6MIS表现' },
  { key: 'km12', title: '集成12MIS表现' },
]

/* ========== 第二阶段：时间窗口 / 投屏轮播 / 问题联动高亮（已下沉为公共 composables） ========== */
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
const { highlight, set: setHighlight, clear: clearHighlight, markOf: _markOf } = useMarkPointLink()
/** Pack 便捷封装：pin 数值统一走 fmtNum */
function highlightMark(custKey, periodKey, labels, values) {
  return _markOf(custKey, periodKey, labels, values, { fmt })
}

// dev 模式下守卫 1080 一屏约束
usePageOverflowGuard()

const a1 = computed(() => packData.customers.find(c => c.key === 'A1'))
const a2 = computed(() => packData.customers.find(c => c.key === 'A2'))
const a3 = computed(() => packData.customers.find(c => c.key === 'A3'))
const m5 = computed(() => packData.customers.find(c => c.key === 'M5'))
const m6 = computed(() => packData.customers.find(c => c.key === 'M6'))
const currentA = computed(() => {
  if (['A1', 'A2', 'A3'].includes(activeClient.value)) {
    return packData.customers.find(c => c.key === activeClient.value) || a1.value
  }
  return null
})

function fmt(v) { return fmtNum(v) }

/* ========== 风险规则引擎（问题清单/结论/建议/评分/雷达 全部数据驱动） ========== */
const insight = computed(() => {
  if (!packData.customers.length) return null
  return buildPackInsight(packData.customers)
})
const issueItems = computed(() => insight.value?.issueItems || [])
const concludeItems = computed(() => insight.value?.concludeItems || [])
const suggestions = computed(() => insight.value?.suggestions || [])

/** 按客户 key 取风险评分与等级 */
function riskOf(custKey) {
  const r = insight.value?.riskScores.find(x => x.custKey === custKey)
  return r || { score: 100, level: 'success', text: '达标' }
}
const currentRisk = computed(() => currentA.value ? riskOf(currentA.value.key) : riskOf('M5'))

const m5Conclusion = computed(() => {
  const c = concludeItems.value.find(x => x.name === (m5.value?.meta.name || 'M5客户'))
  return c?.text || '整体达标'
})
const m6Conclusion = computed(() => {
  const c = concludeItems.value.find(x => x.name === (m6.value?.meta.name || 'M6-XM客户'))
  if (!c) return '—'
  return `${c.text}。外观/性能PPM口径详见上方图表与数据表。`
})

/* ========== KPI 行（副标题动态生成，消除写死文案） ========== */
const overviewKpis = computed(() => {
  if (!insight.value) return []
  const peaks = insight.value.peaks
  const kpiOf = (peak, title) => {
    const o = peak.owner
    let status = 'success'
    let sub = '窗口内无超标记录'
    if (o && o.target && peak.value > o.target) {
      status = o.ratio >= 3 ? 'danger' : 'warning'
      sub = `⚡ ${o.name} ${o.week || ''} 超目标${o.ratio}倍`
    } else if (o) {
      sub = `峰值出现在 ${o.name} ${o.week || ''}，未超目标`
    }
    return { title, value: peak.value, sub, status }
  }
  // 需关注客户数由规则引擎评分推导（不再使用写死的 meta.status）
  const focusCount = insight.value.riskScores.filter(r => r.level !== 'success').length
  return [
    { title: '监控客户数量', value: packData.totalCustomers,
      sub: focusCount ? `${focusCount} 家客户需关注` : '全部客户达标',
      status: focusCount ? 'warning' : 'success' },
    kpiOf(peaks.km0, '0KM PPM峰值'),
    kpiOf(peaks.km3, '3MIS PPM峰值'),
    kpiOf(peaks.km12, '12MIS PPM峰值'),
  ]
})

/* ========== 客户概览卡片（健康度矩阵） ========== */
const statusColor = (s) => s === 'success' ? 'text-green' : (s === 'warning' ? 'text-orange' : (s === 'danger' ? 'text-red' : 'text-blue'))

/** 0KM PPM sparkline（SVG 折线，归一化到 100×26 视口） */
function sparkOf(cust) {
  if (!cust) return { points: '0,24 100,24', color: 'success' }
  const field = cust.isM6 ? 'ppmApp' : 'actual0km'
  const labels = [...(cust.months || []), ...(cust.weeks || []).filter(w => /WK\d+/.test(w))]
  const m = cust.metrics[field]
  const vals = labels.map(l => Number(m?.values?.[l] ?? 0))
  const max = Math.max(...vals, 1)
  const n = vals.length
  const pts = n === 0
    ? '0,24 100,24'
    : vals.map((v, i) => `${n === 1 ? 50 : (i / (n - 1)) * 100},${24 - (v / max) * 20}`).join(' ')
  const target = cust.kpi.km0.target || 0
  const last = vals[vals.length - 1] || 0
  const color = target && last > target ? 'danger' : (target && last > target * 0.5 ? 'warning' : 'success')
  return { points: pts, color }
}

function buildACard(c) {
  const k = c.kpi
  const risk = riskOf(c.key)
  const periods = c.isM6 ? ['km0', 'km3'] : ['km0', 'km3', 'km6', 'km12']
  const metrics = periods.map(pk => {
    const item = k[pk]
    const lbl = c.isM6 ? item.label : ({ km0: '0KM PPM', km3: '3MIS PPM', km6: '6MIS PPM', km12: '12MIS PPM' }[pk])
    const over = item.target && item.ppm > item.target
    const value = item.ppm <= 0
      ? '0 达标'
      : `${fmt(item.ppm)}${item.peakWeek ? ' (' + item.peakWeek + ')' : ''}${!over ? ' 达标' : ''}`
    return { label: lbl, value, colorClass: over ? 'text-red' : statusColor(item.status) }
  })
  const spark = sparkOf(c)
  return {
    key: c.key,
    name: c.meta.name,
    riskLevel: risk.level,
    riskText: `${risk.text} · ${risk.score}分`,
    metrics,
    passRate: c.passRate,
    ringColor: risk.level,
    sparkPoints: spark.points,
    sparkColor: spark.color,
    remark: `${c.passRate}% 周期达标${risk.level !== 'success' ? '，存在超标周期需关注' : '，整体表现稳定'}`,
  }
}

const overviewCards = computed(() => {
  if (!insight.value) return []
  const cards = [a1.value, a2.value, a3.value].filter(Boolean).map(c => buildACard(c))
  // A4 合并卡（M5 + M6）：风险分 = 两者均值
  if (m5.value && m6.value) {
    const base = buildACard(m5.value)
    const s5 = riskOf('M5').score, s6 = riskOf('M6').score
    const avg = Math.round((s5 + s6) / 2)
    const lv = riskLevelOf(avg)
    const passRate = Math.round((m5.value.passRate + m6.value.passRate) / 2)
    cards.push({
      ...base,
      key: 'A4',
      name: 'A4客户',
      riskLevel: lv.level,
      riskText: `${lv.text} · ${avg}分`,
      ringColor: lv.level,
      metrics: [
        { label: 'M5 0KM PPM峰值', value: `${fmt(m5.value.kpi.km0.ppm)}${m5.value.kpi.km0.peakWeek ? ' (' + m5.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m5.value.kpi.km0.status === 'success' ? 'text-green' : 'text-orange' },
        { label: 'M6 外观PPM峰值', value: `${fmt(m6.value.kpi.km0.ppm)}${m6.value.kpi.km0.peakWeek ? ' (' + m6.value.kpi.km0.peakWeek + ')' : ''}`, colorClass: m6.value.kpi.km0.status === 'success' ? 'text-green' : 'text-red' },
        { label: 'M6 性能PPM峰值', value: `${fmt(m6.value.kpi.km3.ppm)}${m6.value.kpi.km3.status === 'success' ? ' 达标' : ''}`, colorClass: m6.value.kpi.km3.status === 'success' ? 'text-green' : 'text-red' },
      ],
      passRate,
      remark: `M5达标率${m5.value.passRate}% · M6达标率${m6.value.passRate}%（合并均值${passRate}%）`,
    })
  }
  return cards
})

/** 达标率环形（conic-gradient，颜色随风险等级） */
function ringStyle(c) {
  const color = `var(--color-${c.ringColor === 'danger' ? 'danger' : c.ringColor})`
  return { background: `conic-gradient(${color} ${c.passRate}%, var(--color-bg-soft) 0)` }
}

const m6PeakDelivery = computed(() => {
  if (!m6.value) return { value: 0, week: '' }
  let max = 0, mw = ''
  const d = m6.value.metrics.delivery?.values || {}
  Object.keys(d).forEach(w => { if (Number(d[w]) > max) { max = Number(d[w]); mw = w } })
  return { value: max, week: mw }
})

/* ========== 图表通用底座（BaseChart 自动解析 var() 与主题重绘） ========== */
function chartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: chartC.textMuted },
    legend: legendStyle(),
    grid: gridStyle(),
    tooltip: tooltipStyle({ trigger: 'axis' }),
  }
}

/* ========== 总览：0KM 趋势对比（时间轴由数据推导，不再写死） ========== */
const overviewTrendOption = computed(() => {
  const list = [a1.value, a2.value, a3.value, m5.value].filter(Boolean)
  if (!list.length || !m6.value) return {}
  // 月份取各客户并集（保持时间顺序），周取最近 5 个
  const months = [...new Set(list.flatMap(c => c.months || []))]
  const weeks = [...new Set(list.flatMap(c => c.weeks || []))].slice(-5)
  const labels = [...months, ...weeks]
  const seriesOf = (cust, field) => labels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
  const mk = (name, data) => ({ name, type: 'line', data, smooth: true, symbol: 'circle', symbolSize: 6 })
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['A1', 'A2', 'A3', 'M5-XP', 'M6-XM外观'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: labels },
    yAxis: { ...valueAxisStyle(), type: 'value', name: 'PPM' },
    series: [
      mk('A1', seriesOf(a1.value, 'actual0km')),
      mk('A2', seriesOf(a2.value, 'actual0km')),
      mk('A3', seriesOf(a3.value, 'actual0km')),
      mk('M5-XP', seriesOf(m5.value, 'actual0km')),
      mk('M6-XM外观', seriesOf(m6.value, 'ppmApp')),
    ],
  }
})

/* ========== 总览：雷达图（各维度得分由目标/实际实时计算） ========== */
const overviewRadarOption = computed(() => {
  if (!insight.value || !a1.value) return {}
  const { radarOf, radarIndicators } = insight.value
  const mk = (name, cust) => ({ value: radarOf(cust), name, areaStyle: { opacity: 0.1 } })
  return {
    ...chartTheme(),
    tooltip: tooltipStyle({ trigger: 'item' }),
    legend: legendStyle({ data: ['A1', 'A2', 'A3', 'A4'], top: 0 }),
    radar: {
      indicator: radarIndicators,
      axisName: { color: chartC.textMuted },
      splitArea: { areaStyle: { color: ['color-mix(in srgb, var(--color-primary) 2%, transparent)', 'color-mix(in srgb, var(--color-primary) 5%, transparent)'] } },
      axisLine: { lineStyle: { color: chartC.axisLine } },
    },
    series: [{
      type: 'radar',
      data: [
        mk('A1', a1.value),
        mk('A2', a2.value),
        mk('A3', a3.value),
        mk('A4', m5.value),
      ].filter(d => d.value),
    }],
  }
})

/* ========== A 型详情：四周期图表（时间窗口可切换，纵轴上限由数据计算） ========== */

function periodOption(cust, pKey) {
  const f = PERIOD_FIELD[pKey]
  const allLabels = windowLabels(cust, timeWindow.value)
  const get = (field) => allLabels.map(l => Number(cust.metrics[field]?.values[l] ?? 0))
  const supplyArr = get(f.supply)
  const failArr = get(f.fail)
  const targetArr = allLabels.map(l => Number(cust.metrics[f.target]?.values[l] ?? f.targetDefault))
  const actualArr = get(f.actual)
  const peak = Math.max(...actualArr, ...targetArr, 1)
  const rotate = allLabels.length > 14 ? 45 : 0
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['供货数', '故障数', `${f.label}目标`, `${f.label}实际`], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: allLabels, axisLabel: { ...axisStyle().axisLabel, rotate, fontSize: 9 } },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '供货数', type: 'bar', data: supplyArr, yAxisIndex: 0, itemStyle: { color: chartC.primary } },
      { name: '故障数', type: 'bar', data: failArr, yAxisIndex: 0, itemStyle: { color: chartC.danger } },
      { name: `${f.label}目标`, type: 'line', data: targetArr, yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
      { name: `${f.label}实际`, type: 'line', data: actualArr, yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 6,
        markPoint: highlightMark(cust.key, pKey, allLabels, actualArr) },
    ],
  }
}

/* ========== A 型详情表格 ========== */
function takeRecentWeeks(cust, n = 5) {
  return (cust.weeks || []).filter(w => /WK\d+/.test(w)).slice(-n)
}
function detailWeeks(cust) {
  return takeRecentWeeks(cust, 5)
}
/** 每个周期两行：PPM 实际（带目标/状态判定）+ 故障数 */
function detailRows(cust) {
  if (!cust) return []
  const wks = detailWeeks(cust)
  const getM = (key) => cust.metrics[key]?.values || {}
  const periods = [
    { name: '0KM',  actual: 'actual0km',  fail: 'fail',    target: cust.kpi.km0.target || 24 },
    { name: '3MIS', actual: 'actual3m',   fail: 'fail3m',  target: cust.kpi.km3.target || 5 },
    { name: '6MIS', actual: 'actual6m',   fail: 'fail6m',  target: cust.kpi.km6.target || 300 },
    { name: '12MIS',actual: 'actual12m',  fail: 'fail12m', target: cust.kpi.km12.target || 105 },
  ]
  const rows = []
  for (const p of periods) {
    const ppmWeekly = wks.map(w => Number(getM(p.actual)[w] ?? 0))
    const overCount = ppmWeekly.filter(v => v > p.target).length
    rows.push({ name: `${p.name}-实际PPM`, weekly: ppmWeekly, target: p.target, isPpm: true,
      status: overCount ? 'danger' : 'success', statusText: overCount ? `超标${overCount}周` : '达标' })
    const failWeekly = wks.map(w => Number(getM(p.fail)[w] ?? 0))
    const failTotal = failWeekly.reduce((a, b) => a + b, 0)
    rows.push({ name: `${p.name}-故障数`, weekly: failWeekly, target: '—', isPpm: false,
      status: 'primary', statusText: failTotal ? `共${failTotal}例` : '—' })
  }
  return rows
}
/** 单元格配色：PPM 行按 目标/实际 分档，故障行非零标红 */
function valColor(row, v) {
  const n = Number(v) || 0
  if (!row.isPpm) return n > 0 ? 'text-red font' : ''
  if (n > row.target) return 'text-red font'
  if (n > row.target * 0.5) return 'text-orange'
  if (n > 0) return 'text-green'
  return ''
}
function formatVal(v) { return fmt(v) }

/* ========== M5 详情 ========== */
const m5ChartOption = computed(() => {
  if (!m5.value) return {}
  const mm = m5.value.metrics
  const target = m5.value.kpi.km0.target || 15
  const periods = windowLabels(m5.value, timeWindow.value)
  const get = (k) => periods.map(p => Number(mm[k]?.values[p] ?? 0))
  const peak = Math.max(...get('actual0km'), target, 1)
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['供货数', '故障数', '0KM目标', '0KM实际'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: periods },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '供货数', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '供货数', type: 'bar', data: get('supply'), yAxisIndex: 0, itemStyle: { color: chartC.primary } },
      { name: '故障数', type: 'bar', data: get('fail'), yAxisIndex: 0, itemStyle: { color: chartC.danger } },
      { name: '0KM目标', type: 'line', data: periods.map(() => target), yAxisIndex: 1, lineStyle: { color: chartC.primaryL, width: 2 }, symbol: 'none' },
      { name: '0KM实际', type: 'line', data: get('actual0km'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8,
        markPoint: highlightMark('M5', 'km0', periods, get('actual0km')) },
    ],
  }
})

const m5Rows = computed(() => {
  if (!m5.value) return []
  const rows = []
  const winTarget = m5.value.kpi.km0.target || 15
  const periods = [
    { key: (m5.value.months || []).slice(-1)[0] || '—', type: 'month' },
    ...takeRecentWeeks(m5.value, 5).map(w => ({ key: w, type: 'week' })),
  ]
  const m = m5.value.metrics
  periods.forEach(p => {
    const fail = m.fail.values[p.key] ?? 0
    const supply = m.supply.values[p.key] ?? 0
    const ppm = m.actual0km.values[p.key] ?? 0
    const target = Number(m.target0km.values[p.key] ?? winTarget) || winTarget
    const over = ppm > target
    rows.push({
      period: p.key, fail, supply, ppm: fmt(ppm), target,
      ppmColor: over ? (ppm >= target * 15 ? 'text-red font' : 'text-orange') : 'text-green',
      status: over ? 'fail' : 'pass', statusText: over ? '超标' : '达标',
    })
  })
  return rows
})

/* ========== M6 详情 ========== */
const m6ChartOption = computed(() => {
  if (!m6.value) return {}
  const labels = windowLabels(m6.value, timeWindow.value)
  const mm = m6.value.metrics
  const get = (k) => labels.map(l => Number(mm[k]?.values[l] ?? 0))
  const tApp = m6.value.kpi.km0.target || 300
  const tPerf = m6.value.kpi.km3.target || 150
  const peak = Math.max(...get('ppmApp'), ...get('ppmPerf'), tApp, tPerf, 1)
  return {
    ...chartTheme(),
    legend: legendStyle({ data: ['周交付', 'PPM-外观', 'PPM-性能', '目标-外观', '目标-性能'], top: 0 }),
    xAxis: { ...axisStyle(), type: 'category', data: labels },
    yAxis: [
      { ...valueAxisStyle(), type: 'value', name: '交付量', position: 'left' },
      { ...valueAxisStyle(), type: 'value', name: 'PPM', position: 'right', max: Math.ceil(peak * 1.15) },
    ],
    series: [
      { name: '周交付', type: 'bar', data: get('delivery'), yAxisIndex: 0, itemStyle: { color: chartC.accent } },
      { name: 'PPM-外观', type: 'line', data: get('ppmApp'), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 2 }, symbolSize: 8,
        markPoint: highlightMark('M6', 'km0', labels, get('ppmApp')) },
      { name: 'PPM-性能', type: 'line', data: get('ppmPerf'), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 2 }, symbolSize: 8,
        markPoint: highlightMark('M6', 'km3', labels, get('ppmPerf')) },
      { name: '目标-外观', type: 'line', data: labels.map(() => tApp), yAxisIndex: 1, lineStyle: { color: chartC.danger, width: 1, type: 'dashed' }, symbol: 'none' },
      { name: '目标-性能', type: 'line', data: labels.map(() => tPerf), yAxisIndex: 1, lineStyle: { color: chartC.warning, width: 1, type: 'dashed' }, symbol: 'none' },
    ],
  }
})

const m6TableHeaders = computed(() => {
  if (!m6.value) return []
  return [...(m6.value.months || []), ...(m6.value.weeks || [])]
})
const m6TableRows = computed(() => {
  if (!m6.value) return []
  const headers = m6TableHeaders.value
  const mm = m6.value.metrics
  const getV = (metric, h) => mm[metric]?.values[h] ?? 0
  const colorOf = (v, target) => {
    if (Number(v) === 0) return ''
    if (Number(v) > target) return 'text-red font'
    if (Number(v) > target * 0.5) return 'text-orange'
    return 'text-green'
  }
  const targetApp = m6.value.kpi.km0.target || 300
  const targetPerf = m6.value.kpi.km3.target || 150
  return [
    { name: '0KM-外观故障数', values: headers.map(h => getV('failApp', h)), color: headers.map(h => Number(getV('failApp', h)) > 0 ? 'text-red' : '') },
    { name: '0KM-性能故障数', values: headers.map(h => getV('failPerf', h)), color: headers.map(h => Number(getV('failPerf', h)) > 0 ? 'text-red' : '') },
    { name: '周交付量', values: headers.map(h => getV('delivery', h)), color: headers.map(() => 'text-blue font') },
    { name: '外观PPM', values: headers.map(h => fmt(getV('ppmApp', h))), color: headers.map(h => colorOf(getV('ppmApp', h), targetApp)) },
    { name: '性能PPM', values: headers.map(h => fmt(getV('ppmPerf', h))), color: headers.map(h => colorOf(getV('ppmPerf', h), targetPerf)) },
  ]
})

/* ========== 问题分析页图表（数据由规则引擎产出，颜色随主题调色板） ========== */
const issueTypeOption = computed(() => {
  const dist = insight.value?.issueTypeDist || []
  // 0KM异常/MIS趋势用语义色（超标/预警），其余类型走主题调色板（各主题自动适配）
  const palette = chartPalette()
  const colorOf = (name, i) => {
    if (name === '0KM异常') return chartC.danger
    if (name === 'MIS趋势') return chartC.warning
    return palette[(i + 2) % palette.length]
  }
  return {
    ...chartTheme(),
    tooltip: tooltipStyle({ trigger: 'item' }),
    series: [{
      type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: chartC.cardBg, borderWidth: 2 },
      label: { show: true, formatter: '{b}: {d}%', color: chartC.textMuted, fontSize: 11 },
      data: dist.map((d, i) => ({ ...d, itemStyle: { color: colorOf(d.name, i) } })),
    }],
  }
})

const riskScoreOption = computed(() => {
  const scores = [...(insight.value?.riskScores || [])].sort((a, b) => a.score - b.score)
  // 语义色取色（勿用 primary-light：gov-red 主题下 primary-light 为红色，达标会显示成红条）
  const colorOf = (level) => level === 'success' ? chartC.success : (level === 'warning' ? chartC.warning : chartC.danger)
  return {
    ...chartTheme(),
    tooltip: tooltipStyle(),
    grid: { left: '5%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { ...valueAxisStyle(), type: 'value', max: 100, axisLabel: { ...valueAxisStyle().axisLabel, formatter: '{value}分' } },
    yAxis: { ...axisStyle(), type: 'category', data: scores.map(s => s.name) },
    series: [{
      type: 'bar', barWidth: 20,
      label: { show: true, position: 'right', formatter: '{c}分', color: chartC.textMuted },
      data: scores.map(s => ({ value: s.score, itemStyle: { color: colorOf(s.level), borderRadius: [0, 3, 3, 0] } })),
    }],
  }
})

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

/* ========== 加载 ========== */
onMounted(async () => {
  try {
    loading.value = true
    const d = await loadPackData()
    Object.assign(packData, d)
  } catch (e) {
    console.error(e)
    loadError.value = e.message || '未知错误'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss';

.pack-screen {
  padding: $spacing-md;
  background: transparent;
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ============ 主Tab ============ */
.pack-main-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
}
.pack-tab-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-weight: 600;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all .25s;
  box-shadow: var(--shadow-card);
  font-family: inherit;
  .icon { margin-right: 6px; }
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
.rotate-btn {
  margin-left: auto;
  &.active {
    animation: rotatePulse 2s ease-in-out infinite;
  }
}
@keyframes rotatePulse {
  0%, 100% { box-shadow: var(--shadow-card); }
  50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent); }
}
.pack-content { min-height: 0; flex: 1; display: flex; flex-direction: column; }
.pack-tab-panel { animation: fadeIn .4s ease; }
/* 总览面板：纵向填满剩余高度，图表区自适应拉伸 */
.pack-tab-panel--overview {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  .pack-kpi-row {
    flex-shrink: 0;
    height: 88px;
    margin-bottom: $spacing-md;
  }
  .pack-client-grid { flex-shrink: 0; margin-bottom: $spacing-md; }
  .pack-chart-grid {
    flex: 1;
    min-height: 320px;
  }
  .pack-chart-card {
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.screen-card__body) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .chart-box-h300 {
      height: auto;
      flex: 1;
      min-height: 260px;
    }
  }
}
@keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
.p-loading { padding: 40px; text-align: center; color: var(--color-text-secondary); }

/* ============ KPI 行 ============ */
.pack-kpi-row :deep(.stat-card) {
  height: 100%;
}

.text-green  { color: var(--color-success); }
.text-orange { color: var(--color-warning); }
.text-red    { color: var(--color-danger); }
.text-blue   { color: var(--color-primary); }
.font        { font-weight: 600; }

/* ============ 客户概览卡片 ============ */
.pack-client-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: $spacing-md;
  @media (max-width: 1100px) { grid-template-columns: repeat(2,1fr); }
}
.pack-client-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  cursor: pointer;
  transition: all .25s;
  box-shadow: var(--shadow-card);
  &:hover { transform: scale(1.01); border-color: var(--color-primary); }
  &.selected { border-color: var(--color-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent); }
}
.cc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-md; }
.cc-name { font-size: $font-lg; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.cc-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
}
.cc-metrics { display: flex; flex-direction: column; gap: $spacing-xs; flex: 1; min-width: 0; }
.cc-row { display: flex; justify-content: space-between; font-size: $font-sm; }
.cc-label { color: var(--color-text-secondary); }
.cc-val { font-weight: 600; }
/* 达标率环形（conic-gradient 由 ringStyle() 内联注入，颜色随风险等级） */
.cc-ring {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transform: rotate(-90deg);
}
.cc-ring-hole {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(90deg);
}
.cc-ring-num { font-size: 13px; font-weight: 700; line-height: 1.1; color: var(--color-text-primary); }
.cc-ring-label { font-size: 9px; color: var(--text-muted); line-height: 1.2; }
/* 0KM PPM sparkline 迷你趋势 */
.cc-spark { margin-top: $spacing-sm; }
.cc-spark-svg { width: 100%; height: 26px; display: block; }
.cc-spark-label { font-size: $font-xs; color: var(--text-muted); margin-top: 2px; display: block; }
.cc-remark { font-size: $font-xs; color: var(--text-muted); margin-top: $spacing-xs; }

/* ============ 图表卡片 ============ */
.pack-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: $spacing-md;
}
.pack-chart-card {
  background: var(--color-bg-card);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  box-shadow: var(--shadow-card);
  &.mb { margin-bottom: $spacing-md; }
}
.chart-title {
  font-size: $font-md;
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex; align-items: center; gap: $spacing-sm;
}
.chart-sub { font-size: $font-xs; color: var(--text-muted); font-weight: 400; }
.chart-bar { width: 4px; height: 20px; background: linear-gradient(180deg,var(--color-primary),var(--color-accent)); border-radius: 2px; display: inline-block; }
.chart-box-h300 { height: 300px; }
.chart-box-h280 { height: 280px; }
.chart-box-h250 { height: 228px; }
.chart-box-h240 { height: 224px; }

/* ============ 客户详情Tab ============ */
.pack-client-tabs {
  display: flex; gap: $spacing-sm; margin-bottom: $spacing-md; flex-wrap: wrap; align-items: center;
}
.client-tab-btn {
  padding: $spacing-sm $spacing-lg;
  border-radius: $radius-lg;
  font-weight: 600;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all .25s;
  font-family: inherit;
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: linear-gradient(90deg,var(--color-primary),var(--color-accent));
    color: #fff;
    border-color: transparent;
  }
}
/* 时间窗口切换（近4周/近12周/月度/全部） */
.pack-window-tabs {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}
.window-label { font-size: $font-xs; color: var(--text-muted); margin-right: 4px; }
.window-tab-btn {
  padding: 4px 12px;
  border-radius: $radius-md;
  font-size: $font-sm;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all .2s;
  font-family: inherit;
  &:hover { background: var(--color-bg-hover); }
  &.active {
    background: var(--color-primary);
    color: #fff;
    border-color: transparent;
  }
}
.pack-detail-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-card);
}
.detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-md; }
.detail-title { font-size: $font-lg; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.detail-chart-grid {
  display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-md;
}
.detail-chart-grid--wide { display: grid; grid-template-columns: 1fr; gap: $spacing-md; }
.detail-chart-block {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: $radius-lg;
  padding: $spacing-sm $spacing-md;
  box-shadow: var(--shadow-card);
  &.full { grid-column: 1/-1; }
}
.detail-sub-title {
  font-size: $font-md; font-weight: 600; color: var(--color-primary);
  margin: 0;
}
.detail-table-wrap { margin-top: $spacing-md; overflow: auto; max-height: 186px; border-radius: $radius-md; }
.pack-data-table {
  width: 100%; border-collapse: collapse;
  th { position: sticky; top: 0; z-index: 1; background: var(--color-bg-soft); padding: 10px 8px; text-align: center; font-weight: 600; font-size: $font-sm; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); }
  td { padding: 8px; text-align: center; font-size: $font-sm; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border-light); }
  tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
  tr:hover td { background: var(--color-bg-hover); }
  td.tl { text-align: left; color: var(--color-text-primary); font-weight: 600; }
}
/* 状态胶囊（达标/超标/统计） */
.cc-status {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: $font-xs;
  font-weight: 600;
  white-space: nowrap;
  &.status-success, &.status-pass { background: var(--color-success-bg); color: var(--color-success); }
  &.status-warning { background: var(--color-warning-bg); color: var(--color-warning); }
  &.status-danger, &.status-fail { background: var(--color-danger-bg); color: var(--color-danger); }
  &.status-primary { background: var(--color-info-bg); color: var(--color-primary); }
}

/* M6 指标块 */
.m6-metrics { display: flex; flex-direction: column; gap: $spacing-md; padding-top: $spacing-sm; }
.m6-metric-item {
  padding: $spacing-md; background: var(--color-bg-soft); border: 1px solid var(--color-border); border-radius: $radius-md;
}
.m6-m-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: $spacing-xs; color: var(--color-text-primary); font-size: $font-sm; }
.m6-val { font-weight: 700; font-size: $font-xl; }
.m6-bar { height: 8px; background: var(--color-bg-soft); border-radius: 99px; overflow: hidden; }
.m6-bar-fill { height: 100%; border-radius: 99px;
  &.bar-red   { background: var(--color-danger); }
  &.bar-green { background: var(--color-success); }
  &.bar-blue  { background: var(--color-primary); }
}
.m6-sub { font-size: $font-xs; color: var(--text-muted); margin-top: $spacing-xs; }

.detail-note {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  border-radius: $radius-md;
  border: 1px solid;
  &.note-blue   { background: var(--color-info-bg);  border-color: var(--color-primary);  h4 { color: var(--color-primary); } }
  &.note-yellow { background: var(--color-warning-bg);  border-color: var(--color-warning);  h4 { color: var(--color-warning); } }
  &.note-green  { background: var(--color-success-bg); border-color: var(--color-success); h4 { color: var(--color-success); } }
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; }
  p, li { color: var(--color-text-primary); font-size: $font-sm; line-height: 1.6; margin: 0 0 $spacing-xs 0; }
  ul { padding-left: $spacing-md; margin: 0; }
}

/* ============ 问题分析 ============ */
.pack-tab-panel--issues {
  flex: 1;
  min-height: 0;
  display: flex;
}
.pack-issues-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 2fr 1fr; gap: $spacing-md; }
.issues-left, .issues-right { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.issues-left .pack-chart-card, .issues-right .pack-chart-card { padding: $spacing-sm $spacing-md; height: auto; flex-shrink: 0; }
/* 问题汇总卡占满左栏剩余高度，条目列表内部滚动（ScreenCard body overflow:hidden 需要显式高度链） */
.issues-left > .pack-chart-card:first-child { flex: 1 1 auto; min-height: 0; }
.issues-left > .pack-chart-card:first-child .issue-list { overflow-y: auto; }
.section-title { font-size: $font-lg; font-weight: 700; color: var(--color-text-primary); margin: 0; display: flex; align-items: center; gap: $spacing-sm;
  &.sm { font-size: $font-md; }
}
.issue-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.issue-item {
  border-left: 3px solid var(--color-warning);
  border-radius: 0 $radius-md $radius-md 0;
  transition: all .25s;
  padding: $spacing-xs 0 $spacing-xs $spacing-md;
  &:hover { background: var(--color-bg-hover); }
  &--danger {
    border-left-color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  }
  &--warning {
    border-left-color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 6%, transparent);
  }
  &--info {
    border-left-color: var(--color-info, var(--color-primary));
    background: color-mix(in srgb, var(--color-info, var(--color-primary)) 6%, transparent);
  }
  &--click { cursor: pointer; }
  &--click:hover {
    background: var(--color-bg-hover);
    transform: translateX(4px);
    .issue-locate { opacity: 1; }
  }
}
.issue-locate {
  color: var(--color-primary);
  font-weight: 600;
  opacity: 0;
  transition: opacity .2s;
  margin-left: $spacing-sm;
}
.issue-empty { padding: $spacing-lg 0; text-align: center; color: var(--text-muted); font-size: $font-sm; }
.issue-head { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.issue-head h4 { margin: 0; font-weight: 700; color: var(--color-text-primary); font-size: $font-md; }
.issue-desc { color: var(--color-text-primary); font-size: $font-sm; margin: 0 0 $spacing-xs 0; line-height: 1.5; }
.issue-meta { color: var(--text-muted); font-size: $font-xs; margin: 0; }

.conclude-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: $spacing-md; }
.conclude-card {
  padding: $spacing-md; border-radius: $radius-md; background: var(--color-bg-soft); border-left: 4px solid;
  h4 { font-weight: 700; margin: 0 0 $spacing-xs 0; font-size: $font-md; display: flex; align-items: center; gap: $spacing-sm; }
  p { color: var(--color-text-primary); font-size: $font-sm; margin: 0; line-height: 1.5; }
  &.border-green  { border-left-color: var(--color-success); h4 { color: var(--color-success); } }
  &.border-orange { border-left-color: var(--color-warning); h4 { color: var(--color-warning); } }
  &.border-red    { border-left-color: var(--color-danger); h4 { color: var(--color-danger); } }
  &.border-blue   { border-left-color: var(--color-primary); h4 { color: var(--color-primary); } }
}
.conclude-score { font-size: $font-xs; font-weight: 600; color: var(--text-muted); }

.issues-right .pack-chart-card.mb { margin-bottom: $spacing-sm; }
.suggest-list { display: flex; flex-direction: column; gap: $spacing-xs; }
.suggest-item { display: flex; gap: $spacing-sm; align-items: flex-start; font-size: $font-sm; color: var(--color-text-primary); }
.suggest-no {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: $font-sm;
  &.no-red    { background: var(--color-danger-bg); color: var(--color-danger); }
  &.no-orange { background: var(--color-warning-bg); color: var(--color-warning); }
  &.no-blue   { background: var(--color-info-bg); color: var(--color-primary); }
  &.no-green  { background: var(--color-success-bg); color: var(--color-success); }
}

@media (max-width: 1100px) {
  .pack-chart-grid, .pack-issues-grid, .conclude-grid { grid-template-columns: 1fr; }
  .detail-chart-grid { grid-template-columns: 1fr; }
}
</style>
