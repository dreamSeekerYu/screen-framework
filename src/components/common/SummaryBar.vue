<template>
  <div
    class="summary-bar"
    :class="[
      `summary-bar--${type}`,
      { 'is-round': round, 'has-icon': showIcon }
    ]"
  >
    <!-- 左侧状态图标：支持预设选择 + 自定义插槽 -->
    <div v-if="showIcon" class="summary-bar__icon">
      <slot name="icon">
        <!-- 预设图标：check对勾 / info信息 / warning警告 / error错误 / success成功 / 数字类 -->
        <svg v-if="icon === 'check'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="icon === 'info'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="icon === 'warning'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64529 18.2972 1.55258 18.6415 1.55258 18.995C1.55258 19.3485 1.64529 19.6928 1.82 19.99C2.00056 20.284 2.25898 20.5167 2.566 20.6647C2.87302 20.8127 3.21632 20.87 3.56 20.87H20.44C20.7837 20.87 21.127 20.8127 21.434 20.6647C21.741 20.5167 21.9994 20.284 22.18 19.99C22.3547 19.6928 22.4474 19.3485 22.4474 18.995C22.4474 18.6415 22.3547 18.2972 22.18 18L13.71 3.86C13.5284 3.57042 13.2748 3.33677 12.9715 3.18113C12.6682 3.02549 12.325 2.95312 11.975 2.95312C11.625 2.95312 11.2818 3.02549 10.9785 3.18113C10.6752 3.33677 10.4216 3.57042 10.24 3.86V3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="icon === 'error'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="icon === 'success'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <!-- 默认对勾 -->
        <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </slot>
    </div>

    <!-- 中间内容区域 -->
    <div class="summary-bar__content">
      <slot>
        <span v-html="content"></span>
      </slot>
    </div>

    <!-- 右侧标签区域 -->
    <div class="summary-bar__tags">
      <slot name="tags">
        <StatusTag
          v-for="(tag, index) in tags"
          :key="index"
          :text="tag.text"
          :type="tag.type || 'info'"
          :effect="tag.effect || 'plain'"
          :size="tag.size || 'default'"
          :round="tag.round !== false"
        />
      </slot>
    </div>
  </div>
</template>

<script setup>
import StatusTag from './StatusTag.vue'

const props = defineProps({
  // 背景色系：primary(蓝)/success(绿)/info(青蓝)/warning(橙)/danger(红)
  type: {
    type: String,
    default: 'info',
    validator: (val) => ['primary', 'success', 'info', 'warning', 'danger'].includes(val)
  },
  // 预设图标：check(对勾)/info(信息)/warning(警告)/error(错误)/success(成功)
  icon: {
    type: String,
    default: 'check',
    validator: (val) => ['check', 'info', 'warning', 'error', 'success'].includes(val)
  },
  // 中间正文内容（支持HTML，用于高亮数字/关键词）
  content: {
    type: String,
    default: ''
  },
  // 右侧标签配置数组，示例：[{text: '100%按期闭环', type: 'success', effect: 'plain'}]
  tags: {
    type: Array,
    default: () => []
  },
  // 是否显示左侧图标
  showIcon: {
    type: Boolean,
    default: true
  },
  // 是否圆角样式
  round: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: 14px 20px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  box-shadow: var(--shadow-card);
}

.is-round {
  border-radius: 16px;
}

/* 背景渐变色系：语义色驱动，随主题切换 */
.summary-bar--primary {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 55%, #0a1428) 0%, var(--color-primary) 100%);
}

.summary-bar--success {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-success) 55%, #0a1428) 0%, var(--color-success) 100%);
}

.summary-bar--info {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-info) 55%, #0a1428) 0%, var(--color-info) 100%);
}

.summary-bar--warning {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-warning) 55%, #0a1428) 0%, var(--color-warning) 100%);
}

.summary-bar--danger {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-danger) 55%, #0a1428) 0%, var(--color-danger) 100%);
}

/* 左侧图标容器 */
.summary-bar__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  margin-right: 12px;
  font-size: 14px;
  font-weight: 600;
}

.summary-bar__icon svg {
  width: 18px;
  height: 18px;
}

/* 中间内容区 */
.summary-bar__content {
  flex: 1;
  min-width: 0;
}

.summary-bar__content :deep(strong),
.summary-bar__content :deep(b),
.summary-bar__content :deep(.highlight) {
  font-weight: 700;
  color: #fcd34d;
}

/* 右侧标签区 */
.summary-bar__tags {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}
</style>
