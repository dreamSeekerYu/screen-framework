/***
统计组件
***/

/***
通用卡片设计
  特殊区域字体颜色
    主题字体颜色      title-type: default/primary/warning/success/danger/info
    大字重点字体颜色  size-type: large/mid/mini
    解释文本字体颜色
  卡片背景色以及边框搭配   plain 轻色模式 / round圆角边框 /  dash 虚线边框
  卡片亮度等级  effect = light/dark
****/ 

<template>
  <div
    class="stat-card"
    :class="[
      `stat-card--${variant}`,
      `stat-card--${size}`,
      `stat-card--${status}`,
      { 'stat-card--brightness-light': brightness === 'light', 'stat-card--brightness-dark': brightness === 'dark' }
    ]"
    :style="customStyle"
  >
    <!-- 默认插槽：完全自定义整个卡片内容（优先级最高，会覆盖所有内部布局） -->
    <slot v-if="$slots.default"></slot>

    <!-- 无默认插槽时使用默认布局 -->
    <div v-else class="stat-card__content">
      <div class="stat-card__left">
        <!-- 标题插槽：自定义标题区域 -->
        <slot name="title">
          <div class="stat-card__title">{{ title }}</div>
        </slot>
        <!-- 描述插槽：自定义说明文本区域 -->
        <slot name="explain">
          <div v-if="explain || $slots.explain" class="stat-card__explain">{{ explain }}</div>
        </slot>
        <!-- 左侧扩展插槽：explain下方自定义内容 -->
        <slot name="left-extra"></slot>
      </div>

      <div class="stat-card__right">
        <!-- 数值前插槽：数值左侧自定义内容（如图标、标签） -->
        <slot name="prefix"></slot>
        <!-- 数值插槽：自定义数值区域 -->
        <slot name="value">
          <span class="stat-card__value">{{ value }}</span>
        </slot>
        <!-- 单位插槽：自定义单位区域 -->
        <slot name="unit">
          <span v-if="unit || $slots.unit" class="stat-card__unit">{{ unit }}</span>
        </slot>
        <!-- 数值后插槽：数值右侧自定义内容（如趋势箭头、图标） -->
        <slot name="suffix"></slot>
        <!-- 右侧扩展插槽：数值下方自定义内容 -->
        <slot name="right-extra"></slot>
      </div>

      <!-- 右上角操作区插槽 -->
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const slots = useSlots()

const props = defineProps({
  // 标题
  title: {
    type: String,
    default: ''
  },
  // 描述说明文本
  explain: {
    type: String,
    default: ''
  },
  // 数值
  value: {
    type: [Number, String],
    default: ''
  },
  // 单位
  unit: {
    type: String,
    default: ''
  },
  // 状态颜色: primary | success | warning | danger | info | 自定义色值
  status: {
    type: String,
    default: 'primary',
    validator: (val) => ['primary', 'success', 'warning', 'danger', 'info'].includes(val) || val.startsWith('#')
  },
  // 卡片样式变体: default(白底) | outlined(实线边框) | dash(虚线边框) | plain(浅色填充)
  variant: {
    type: String,
    default: 'default',
    validator: (val) => ['default', 'outlined', 'dash', 'plain'].includes(val)
  },
  // 背景亮度: default | light(更亮) | dark(更深)
  brightness: {
    type: String,
    default: 'default',
    validator: (val) => ['default', 'light', 'dark'].includes(val)
  },
  // 尺寸: small | default | large
  size: {
    type: String,
    default: 'default',
    validator: (val) => ['small', 'default', 'large'].includes(val)
  },
  // 自定义颜色（优先级高于status）
  color: {
    type: String,
    default: ''
  },
  // 自定义边框颜色
  borderColor: {
    type: String,
    default: ''
  },
  // 自定义背景色
  bgColor: {
    type: String,
    default: ''
  }
})

