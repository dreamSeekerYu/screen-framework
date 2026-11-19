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
    background: rgba(30, 120, 208, 0.15);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.progress-item {
  position: relative;
  padding: 8px 12px 9px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  cursor: pointer;
  transition: all .25s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 3px solid transparent;
  border: 1px solid rgba(30, 120, 208, 0.08);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
    border-color: rgba(30, 120, 208, 0.25);
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(30, 64, 175, 0.08);
  }

  &.is-done {
    background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: rgba(16, 185, 129, 0.2);
    border-left-color: #10b981;

    &:hover {
      background: linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%);
      border-color: rgba(16, 185, 129, 0.35);
    }
  }

  &.is-doing {
    border-left-color: #3b82f6;
    background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
    border-color: rgba(59, 130, 246, 0.18);
  }

  &.is-overdue {
    border-left-color: #ef4444;
    background: linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%);
    border-color: rgba(239, 68, 68, 0.2);
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
  color: #1e3a8a;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 8px;
  letter-spacing: 0.2px;
}

.is-done .item-title {
  color: #065f46;
}

.is-overdue .item-title {
  color: #991b1b;
}

.item-pct {
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 10px;

  &.pct-done {
    color: #059669;
    background: rgba(16, 185, 129, 0.12);
  }

  &.pct-doing {
    color: #1d4ed8;
    background: rgba(59, 130, 246, 0.12);
  }

  &.pct-overdue {
    color: #dc2626;
    background: rgba(239, 68, 68, 0.12);
  }
}

.progress-track {
  height: 8px;
  background: rgba(203, 213, 225, 0.6);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(148, 163, 184, 0.3);
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
    background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
    box-shadow: 0 1px 4px rgba(16, 185, 129, 0.3);
  }

  &.fill-doing {
    background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
    box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
    animation: shimmer 2s ease-in-out infinite;
    background-size: 200% 100%;
  }

  &.fill-overdue {
    background: linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%);
    box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3);
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
  color: #64748b;
  display: flex;
  gap: 6px;
  align-items: center;

  b {
    color: #334155;
    font-weight: 600;
  }

  .meta-dot {
    color: #cbd5e1;
  }
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}
</style>
