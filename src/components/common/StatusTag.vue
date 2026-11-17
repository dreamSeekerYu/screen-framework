<template>
  <span
    class="status-tag"
    :class="[
      `status-tag-type--${type}`,
      `status-tag-effect--${effect}`,
      `status-tag-size--${size}`,
      { 'is-round': round }
    ]"
  >
    <slot />
    <span v-if="text" class="status-tag__text">{{ text }}</span>
  </span>
</template>

<script setup>
defineProps({
  // 标签文字
  text: {
    type: String,
    default: ''
  },
  // 色系类型：success/info/warning/danger/default
  type: {
    type: String,
    default: 'info',
    validator: (val) => ['success', 'info', 'warning', 'danger', 'default'].includes(val)
  },
  // 显示效果：solid=实色填充(适合浅色背景) / light=浅底深字(适合浅色背景) / plain=半透明白字(适合深色渐变背景)
  effect: {
    type: String,
    default: 'solid',
    validator: (val) => ['solid', 'light', 'plain'].includes(val)
  },
  // 是否圆角胶囊样式
  round: {
    type: Boolean,
    default: true
  },
  // 尺寸：small/default/large
  size: {
    type: String,
    default: 'default',
    validator: (val) => ['small', 'default', 'large'].includes(val)
  }
})
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.is-round {
  border-radius: 20px;
}

/* 尺寸 */
.status-tag-size--small {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
}

.status-tag-size--default {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
}

.status-tag-size--large {
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
}

.status-tag__text {
  display: inline-block;
}

/* ============ solid 实色填充（适合浅色背景，对齐截图色值） ============ */
.status-tag-effect--solid.status-tag-type--success {
  background-color: #10b981;
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--info {
  background-color: #0ea5e9;
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--warning {
  background-color: #f59e0b;
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--danger {
  background-color: #ef4444;
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--default {
  background-color: #6b7280;
  color: #ffffff;
}

/* ============ light 浅底深字（适合浅色背景，柔和风格） ============ */
.status-tag-effect--light.status-tag-type--success {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-tag-effect--light.status-tag-type--info {
  background-color: #e0f2fe;
  color: #0284c7;
}

.status-tag-effect--light.status-tag-type--warning {
  background-color: #fef3c7;
  color: #d97706;
}

.status-tag-effect--light.status-tag-type--danger {
  background-color: #fee2e2;
  color: #dc2626;
}

.status-tag-effect--light.status-tag-type--default {
  background-color: #f3f4f6;
  color: #4b5563;
}

/* ============ plain 半透明白字（适合深色渐变背景，用于总结栏，完全对齐截图效果） ============ */
.status-tag-effect--plain.status-tag-type--success {
  background-color: rgba(16, 185, 129, 0.9);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--info {
  background-color: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.status-tag-effect--plain.status-tag-type--warning {
  background-color: rgba(245, 158, 11, 0.9);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--danger {
  background-color: rgba(239, 68, 68, 0.9);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--default {
  background-color: rgba(148, 163, 184, 0.3);
  color: #ffffff;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
</style>
