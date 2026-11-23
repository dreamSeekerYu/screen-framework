<template>
  <div class="week-progress-list">
    <div class="list-body">
      <div v-for="(item, i) in items" :key="i" class="progress-item"
        :class="{ 'is-done': item.status === 'done', 'is-overdue': item.status === 'overdue', 'is-doing': item.status === 'doing' }"
        @click="$emit('select', item)">
        <div class="item-top">
          <span class="item-title">{{ item.workshop }}·{{ item.line }} {{ item.title }}</span>
          <span class="item-pct" :class="pctColorCls(item)">{{ item.progress }}% · {{ statusText(item) }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :class="fillCls(item)" :style="{ width: Math.min(item.progress, 100) + '%' }">
          </div>
        </div>
        <div class="item-meta">
          <span>责任人：<b>{{ item.owner }}</b></span>
          <span class="meta-dot">·</span>
          <span>{{ item.nodeText }}</span>
        </div>
      </div>
      <div v-if="!items.length" class="empty">暂无异常数据</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  done: { type: Number, default: 0 },
})
defineEmits(['select'])

function statusText(it) {
  if (it.status === 'done') return '已完成'
  if (it.status === 'overdue') return '超期'
  return '推进中'
}
function fillCls(it) {
  if (it.status === 'done') return 'fill-done'
  if (it.status === 'overdue') return 'fill-overdue'
  return 'fill-doing'
}
function pctColorCls(it) {
  if (it.status === 'done') return 'pct-done'
  if (it.status === 'overdue') return 'pct-overdue'
  return 'pct-doing'
}
</script>

<style scoped lang="scss">
.week-progress-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;

  /* 精致滚动条 */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.progress-item {
  position: relative;
  padding: 8px 12px 9px;
  background: linear-gradient(180deg, var(--color-bg-soft) 0%, var(--color-bg-card) 100%);
  border-radius: 8px;
  cursor: pointer;
  transition: all .25s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 3px solid transparent;
  border: 1px solid var(--color-border-light);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 10%, transparent);
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(180deg, var(--color-bg-hover) 0%, color-mix(in srgb, var(--color-primary) 12%, transparent) 100%);
    border-color: var(--color-border);
    transform: translateX(2px);
    box-shadow: var(--shadow-hover);
  }

  &.is-done {
    background: linear-gradient(180deg, var(--color-success-bg) 0%, color-mix(in srgb, var(--color-success) 12%, transparent) 100%);
    border-color: color-mix(in srgb, var(--color-success) 25%, transparent);
    border-left-color: var(--color-success);

    &:hover {
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-success) 14%, transparent) 0%, color-mix(in srgb, var(--color-success) 24%, transparent) 100%);
      border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
    }
  }

  &.is-doing {
    border-left-color: var(--color-primary);
    background: linear-gradient(180deg, var(--color-info-bg) 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 100%);
    border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
  }

  &.is-overdue {
    border-left-color: var(--color-danger);
    background: linear-gradient(180deg, var(--color-danger-bg) 0%, color-mix(in srgb, var(--color-danger) 12%, transparent) 100%);
    border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);
  }
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.item-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 8px;
  letter-spacing: 0.2px;
}

.is-done .item-title {
  color: var(--color-success);
}

.is-overdue .item-title {
  color: var(--color-danger);
}

.item-pct {
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 10px;

  &.pct-done {
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
  }

  &.pct-doing {
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &.pct-overdue {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  }
}

.progress-track {
  height: 8px;
  background: var(--color-border-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
  position: relative;
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--color-text-muted) 30%, transparent);
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width .8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
    border-radius: 4px;
  }

  &.fill-done {
    background: linear-gradient(90deg,
        color-mix(in srgb, var(--color-success) 80%, #000) 0%,
        var(--color-success) 50%,
        color-mix(in srgb, var(--color-success) 60%, #fff) 100%);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-success) 30%, transparent);
  }

  &.fill-doing {
    background: linear-gradient(90deg,
        color-mix(in srgb, var(--color-primary) 80%, #000) 0%,
        var(--color-primary) 50%,
        color-mix(in srgb, var(--color-primary) 60%, #fff) 100%);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-primary) 30%, transparent);
    animation: shimmer 2s ease-in-out infinite;
    background-size: 200% 100%;
  }

  &.fill-overdue {
    background: linear-gradient(90deg,
        color-mix(in srgb, var(--color-danger) 80%, #000) 0%,
        var(--color-danger) 50%,
        color-mix(in srgb, var(--color-danger) 60%, #fff) 100%);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--color-danger) 30%, transparent);
  }
}

@keyframes shimmer {

  0%,
  100% {
    background-position: 0% 0;
  }

  50% {
    background-position: 100% 0;
  }
}

.item-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: flex;
  gap: 6px;
  align-items: center;

  b {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .meta-dot {
    color: var(--color-text-muted);
  }
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
