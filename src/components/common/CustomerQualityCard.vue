<template>
  <div class="customer-card" :class="[`status-${status}`]">
    <!-- 头部：客户名称 + 状态标签 -->
    <div class="card-header">
      <span class="customer-name">{{ title }}</span>
      <span class="status-tag" :class="`tag-${status}`">{{ displayStatusText }}</span>
    </div>

    <!-- 内容区：自动根据 layout 切换 -->
    <div class="card-body">
      <!-- 标准PPM周期布局 -->
      <template v-if="layout === 'standard'">
        <div class="metric-row" v-for="(item, idx) in metrics" :key="idx">
          <span class="metric-label">{{ item.label }}</span>
          <span class="metric-value" :class="{ highlight: item.highlight }">
            {{ item.value }}
            <span v-if="item.extra" class="metric-extra">{{ item.extra }}</span>
          </span>
        </div>
      </template>

      <!-- 多项目自定义布局 -->
      <template v-else-if="layout === 'multi'">
        <div class="metric-section" v-for="(section, sIdx) in sections" :key="sIdx">
          <div v-if="section.title" class="section-title">{{ section.title }}</div>
          <div class="metric-row" v-for="(item, idx) in section.items" :key="idx">
            <span class="metric-label">{{ item.label }}</span>
            <span class="metric-value" :class="{ highlight: item.highlight }">
              {{ item.value }}
              <span v-if="item.extra" class="metric-extra">{{ item.extra }}</span>
            </span>
          </div>
        </div>
      </template>

      <!-- 进度条 -->
      <div class="progress-wrapper" v-if="progress !== null && progress !== undefined">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 底部备注 -->
    <div class="card-footer" v-if="remark">
      <span class="remark-text">{{ remark }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 客户/项目标题
  title: {
    type: String,
    required: true
  },
  // 状态：'attention' | 'warning' | 'success' | 'custom'
  status: {
    type: String,
    default: 'success',
    validator: (v) => ['attention', 'warning', 'success', 'custom'].includes(v)
  },
  // 状态标签文字，默认根据 status 自动生成
  statusText: {
    type: String,
    default: ''
  },
  // 布局模式：'standard' 标准PPM周期 | 'multi' 多项目自定义
  layout: {
    type: String,
    default: 'standard',
    validator: (v) => ['standard', 'multi'].includes(v)
  },
  // 标准布局指标数组：[{ label, value, extra, highlight }]
  metrics: {
    type: Array,
    default: () => []
  },
  // 多项目布局分组：[{ title, items: [{ label, value, extra, highlight }] }]
  sections: {
    type: Array,
    default: () => []
  },
  // 达标率进度 0-100
  progress: {
    type: Number,
    default: null
  },
  // 底部备注文案
  remark: {
    type: String,
    default: ''
  },
  // 自定义主色（status='custom' 时生效），默认跟随主题主色
  customColor: {
    type: String,
    default: 'var(--color-primary)'
  }
})

// 自动生成状态文字（未显式传入 statusText 时按状态取默认文案）
const displayStatusText = computed(() => {
  if (props.statusText) return props.statusText
  const map = { attention: '关注', warning: '预警', success: '达标', custom: '自定义' }
  return map[props.status]
})
</script>

<style scoped>
/* 全部颜色取自全局主题变量（--color-*），随 <html data-theme> 自动切换 */
.customer-card {
  border-radius: 8px;
  padding: 16px 18px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-card);
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.customer-name {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
}
.metric-label {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.metric-value {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}
.metric-value.highlight {
  color: var(--status-color);
  font-weight: 700;
}
.metric-extra {
  color: var(--status-color);
  font-weight: 500;
  font-size: 12px;
  margin-left: 4px;
}
.section-title {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
  margin-bottom: 4px;
}
.progress-bar {
  background: var(--color-bg-soft);
}
.progress-fill {
  background: var(--status-color);
}
.remark-text {
  color: var(--color-text-muted);
  font-size: 12px;
}

/* ===== 状态色系（语义色取自主题） ===== */
/* 关注 */
.status-attention {
  --status-color: var(--color-primary);
}
/* 预警（加粗边框高亮） */
.status-warning {
  --status-color: var(--color-warning);
  border-color: var(--status-color);
  border-width: 2px;
}
/* 达标 */
.status-success {
  --status-color: var(--color-success);
}
/* 自定义 */
.status-custom {
  --status-color: v-bind('props.customColor');
}

.status-tag {
  background: color-mix(in srgb, var(--status-color) 12%, transparent);
  color: var(--status-color);
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

/* ===== 通用样式 ===== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  line-height: 1.6;
}

.progress-wrapper {
  margin-top: 10px;
  margin-bottom: 6px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.card-footer {
  margin-top: 8px;
  padding-top: 6px;
}

/* 卡片hover效果 */
.customer-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
</style>
