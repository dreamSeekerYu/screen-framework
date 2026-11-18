<template>
  <Dialog :model-value="modelValue" @update:model-value="v => emit('update:modelValue', v)" :title="title"
    width="1100px" :show-fullscreen="true" :footer="false" class="plan-detail-dialog">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>车间筛选：</label>
        <select v-model="filter.workshop" class="filter-select">
          <option value="all">全部车间</option>
          <option v-for="g in workshopOptions" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>完成状态：</label>
        <select v-model="filter.status" class="filter-select">
          <option value="all">全部状态</option>
          <option value="done">已完成</option>
          <option value="doing">推进中</option>
          <option value="todo">待启动</option>
        </select>
      </div>
      <div class="filter-item filter-search">
        <label>负责人搜索：</label>
        <input v-model="filter.keyword" type="text" class="filter-input" placeholder="输入负责人姓名 / 事项关键字" />
        <button class="filter-reset" @click="resetFilter">重置筛选</button>
      </div>
    </div>

    <!-- 周切换 Tabs -->
    <Tabs v-model="activeWeek" type="segment" class="week-tabs">
      <TabPane v-for="(w, idx) in weeks" :key="idx" :name="idx" :label="w.title" />
    </Tabs>

    <!-- 表头统计 -->
    <div class="stats-row" v-if="currentWeek">
      <span class="stats-item"><b>共 {{ currentWeek.stats.total }}</b> 项</span>
      <span class="stats-item done">已完成 <b>{{ currentWeek.stats.done }}</b></span>
      <span class="stats-item doing">推进中 <b>{{ currentWeek.stats.doing }}</b></span>
      <span class="stats-item todo">待启动 <b>{{ currentWeek.stats.todo }}</b></span>
      <span class="stats-rate">完成率 <b>{{ (currentWeek.stats.rate * 100).toFixed(0) }}%</b></span>
    </div>

    <!-- 空态 -->
    <div v-if="!currentWeek || filteredItems.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">{{ currentWeek ? '当前筛选条件下暂无数据' : '暂无周度计划数据' }}</div>
    </div>

    <!-- 表格 -->
    <div v-else class="plan-table-wrap">
      <table class="plan-table">
        <thead>
          <tr>
            <th class="col-idx">序号</th>
            <th class="col-group">车间</th>
            <th class="col-tag" v-if="hasTag">要点标签</th>
            <th class="col-plan">计划事项</th>
            <th class="col-progress">完成度</th>
            <th class="col-owner">负责人 / 节点</th>
            <th class="col-remark" v-if="hasRemark">备注说明</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(group, gIdx) in groupedByWorkshop" :key="gIdx">
            <tr v-if="filter.workshop === 'all'" class="group-row">
              <td :colspan="hasRemark ? (hasTag ? 7 : 6) : (hasTag ? 6 : 5)">
                <span class="group-name">▎{{ group.name }}</span>
                <span class="group-stat">共 {{ group.items.length }} 项，已完成 {{ countStatus(group.items, 'done') }} 项</span>
              </td>
            </tr>
            <tr v-for="(it, iIdx) in group.items" :key="gIdx + '-' + iIdx" :class="['plan-row', 'st-' + it.status]">
              <td class="col-idx">{{ iIdx + 1 }}</td>
              <td class="col-group">{{ it.group }}</td>
              <td class="col-tag" v-if="hasTag">
                <Tag v-if="it.tag" :text="it.tag" type="info" size="small" plain />
              </td>
              <td class="col-plan">{{ it.plan }}</td>
              <td class="col-progress">
                <div class="progress-cell">
                  <Progress :percentage="Math.round(it.percent * 100)" :status="progressStatus(it.status)"
                    :stroke-width="6" :show-text="false" />
                  <span class="progress-text" :class="'txt-' + it.status">
                    {{ statusLabel(it.status) }} {{ it.status === 'doing' ? Math.round(it.percent * 100) + '%' :
                      (it.status === 'done' ? '100%' : '0%') }}
                  </span>
                </div>
              </td>
              <td class="col-owner">
                <div class="owner-name">{{ it.owner || '—' }}</div>
                <div class="owner-date" v-if="it.finishAt">{{ it.finishAt }}</div>
              </td>
              <td class="col-remark" v-if="hasRemark">
                <span :title="it.remark">{{ it.remark || '—' }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Dialog from './Dialog.vue'
import Tabs from './Tabs.vue'
import TabPane from './TabPane.vue'
import Tag from './Tag.vue'
import Progress from './Progress.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  weeks: { type: Array, default: () => [] },
  workshops: { type: Array, default: () => [] },
  title: { type: String, default: '周度计划完整台账' },
  defaultWeek: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue'])

const activeWeek = ref(props.defaultWeek)
const filter = ref({ workshop: 'all', status: 'all', keyword: '' })

watch(() => props.defaultWeek, (v) => { activeWeek.value = v })
watch(() => props.modelValue, (v) => { if (v) resetFilter() })

const workshopOptions = computed(() => props.workshops)

const currentWeek = computed(() => props.weeks[activeWeek.value] || null)

const hasTag = computed(() =>
  currentWeek.value && currentWeek.value.items.some((i) => i.tag),
)
const hasRemark = computed(() =>
  currentWeek.value && currentWeek.value.items.some((i) => i.remark),
)

const filteredItems = computed(() => {
  if (!currentWeek.value) return []
  const kw = filter.value.keyword.trim().toLowerCase()
  return currentWeek.value.items.filter((it) => {
    if (filter.value.workshop !== 'all' && it.group !== filter.value.workshop) return false
    if (filter.value.status !== 'all' && it.status !== filter.value.status) return false
    if (kw) {
      const hit = (it.owner || '').toLowerCase().includes(kw) ||
        (it.plan || '').toLowerCase().includes(kw) ||
        (it.tag || '').toLowerCase().includes(kw) ||
        (it.remark || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

const groupedByWorkshop = computed(() => {
  const map = new Map()
  filteredItems.value.forEach((it) => {
    const g = it.group || '其他'
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(it)
  })
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

function countStatus(items, s) { return items.filter((i) => i.status === s).length }
function resetFilter() { filter.value = { workshop: 'all', status: 'all', keyword: '' } }
function statusLabel(s) {
  return s === 'done' ? '已完成' : s === 'doing' ? '推进中' : '待启动'
}
function progressStatus(s) {
  if (s === 'done') return 'success'
  if (s === 'doing') return 'warning'
  return 'info'
}
</script>

<style lang="scss" scoped>
.plan-detail-dialog {
  :deep(.dialog-body) {
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg-elevated, #f6f8fb);
  border-bottom: 1px solid var(--border-color, #eef0f4);

  label {
    font-size: 13px;
    color: var(--text-secondary, #6b7280);
    margin-right: 6px;
  }
}

.filter-item {
  display: flex;
  align-items: center;
}

.filter-search {
  flex: 1;
  min-width: 260px;
}

.filter-select,
.filter-input {
  height: 30px;
  padding: 0 10px;
  font-size: 13px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--bg-base, #fff);
  color: var(--text-base, #1f2937);
  outline: none;

  &:focus {
    border-color: var(--primary, #2563eb);
  }
}

.filter-input {
  flex: 1;
  max-width: 240px;
}

.filter-reset {
  margin-left: 8px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--bg-base, #fff);
  color: var(--text-base, #374151);
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: var(--bg-hover, #f3f4f6);
  }
}

.week-tabs {
  padding: 10px 16px 0;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  border-bottom: 1px dashed var(--border-color, #eef0f4);

  .stats-item b,
  .stats-rate b {
    color: var(--text-base, #1f2937);
    font-weight: 600;
    margin: 0 2px;
  }

  .done b {
    color: var(--success, #10b981);
  }

  .doing b {
    color: var(--warning, #f59e0b);
  }

  .todo b {
    color: var(--info, #6b7280);
  }

  .stats-rate b {
    color: var(--primary, #2563eb);
    font-size: 16px;
  }
}

.plan-table-wrap {
  padding: 8px 16px 16px;
  max-height: 55vh;
  overflow: auto;
}

.plan-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border-color, #eef0f4);
    text-align: left;
    vertical-align: middle;
  }

  thead th {
    background: var(--primary-soft, #eff6ff);
    color: var(--primary, #1d4ed8);
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
    font-size: 12px;
  }

  .col-idx {
    width: 50px;
    text-align: center;
    color: var(--text-secondary, #9ca3af);
  }

  .col-group {
    width: 70px;
    text-align: center;
    font-weight: 600;
    color: var(--primary, #2563eb);
  }

  .col-tag {
    width: 100px;
  }

  .col-progress {
    width: 180px;
  }

  .col-owner {
    width: 160px;
  }

  .col-remark {
    max-width: 220px;
    color: var(--text-secondary, #6b7280);
    font-size: 12px;

    span {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}

.group-row td {
  background: var(--bg-elevated, #f9fafb);
  font-weight: 600;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.group-name {
  color: var(--primary, #1d4ed8);
  font-size: 14px;
  margin-right: 12px;
}

.group-stat {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.plan-row:hover td {
  background: var(--bg-hover, #f5f9ff);
}

.plan-row.st-done {
  .col-plan {
    color: var(--text-secondary, #6b7280);
  }
}

.plan-row.st-doing {
  .col-plan {
    color: var(--text-base, #1f2937);
  }
}

.plan-row.st-todo {
  .col-plan {
    color: var(--text-base, #374151);
  }
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
}

.txt-done {
  color: var(--success, #10b981);
}

.txt-doing {
  color: var(--warning, #f59e0b);
}

.txt-todo {
  color: var(--info, #6b7280);
}

.owner-name {
  color: var(--text-base, #1f2937);
  font-size: 13px;
}

.owner-date {
  font-size: 11px;
  color: var(--text-secondary, #9ca3af);
  margin-top: 2px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary, #9ca3af);

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: .6;
  }

  .empty-text {
    font-size: 14px;
  }
}
</style>
