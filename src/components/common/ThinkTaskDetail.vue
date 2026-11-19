<template>
  <Dialog
    v-model="visible"
    :title="dialogTitle"
    width="1000px"
    @close="handleClose"
  >
    <template #header-extra>
      <span class="risk-badge" :class="task?.riskLevel">{{ task?.riskText }}</span>
    </template>

    <div class="think-detail" v-if="task">
      <!-- 头部信息条 -->
      <div class="detail-meta">
        <div class="meta-item">
          <span class="meta-label">分类</span>
          <span class="cat-tag" :class="task.category">{{ task.categoryText }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">负责人</span>
          <span class="meta-value">{{ task.owner }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">截止</span>
          <span class="meta-value">{{ task.deadline }}</span>
        </div>
      </div>

      <!-- KPI 指标 -->
      <div class="indicator-row">
        <div class="indicator-card">
          <div class="indicator-value green">{{ task.donePlanCount }}</div>
          <div class="indicator-label">已完成动作</div>
        </div>
        <div class="indicator-card">
          <div class="indicator-value orange">{{ task.todoPlanCount }}</div>
          <div class="indicator-label">剩余待办数</div>
        </div>
        <div class="indicator-card">
          <div class="indicator-value blue">{{ task.deptCount }}</div>
          <div class="indicator-label">协同部门数</div>
        </div>
        <div class="indicator-card">
          <div class="indicator-value red">{{ task.coreRiskCount }}</div>
          <div class="indicator-label">核心卡点</div>
        </div>
      </div>

      <!-- 内容块 -->
      <div class="block block-progress" v-if="task.progress.length">
        <div class="block-title">✅ 目前进展</div>
        <div class="block-content">
          <div v-for="(p, i) in task.progress" :key="i" class="block-line">• {{ p }}</div>
        </div>
      </div>

      <div class="block block-risk" v-if="task.risks.length">
        <div class="block-title">⚠️ 风险/卡点</div>
        <div class="block-content">
          <div v-for="(r, i) in task.risks" :key="i" class="risk-point" :class="r.level">
            <Tag v-if="r.isCore" size="small" status="danger" class="core-tag">核心</Tag>
            <span class="risk-type" v-if="r.type">[{{ r.type }}]</span>
            <span>{{ r.text }}</span>
          </div>
        </div>
      </div>

      <div class="block block-plan" v-if="task.plans.length">
        <div class="block-title">📋 下一步计划</div>
        <div class="block-content">
          <div
            v-for="(p, i) in task.plans"
            :key="i"
            class="plan-item"
            :class="{ done: p.done }"
          >
            <span class="plan-check" :class="{ checked: p.done }" @click="togglePlan(i)">
              <span v-if="p.done">✓</span>
            </span>
            <span class="plan-text">
              {{ p.text }}
              <span class="plan-time" v-if="p.time">（{{ p.time }}）</span>
            </span>
          </div>
        </div>
      </div>

      <div class="block block-resource" v-if="task.resources.length">
        <div class="block-title">🤝 需要资源</div>
        <div class="block-content">
          <span v-for="(r, i) in task.resources" :key="i" class="resource-tag">
            {{ r.text }}<span v-if="r.dept" class="resource-dept"> · {{ r.dept }}</span>
          </span>
        </div>
      </div>

      <div class="block block-note" v-if="task.note">
        <div class="block-title">📌 备注</div>
        <div class="block-content">{{ task.note }}</div>
      </div>
    </div>

    <template #footer>
      <StatusTag type="default" text="复制详情" @click="copyDetail" />
      <StatusTag type="primary" text="标记已跟进" @click="markDone" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Dialog from '@/components/common/Dialog.vue'
import Tag from '@/components/common/Tag.vue'
import StatusTag from '@/components/common/StatusTag.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'mark-done', 'plan-toggle'])

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

// 本地维护 plans 的勾选状态（复制一份，避免直接改原始数据）
const localPlans = ref([])
watch(
  () => props.task,
  (t) => {
    if (t) localPlans.value = (t.plans || []).map(p => ({ ...p }))
  },
  { immediate: true }
)

const dialogTitle = computed(() => {
  if (!props.task) return ''
  return `${props.task.workshop} - ${props.task.title}`
})

function togglePlan(i) {
  const p = localPlans.value[i]
  if (!p) return
  p.done = !p.done
  emit('plan-toggle', { task: props.task, index: i, done: p.done })
}

function handleClose() {
  emit('update:modelValue', false)
}

function copyDetail() {
  if (!props.task) return
  const t = props.task
  const lines = []
  lines.push(`【${t.categoryText}】${t.workshop} - ${t.title}`)
  lines.push(`负责人：${t.owner}，截止：${t.deadline}`)
  lines.push('')
  lines.push('进展：')
  t.progress.forEach(p => lines.push('• ' + p))
  lines.push('')
  lines.push('风险：')
  t.risks.forEach(r => lines.push(`• [${r.type}][${r.level === 'high' ? '高' : r.level === 'mid' ? '中' : '低'}] ${r.text}`))
  lines.push('')
  lines.push('计划：')
  t.plans.forEach(p => lines.push(`• ${p.text}（${p.time}）${p.done ? ' ✅' : ''}`))
  lines.push('')
  lines.push('资源：' + t.resources.map(r => r.text).join('、'))
  if (t.note) lines.push('备注：' + t.note)
  const text = lines.join('\n')
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => alert('详情已复制到剪贴板'),
      () => fallbackCopy(text)
    )
  } else {
    fallbackCopy(text)
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy'); alert('详情已复制到剪贴板') } catch (e) { alert('复制失败，请手动复制') }
  document.body.removeChild(ta)
}

function markDone() {
  emit('mark-done', props.task)
  alert('已标记该任务为跟进中')
}
</script>

<style scoped lang="scss">
.think-detail {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: 0 $spacing-sm;
}

.detail-meta {
  display: flex;
  gap: $spacing-lg;
  padding: $spacing-md;
  background: var(--color-bg-soft, #fafafa);
  border-radius: $radius-md;
  flex-wrap: wrap;

  .meta-item {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .meta-label {
      font-size: $font-sm;
      color: var(--color-text-muted);
    }
    .meta-value {
      font-size: $font-sm;
      color: var(--color-text-primary);
      font-weight: 500;
    }
  }
}

.cat-tag {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: $font-xs;
  color: white;

  &.current { background: #409eff; }
  &.last { background: #e6a23c; }
  &.history { background: #909399; }
}

.risk-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: $font-sm;
  color: white;
  font-weight: 600;

  &.high { background: #f56c6c; }
  &.mid { background: #e6a23c; }
  &.low { background: #67c23a; }
}

.indicator-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
}

.indicator-card {
  text-align: center;
  padding: $spacing-md 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: $radius-md;

  .indicator-value {
    font-size: 28px;
    font-weight: bold;
    line-height: 1;
    margin-bottom: 4px;
    font-family: 'DIN Alternate', sans-serif;

    &.green { color: #67c23a; }
    &.orange { color: #e6a23c; }
    &.blue { color: var(--color-primary, #409eff); }
    &.red { color: #f56c6c; }
  }
  .indicator-label {
    font-size: $font-xs;
    color: var(--color-text-muted);
  }
}

.block {
  border-radius: $radius-md;
  padding: $spacing-md $spacing-lg;
  border-left: 4px solid;

  .block-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-sm;
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
  .block-content {
    font-size: $font-sm;
    line-height: 1.8;
    color: var(--color-text-primary);
  }
  .block-line {
    margin-bottom: 4px;
  }
}

.block-progress {
  background: #f0f9eb;
  border-left-color: #67c23a;
  .block-title { color: #67c23a; }
}

.block-risk {
  background: #fef0f0;
  border-left-color: #f56c6c;
  .block-title { color: #f56c6c; }

  .risk-point {
    padding-left: 18px;
    position: relative;
    margin-bottom: 6px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    flex-wrap: wrap;

    &::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    &.high::before { background: #f56c6c; }
    &.mid::before { background: #e6a23c; }
    &.low::before { background: #67c23a; }

    .core-tag { margin-right: 4px; }
    .risk-type { color: #909399; font-size: $font-xs; }
  }
}

.block-plan {
  background: #ecf5ff;
  border-left-color: var(--color-primary, #409eff);
  .block-title { color: var(--color-primary, #409eff); }

  .plan-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;

    .plan-check {
      width: 16px;
      height: 16px;
      border: 2px solid #dcdfe6;
      border-radius: 3px;
      margin-top: 3px;
      flex-shrink: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: white;
      transition: all .2s;

      &.checked {
        background: #67c23a;
        border-color: #67c23a;
      }
    }
    .plan-text { flex: 1; }
    .plan-time { color: #909399; font-size: $font-xs; }

    &.done .plan-text {
      color: #909399;
      text-decoration: line-through;
    }
  }
}

.block-resource {
  background: #fdf6ec;
  border-left-color: #e6a23c;
  .block-title { color: #e6a23c; }

  .resource-tag {
    display: inline-block;
    padding: 4px 10px;
    background: #faecd8;
    color: #b88230;
    border-radius: 4px;
    font-size: $font-sm;
    margin: 3px 6px 3px 0;

    .resource-dept {
      color: #c79a4a;
      font-size: $font-xs;
    }
  }
}

.block-note {
  background: #f5f7fa;
  border-left-color: #909399;
  .block-title { color: #909399; }
}
</style>
