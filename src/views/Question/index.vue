<template>
  <div class="home-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="重大质量异常闭环率" />
    <div
      style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <StatCard v-for="(item, index) in totalKardData" :key="index" :theme="item.theme" :status="item.status"
        :title="item.title" :sub-title="item.subTitle" :value="item.value" :unit="item.unit" :trend="item.trend"
        :trend-type="item.trendType" :trend-label="item.trendLabel" :badge="item.badge" :icon-type="item.iconType">
      </StatCard>
    </div>
    <SummaryBar :type="summerBarData.primary" :content="summerBarData.content" :tags="summerBarData.tags" />
    <!-- 主体内容区 -->
    <div class="screen-content">
      <!-- 左侧区域 -->
      <div class="left-col">
        <!-- 指标卡片区 -->
        <div class="metrics-row">
          <div class="metric-card" v-for="(metric, i) in metricsData" :key="i">
            <ScreenCard :title="metric.label">
              <div class="metric-value">
                <NumberCounter :value="metric.value" :suffix="metric.suffix" />
              </div>
              <div class="metric-trend" :class="metric.trend > 0 ? 'up' : 'down'">
                较上期 {{ metric.trend > 0 ? '↑' : '↓' }} {{ Math.abs(metric.trend) }}%
              </div>
            </ScreenCard>
          </div>
        </div>

        <!-- 柱状图卡片 - 懒加载 -->
        <div class="chart-card" ref="barRef">
          <ScreenCard title="各区域业务数据统计">
            <BaseChart :option="barChartOption" v-if="barChartVisible" />
            <div v-else class="chart-placeholder">图表加载中...</div>
          </ScreenCard>
        </div>

        <!-- 滚动列表卡片 -->
        <div class="list-card">
          <ScreenCard title="实时数据排行">
            <MarqueeList :data="rankList" />
          </ScreenCard>
        </div>
      </div>

      <!-- 中间区域 -->
      <div class="center-col">
        <!-- 地图/大屏主视觉区域 -->
        <div class="main-chart-card">
          <ScreenCard title="全国业务分布概览">
            <div class="main-chart-placeholder">
              <div class="placeholder-text">中间地图/核心图表区域</div>
              <div class="placeholder-hint">可在此接入地图、3D可视化或核心业务图表</div>
            </div>
          </ScreenCard>
        </div>

        <!-- 下方折线图 - 懒加载 -->
        <div class="line-chart-card" ref="lineRef">
          <ScreenCard title="近7天趋势变化">
            <BaseChart :option="lineChartOption" v-if="lineChartVisible" />
            <div v-else class="chart-placeholder">图表加载中...</div>
          </ScreenCard>
        </div>
      </div>

      <!-- 右侧区域 -->
      <div class="right-col">
        <!-- 饼图卡片 - 懒加载 -->
        <div class="pie-card" ref="pieRef">
          <ScreenCard title="业务类型占比">
            <BaseChart :option="pieChartOption" v-if="pieChartVisible" />
            <div v-else class="chart-placeholder">图表加载中...</div>
          </ScreenCard>
        </div>

        <!-- 仪表盘卡片 - 懒加载 -->
        <div class="gauge-card" ref="gaugeRef">
          <ScreenCard title="目标完成率">
            <BaseChart :option="gaugeChartOption" v-if="gaugeChartVisible" />
            <div v-else class="chart-placeholder">图表加载中...</div>
          </ScreenCard>
        </div>

        <!-- 进度条卡片 -->
        <div class="progress-card">
          <ScreenCard title="各模块完成进度">
            <div class="progress-list">
              <div v-for="(item, i) in progressData" :key="i" class="progress-item">
                <div class="progress-label">{{ item.name }}</div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: item.value + '%' }"></div>
                </div>
                <div class="progress-value">{{ item.value }}%</div>
              </div>
            </div>
          </ScreenCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import ScreenCard from '@/components/common/ScreenCard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import NumberCounter from '@/components/data/NumberCounter.vue'