// 预设状态颜色映射（语义变量，随主题自动切换）
const statusColors = {
  primary: {
    text: 'var(--color-primary)',
    border: 'var(--color-primary)',
    bg: 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
  },
  success: {
    text: 'var(--color-success)',
    border: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)'
  },
  warning: {
    text: 'var(--color-warning)',
    border: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
  },
  danger: {
    text: 'var(--color-danger)',
    border: 'var(--color-danger)',
    bg: 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
  },
  info: {
    text: 'var(--color-info)',
    border: 'var(--color-border)',
    bg: 'color-mix(in srgb, var(--color-info) 8%, transparent)'
  }
}

const customStyle = computed(() => {
  const style = {}
  let colorConfig = statusColors[props.status] || statusColors.primary

  // 如果传入自定义主色，生成对应配色
  if (props.color && props.color.startsWith('#')) {
    colorConfig = {
      text: props.color,
      border: props.color,
      bg: `color-mix(in srgb, ${props.color} ${props.brightness === 'light' ? 6 : props.brightness === 'dark' ? 15 : 10}%, transparent)`
    }
  }

  // 自定义边框色
  if (props.borderColor) {
    style['--card-border-color'] = props.borderColor
  } else if (props.variant !== 'default') {
    style['--card-border-color'] = colorConfig.border
  }

  // 自定义背景色
  if (props.bgColor) {
    style['--card-bg-color'] = props.bgColor
  } else if (props.variant === 'plain') {
    const bgOpacity = props.brightness === 'light' ? 6 : props.brightness === 'dark' ? 18 : 10
    style['--card-bg-color'] = `color-mix(in srgb, ${colorConfig.border} ${bgOpacity}%, transparent)`
  }

  // 数值颜色
  style['--value-color'] = colorConfig.text

  return style
})

// hex转rgba
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

defineExpose({
  statusColors,
  hexToRgba
})
</script>

<style scoped>
.stat-card {
  position: relative;
  --card-bg-color: var(--color-bg-card);
  --card-border-color: transparent;
  --value-color: var(--color-primary);
  --border-radius: 16px;
  --padding: 20px 28px;
  --title-size: 22px;
  --explain-size: 16px;
  --value-size: 42px;
  --unit-size: 28px;

  background: var(--card-bg-color);
  border-radius: var(--border-radius);
  padding: var(--padding);
  border: 2px solid var(--card-border-color);
  box-shadow: var(--shadow-card);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* 尺寸变体 */
.stat-card--small {
  --border-radius: 12px;
  --padding: 14px 20px;
  --title-size: 16px;
  --explain-size: 13px;
  --value-size: 28px;
  --unit-size: 18px;
}

.stat-card--large {
  --border-radius: 20px;
  --padding: 28px 36px;
  --title-size: 26px;
  --explain-size: 18px;
  --value-size: 56px;
  --unit-size: 36px;
}

/* 样式变体 */
.stat-card--dash {
  border-style: dashed;
}

.stat-card--default {
  border-color: var(--color-border-light);
  background: var(--color-bg-card);
}

.stat-card--outlined {
  background: var(--color-bg-card);
}

/* 内容布局 */
.stat-card__content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  position: relative;
}

.stat-card__left {
  flex: 1;
  min-width: 0;
}

.stat-card__title {
  font-size: var(--title-size);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card__explain {
  font-size: var(--explain-size);
  color: var(--color-text-secondary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card__right {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  font-weight: 700;
}

.stat-card__value {
  font-size: var(--value-size);
  color: var(--value-color);
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stat-card__unit {
  font-size: var(--unit-size);
  color: var(--value-color);
  margin-left: 4px;
  line-height: 1;
}

/* 右上角操作区 */
:deep(.stat-card__action) {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 14px;
  color: var(--color-text-muted);
  cursor: pointer;
}

/* 亮度调整 - plain模式 */
.stat-card--brightness-light.stat-card--plain {
  --card-bg-color: color-mix(in srgb, var(--color-bg-card) 88%, transparent);
}

/* 插槽自定义样式支持 */
.stat-card :deep(*) {
  box-sizing: border-box;
}
</style>
