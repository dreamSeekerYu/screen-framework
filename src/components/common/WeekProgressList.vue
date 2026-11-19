<template>
  <div class="week-progress-list">
    <div class="list-header">
      <span class="list-desc">{{ total }}件异常节点跟踪</span>
      <span class="list-rate" :class="rateColorCls">
        {{ done }}/{{ total }}已完成
      </span>
    </div>

    <div class="list-body">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="progress-item"
        :class="{ 'is-done': item.status === 'done', 'is-overdue': item.status === 'overdue' }"
        @click="$emit('select', item)"
      >
        <div class="item-top">
          <span class="item-title">{{ item.workshop }}-{{ item.line }} {{ item.title }}</span>
          <span class="item-pct">{{ item.progress }}% · {{ statusText(item) }}</span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            :class="fillCls(item)"
            :style="{ width: item.progress + '%' }"
          ></div>
        </div>
        <div class="item-meta">
          <span>责任人：{{ item.owner }}</span>
          <span>·</span>
          <span>{{ item.nodeText }}</span>
        </div>
      </div>

      <div v-if="!items.length" class="empty">暂无数据</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  done: { type: Number, default: 0 },
})
defineEmits(['select'])

const rateColorCls = computed(() => {
  const r = props.total ? props.done / props.total : 0
  if (r >= 1) return 'rate-done'
  if (r >= 0.8) return 'rate-doing'
  return 'rate-low'
})

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
</script>

<style scoped lang="scss">
.week-progress-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
  font-size: $font-sm;
  color: var(--color-text-secondary);
  .list-rate {
    padding: 2px 10px;
    border-radius: 10px;
    background: var(--color-success-light);
    color: var(--color-success);
    font-weight: 600;
    &.rate-doing { background: #e6f4ff; color: #1677ff; }
    &.rate-low { background: var(--color-danger-light); color: var(--color-danger); }
  }
}
.list-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding-right: 4px;
}
.progress-item {
  padding: $spacing-sm $spacing-md;
  background: var(--color-bg-hover);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all .2s;
  border-left: 3px solid transparent;
  &:hover {
    background: var(--color-bg-active);
    transform: translateX(2px);
    border-left-color: var(--color-primary);
  }
  &.is-done { border-left-color: var(--color-success); }
  &.is-overdue { border-left-color: var(--color-danger); }
}
.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.item-title {
  font-size: $font-sm;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-pct {
  font-size: $font-sm;
  font-weight: 600;
  flex-shrink: 0;
}
.is-done .item-pct { color: var(--color-success); }
.is-overdue .item-pct { color: var(--color-danger); }
.progress-item:not(.is-done):not(.is-overdue) .item-pct { color: var(--color-primary); }
.progress-track {
  height: 6px;
  background: var(--color-border-light);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .6s;
  &.fill-done {
    background: linear-gradient(90deg, var(--color-success), #73d13d);
  }
  &.fill-doing {
    background: linear-gradient(90deg, var(--color-primary), #40a9ff);
  }
  &.fill-overdue {
    background: linear-gradient(90deg, var(--color-danger), #ff7875);
  }
}
.item-meta {
  font-size: $font-xs;
  color: var(--color-text-muted);
  display: flex;
  gap: 6px;
  span:first-child { color: var(--color-text-secondary); }
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: $font-sm;
}
</style>
