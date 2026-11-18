<template>
  <div class="home-screen">
    <!-- 顶部标题栏 -->
    <ScreenHeader title="LPA" />
    <div v-if="loading" class="data-loading">数据加载中...</div>
    <template v-else>
      LPA
      <div
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
        <StatCard theme="kpi-side" status="success" title="本周CPK达标率" sub-title="CW44周度" value="98.7" unit="%"
          trend="1.3pp" trend-type="down" trend-label="较上周" badge="达标">
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="M18 17l-5-5-4 4-3-3"></path>
            </svg>
          </template>
        </StatCard>
        <StatCard theme="kpi-side" status="primary" title="累计CPK项目" sub-title="本周覆盖" value="153" unit="项" trend="8项"
          trend-type="up" trend-label="较上周">
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M7 7h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 17h6"></path>
            </svg>
          </template>
        </StatCard>
        <img v-if="img_src" :src="img_src" style="max-width:300px">


      </div>
    </template>
    <!-- 主体内容区 -->

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ScreenHeader from '@/components/layout/ScreenHeader.vue'
import { useLazyLoad } from '@/composables/useLazyLoad'
import StatCard from '@/components/common/NewStatCard.vue'

import { loadData } from '@/utils/dataLoader.js'
import {
  getRowsFromSheet,
  indexSheet,
  getCell,
  cellText,
  getRange,
  cellOfRow,
  toGrid,
  getImgPath,
  hasData,
  rightMostFilledCol,
  latestFilledCols,
} from '@/utils/getDataFromJson.js'

// ============ 指标数据 ============
const metricsData = ref([
  { label: '累计访问量', value: 128569, suffix: '', trend: 12.5 },
  { label: '今日订单', value: 3862, suffix: '单', trend: 8.2 },
  { label: '总交易额', value: 8965.3, suffix: '万', trend: 15.6 },
  { label: '活跃用户', value: 28956, suffix: '人', trend: -2.3 }
])

const loading = ref(true)
const img_src = ref('')
let LPAData = null

  // 异步加载 LPA 数据（不再打进组件 chunk）
  ; (async () => {
    const lpaJson = await loadData('lpa')
    LPAData = indexSheet(lpaJson.sheets[0]);
    console.log('LPAData....', LPAData)
    console.log(getCell(LPAData, 8, 10))
    // console.log(getRange(LPAData, 6, 4, 10, 20))
    console.log(LPAData.colByName['日期'])
    console.log(LPAData.colByName['问题图片'])
    // 获取图片真实地址
    console.log(getImgPath(LPAData, LPAData.colByName['问题图片'][1]?.[0]))
    console.log(getImgPath(LPAData, 'img_9'))

    // ============ 指标数据 ============
    img_src.value = getImgPath(LPAData, LPAData.colByName['问题图片'][1]?.[0])
    loading.value = false
  })()
</script>

<style scoped lang="scss">
.home-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

}

.data-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: $font-md;
  padding: 80px 0;
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