import MarqueeList from '@/components/data/MarqueeList.vue'
import { useLazyLoad } from '@/composables/useLazyLoad'
import StatCard from '@/components/common/NewStatCard.vue'
import SummaryBar from '@/components/common/SummaryBar.vue'

// ============ 指标数据 ============
const totalKardData = ref([
  {
    theme: 'kpi-top',
    status: 'success',
    title: '连续按期闭环率',
    subTitle: 'CW38—CW43 连续6周',
    value: 100,
    unit: '%',
  }, {
    theme: 'kpi-top',
    status: 'primary',
    title: '累计闭环重大异常',
    subTitle: '到期关闭=实际关闭',
    value: 153,
    unit: '项',
  }, {
    theme: 'kpi-top',
    status: 'warning',
    title: '本周新增大异常',
    subTitle: 'CW43 新增',
    value: 153,
    unit: '项',
  }, {
    theme: 'kpi-top',
    status: 'cyan',
    title: '超期未闭环',
    subTitle: '全部按期关闭',
    value: '2',
    unit: '项',
  },
  {
    theme: 'kpi-top',
    status: 'purple',
    title: '涉及范围',
    subTitle: '3 车间 · 5 线体',
    value: 'A3/M6',
  },
])
const summerBarData = ref({
  content: "<b>连续6周CPK达标率稳定在98.7%以上</b>,工序平均CPK1.68处于良好水平；本周仅A3-P2工序2项动态测试因样本量少CPK略低，其余8工序100%达标，过程能力整体稳定可控。",
  tags: [
    { text: '平均CPK 1.68', type: 'default' },
    { text: '8/9工序100%', type: 'default' },
    { text: '无重大风险', type: 'success' },
    { text: '下周补测A3-P2', type: 'info' }
  ]
})


// ============ 懒加载控制 ============
const { targetRef: barRef, isVisible: barChartVisible } = useLazyLoad()
const { targetRef: lineRef, isVisible: lineChartVisible } = useLazyLoad()
const { targetRef: pieRef, isVisible: pieChartVisible } = useLazyLoad()
const { targetRef: gaugeRef, isVisible: gaugeChartVisible } = useLazyLoad()

// ============ 示例图表配置 ============
// 柱状图配置
const barChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['华北', '华东', '华南', '华中', '西南', '西北', '东北'],
    axisLine: { lineStyle: { color: 'var(--color-border)' } },
    axisLabel: { color: 'var(--color-text-secondary)' }
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: 'var(--color-border)' } },
    axisLabel: { color: 'var(--color-text-secondary)' },
    splitLine: { lineStyle: { color: 'var(--color-border-light)' } }
  },
  series: [{
    data: [320, 482, 591, 354, 290, 210, 185],
    type: 'bar',
    barWidth: '40%',
    itemStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'var(--color-primary-light)' },
          { offset: 1, color: 'var(--color-primary-dark)' }
        ]
      },
      borderRadius: [4, 4, 0, 0]
    }
  }]
}))

// 折线图配置
const lineChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['访问量', '订单量'], textStyle: { color: 'var(--color-text-secondary)' } },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    axisLine: { lineStyle: { color: 'var(--color-border)' } },
    axisLabel: { color: 'var(--color-text-secondary)' }
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: 'var(--color-border)' } },
    axisLabel: { color: 'var(--color-text-secondary)' },
    splitLine: { lineStyle: { color: 'var(--color-border-light)' } }
  },
  series: [
    {
      name: '访问量',
      type: 'line',
      smooth: true,
      data: [1200, 1900, 1500, 2200, 2800, 3600, 3200],
      lineStyle: { color: 'var(--color-primary)', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(30, 111, 255, 0.3)' },
            { offset: 1, color: 'rgba(30, 111, 255, 0)' }
          ]
        }
      }
    },
    {
      name: '订单量',
      type: 'line',
      smooth: true,
      data: [820, 932, 901, 1234, 1490, 1830, 1620],
      lineStyle: { color: '#36cfc9', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(54, 207, 201, 0.3)' },
            { offset: 1, color: 'rgba(54, 207, 201, 0)' }
          ]
        }
      }
    }
  ]
}))

