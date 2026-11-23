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
  // 显示效果：solid=实色填充 / light=浅底深字 / plain=半透明底
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

/* ============ solid 实色填充（语义色随主题切换） ============ */
.status-tag-effect--solid.status-tag-type--success {
  background-color: var(--color-success);
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--info {
  background-color: var(--color-info);
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--warning {
  background-color: var(--color-warning);
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--danger {
  background-color: var(--color-danger);
  color: #ffffff;
}

.status-tag-effect--solid.status-tag-type--default {
  background-color: color-mix(in srgb, var(--color-text-muted) 85%, transparent);
  color: var(--color-bg-card);
}

/* ============ light 浅底深字（浅色底随主题自适应） ============ */
.status-tag-effect--light.status-tag-type--success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.status-tag-effect--light.status-tag-type--info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.status-tag-effect--light.status-tag-type--warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
}

.status-tag-effect--light.status-tag-type--danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
}

.status-tag-effect--light.status-tag-type--default {
  background-color: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
  color: var(--color-text-secondary);
}

/* ============ plain 半透明底（深浅主题均可用） ============ */
.status-tag-effect--plain.status-tag-type--success {
  background-color: color-mix(in srgb, var(--color-success) 85%, transparent);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--info {
  background-color: color-mix(in srgb, var(--color-info) 22%, transparent);
  color: var(--color-text-primary);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.status-tag-effect--plain.status-tag-type--warning {
  background-color: color-mix(in srgb, var(--color-warning) 85%, transparent);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--danger {
  background-color: color-mix(in srgb, var(--color-danger) 85%, transparent);
  color: #ffffff;
}

.status-tag-effect--plain.status-tag-type--default {
  background-color: color-mix(in srgb, var(--color-text-primary) 18%, transparent);
  color: var(--color-text-primary);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
</style>