// 饼图配置
const pieChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    textStyle: { color: 'var(--color-text-secondary)' }
  },
  color: ['#1e6fff', '#00c6ff', '#36cfc9', '#ffc53d', '#ff7a45'],
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: 'var(--color-bg-card)', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: [
      { value: 1048, name: '产品A' },
      { value: 735, name: '产品B' },
      { value: 580, name: '产品C' },
      { value: 484, name: '产品D' },
      { value: 300, name: '其他' }
    ]
  }]
}))

// 仪表盘配置
const gaugeChartOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: 100,
    splitNumber: 5,
    itemStyle: { color: 'var(--color-primary)' },
    progress: { show: true, width: 18 },
    pointer: { show: false },
    axisLine: { lineStyle: { width: 18, color: [[1, 'var(--color-border-light)']] } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    title: { show: false },
    detail: {
      valueAnimation: true,
      offsetCenter: [0, '0%'],
      fontSize: 36,
      fontWeight: 'bold',
      color: 'var(--color-primary)',
      formatter: '{value}%'
    },
    data: [{ value: 76 }]
  }]
}))

// ============ 排行列表数据 ============
const rankList = ref([
  { name: '华东区销售一部', value: '¥1,286万' },
  { name: '华南区销售二部', value: '¥1,052万' },
  { name: '华北区销售一部', value: '¥968万' },
  { name: '西南区销售中心', value: '¥745万' },
  { name: '华中区销售三部', value: '¥692万' },
  { name: '西北区办事处', value: '¥428万' },
  { name: '东北区办事处', value: '¥356万' }
])

// ============ 进度条数据 ============
const progressData = ref([
  { name: '年度销售目标', value: 76 },
  { name: '新客户拓展', value: 89 },
  { name: '项目交付进度', value: 62 },
  { name: '售后服务满意度', value: 94 }
])
</script>

<style scoped lang="scss">
.home-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: $spacing-md;
  padding: $spacing-md;
  overflow: hidden;
}

.left-col,
.center-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  overflow: hidden;
}

// ============ 指标卡片 ============
.metrics-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
  flex-shrink: 0;
}

.metric-card {
  height: 120px;

  .metric-value {
    text-align: center;
    margin-bottom: $spacing-sm;
  }

  .metric-trend {
    text-align: center;
    font-size: $font-sm;

    &.up {
      color: #52c41a;
    }

    &.down {
      color: #ff4d4f;
    }
  }
}

// ============ 图表卡片高度分配 ============
.chart-card {
  height: 320px;
  flex-shrink: 0;
}

.list-card {
  flex: 1;
  min-height: 200px;
}

.main-chart-card {
  flex: 1;
  min-height: 400px;
}

.line-chart-card {
  height: 280px;
  flex-shrink: 0;
}

.pie-card {
  height: 280px;
  flex-shrink: 0;
}

.gauge-card {
  height: 260px;
  flex-shrink: 0;
}

.progress-card {
  flex: 1;
  min-height: 200px;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: $font-sm;
}

.main-chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  border: 2px dashed var(--color-border);
  border-radius: $radius-md;

  .placeholder-text {
    font-size: $font-lg;
    margin-bottom: $spacing-sm;
    color: var(--color-text-secondary);
  }

  .placeholder-hint {
    font-size: $font-sm;
  }
}

// ============ 进度条样式 ============
.progress-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-sm 0;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .progress-label {
    width: 110px;
    font-size: $font-sm;
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .progress-bar-bg {
    flex: 1;
    height: 8px;
    background: var(--color-border-light);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary-light));
    border-radius: 4px;
    transition: width 1s ease;
  }

  .progress-value {
    width: 45px;
    text-align: right;
    font-size: $font-sm;
    color: var(--color-primary);
    font-weight: 600;
    font-family: 'DIN Alternate', sans-serif;
    flex-shrink: 0;
  }
}
</style>
