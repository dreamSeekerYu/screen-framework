<template>
  <Dialog v-model="dialogVisible" title="重大质量异常明细台账" width="94vw" :fullscreen="true" :show-footer="false"
    class="issue-detail-dialog">
    <div class="iss-root">
      <!-- 顶部统计行 -->
      <div class="iss-stat-row">
        <div class="iss-stat" v-for="s in statItems" :key="s.label">
          <div class="iss-stat-num" :class="s.cls">{{ s.value }}</div>
          <div class="iss-stat-label">{{ s.label }}</div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="iss-filter-row">
        <select v-model="filter.cw" class="iss-sel">
          <option value="">全部周次</option>
          <option v-for="w in cwList" :key="w" :value="w">CW{{ w }}</option>
        </select>
        <select v-model="filter.workshop" class="iss-sel">
          <option value="">全部车间</option>
          <option v-for="ws in workshopList" :key="ws" :value="ws">{{ ws }}</option>
        </select>
        <select v-model="filter.type" class="iss-sel">
          <option value="">全部异常类型</option>
          <option v-for="t in typeList" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="filter.status" class="iss-sel">
          <option value="">全部状态</option>
          <option value="done">已闭环</option>
          <option value="doing">推进中</option>
          <option value="overdue">超期</option>
        </select>
        <div class="iss-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input v-model="filter.keyword" class="iss-input" placeholder="搜索异常标题/责任人/工序..." />
        </div>
        <button class="iss-btn-reset" @click="resetFilter">重置</button>
      </div>

      <!-- 按周分组表格 -->
      <div class="iss-table-wrap">
        <div v-for="group in groupedItems" :key="group.cw" class="iss-cw-group">
          <div class="iss-cw-head">
            <div class="iss-cw-left">
              <span class="iss-cw-tag">CW{{ group.cw }}</span>
              <span class="iss-cw-count">{{ group.items.length }}项异常</span>
            </div>
            <div class="iss-cw-right">
              <span class="iss-cw-rate">闭环 <b :class="rateCls(group.rate)">{{ group.done }}/{{ group.items.length
                  }}</b></span>
              <span class="iss-cw-pct" :class="rateCls(group.rate)">{{ group.rate }}%</span>
            </div>
          </div>
          <div class="iss-table-scroll">
            <table class="iss-data-table">
              <thead>
                <tr>
                  <th style="width:70px">车间/线体</th>
                  <th>异常标题</th>
                  <th style="width:80px">类型</th>
                  <th style="width:90px">责任人</th>
                  <th style="width:95px">要求关闭</th>
                  <th style="width:95px">实际关闭</th>
                  <th style="width:80px">状态</th>
                  <th style="width:200px">对策类别</th>
                  <th style="width:66px">图片</th>
                  <th style="width:82px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in group.items" :key="it.row" :class="`tr-${it.status}`">
                  <td>
                    <div class="iss-workshop">{{ it.workshop }}</div>
                    <div class="iss-line">{{ it.line || '—' }}</div>
                  </td>
                  <td class="iss-title-cell">
                    <div class="iss-title-text">{{ it.title }}</div>
                    <div v-if="it.occurProcess" class="iss-occur">工序：{{ it.occurProcess }}</div>
                  </td>
                  <td>
                    <span class="iss-type-tag" :style="typeTagStyle(it)">{{ it.type }}</span>
                  </td>
                  <td>
                    <div class="iss-owner">{{ it.owner }}</div>
                  </td>
                  <td class="iss-date">{{ it.dueMD }}</td>
                  <td class="iss-date">{{ it.closeMD || '—' }}</td>
                  <td>
                    <span class="iss-status-chip" :class="`chip-${it.status}`">
                      <span class="iss-dot"></span>{{ statusText(it.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="iss-cat-list">
                      <span v-for="(c, i) in (it.categories || []).slice(0, 3)" :key="c" class="iss-cat-tag">{{ c
                        }}</span>
                      <span v-if="(it.categories || []).length > 3" class="iss-cat-more">+{{ it.categories.length - 3
                        }}</span>
                    </div>
                  </td>
                  <td>
                    <button v-if="it.images && it.images.length" class="iss-img-btn" @click="previewImgs(it)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      {{ it.images.length }}
                    </button>
                    <span v-else class="iss-mute">—</span>
                  </td>
                  <td>
                    <a class="iss-link" @click="openDetail(it)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      查看详情
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!group.items.length" class="iss-empty-group">该周次无匹配数据</div>
        </div>
        <div v-if="!groupedItems.length" class="iss-empty-all">未找到匹配的异常记录，请尝试调整筛选条件</div>
      </div>
    </div><!-- /iss-root -->

    <!-- 详情二级弹窗 -->
    <Dialog v-model="detailVisible" :title="detail ? `${detail.workshop}·${detail.line} ${detail.title}` : ''"
      width="900px" :show-footer="false" class="issue-detail-sub" :close-on-click-modal="true">
      <div v-if="detail" class="iss-detail-body">
        <div class="iss-dinfo-grid">
          <div class="iss-dinfo"><label>车间/线别</label><span><b>{{ detail.workshop }}</b> - {{ detail.line || '—'
              }}</span></div>
          <div class="iss-dinfo"><label>异常类型</label><span><span class="iss-type-tag" :style="typeTagStyle(detail)">{{
                detail.type }}</span></span></div>
          <div class="iss-dinfo"><label>责任人</label><span>{{ detail.owner }} / {{ detail.dept || '—' }}</span></div>
          <div class="iss-dinfo"><label>发现日期</label><span>{{ detail.occurDate }}</span></div>
          <div class="iss-dinfo"><label>要求关闭</label><span>{{ detail.dueDate }}</span></div>
          <div class="iss-dinfo"><label>实际关闭</label><span :class="{ 'muted': !detail.closeDate }">{{ detail.closeDate ||
              '—' }}</span></div>
        </div>

        <div class="iss-progress-row">
          <span class="iss-pg-label">整改进度</span>
          <div class="iss-pg-bar">
            <div class="iss-pg-fill" :class="`pg-${detail.status}`"
              :style="{ width: Math.min(detail.progress, 100) + '%' }">
              <span v-if="detail.progress >= 20">{{ detail.progress }}%</span>
            </div>
          </div>
          <span class="iss-pg-val" :class="`val-${detail.status}`">{{ detail.progress }}% · {{ statusText(detail.status)
            }}</span>
        </div>

        <div class="iss-block iss-block-blue">
          <div class="iss-btitle"><span class="iss-bico">🔍</span>问题现象（What）</div>
          <div class="iss-bcontent">{{ detail.what || '—' }}</div>
        </div>

        <div class="iss-cause-row">
          <div class="iss-block iss-block-orange">
            <div class="iss-btitle"><span class="iss-bico">⚡</span>直接原因</div>
            <div class="iss-bcontent">{{ detail.directCause || '—' }}</div>
          </div>
          <div class="iss-block iss-block-red">
            <div class="iss-btitle"><span class="iss-bico">🎯</span>根本原因</div>
            <div class="iss-bcontent">{{ detail.rootCause || '—' }}</div>
          </div>
          <div class="iss-block iss-block-purple">
            <div class="iss-btitle"><span class="iss-bico">🔓</span>流出原因</div>
            <div class="iss-bcontent">{{ detail.leakCause || '—' }}</div>
          </div>
        </div>
        <div class="iss-cause-row">
          <div class="iss-block iss-block-cyan">
            <div class="iss-btitle"><span class="iss-bico">🚑</span>临时措施</div>
            <div class="iss-bcontent">{{ detail.tempAction || '—' }}</div>
          </div>
          <div class="iss-block iss-block-green">
            <div class="iss-btitle"><span class="iss-bico">✅</span>永久对策</div>
            <div class="iss-bcontent">{{ detail.permanentAction || '—' }}</div>
          </div>
        </div>

        <div v-if="(detail.tags && detail.tags.length) || (detail.categories && detail.categories.length)"
          class="iss-tag-row">
          <div v-if="detail.tags && detail.tags.length" class="iss-tag-grp">
            <label>对策标签：</label>
            <span v-for="t in detail.tags" :key="t" class="iss-tag">{{ t }}</span>
          </div>
          <div v-if="detail.categories && detail.categories.length" class="iss-tag-grp">
            <label>对策类别：</label>
            <span v-for="t in detail.categories" :key="t" class="iss-tag iss-tag-green">{{ t }}</span>
          </div>
        </div>

        <div v-if="detail.images && detail.images.length" class="iss-img-section">
          <div class="iss-section-title">现场/凭证图片 <span class="iss-count-tip">（共 {{ detail.images.length }}
              张，点击放大）</span></div>
          <div class="iss-img-grid">
            <div v-for="(src, i) in detail.images" :key="i" class="iss-img-thumb" @click="previewImgs(detail, i)">
              <Image :src="src" fit="cover" />
              <div class="iss-img-mask"><span>🔍 查看</span></div>
            </div>
          </div>
        </div>

        <div v-if="detail.remark" class="iss-remark">
          <span class="iss-rmico">📌</span>
          <div>{{ detail.remark }}</div>
        </div>
      </div>
    </Dialog>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import Dialog from './Dialog.vue'
import Image from './Image.vue'
import { previewImage } from '@/utils/imagePreview.js'

const TYPE_COLOR = {
  '装配类': '#f59e0b',
  '焊接类': '#0ea5e9',
  '测试类': '#8b5cf6',
  '外观类': '#ec4899',
  '尺寸类': '#06b6d4',
  '其他': '#64748b',
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  cwList: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const filter = reactive({ cw: '', workshop: '', type: '', status: '', keyword: '' })
function resetFilter() {
  filter.cw = ''
  filter.workshop = ''
  filter.type = ''
  filter.status = ''
  filter.keyword = ''
}

const workshopList = computed(() => {
  const s = new Set()
  props.items.forEach((i) => i.workshop && s.add(i.workshop))
  return Array.from(s)
})
const typeList = computed(() => {
  const s = new Set()
  props.items.forEach((i) => i.type && s.add(i.type))
  return Array.from(s)
})

const filtered = computed(() => {
  return props.items.filter((it) => {
    if (filter.cw && it.cw !== Number(filter.cw)) return false
    if (filter.workshop && it.workshop !== filter.workshop) return false
    if (filter.type && it.type !== filter.type) return false
    if (filter.status && it.status !== filter.status) return false
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase().trim()
      const blob = `${it.title} ${it.owner || ''} ${it.occurProcess || ''} ${it.findProcess || ''} ${it.dept || ''}`.toLowerCase()
      if (!blob.includes(kw)) return false
    }
    return true
  })
})
const doneCount = computed(() => filtered.value.filter((i) => i.status === 'done').length)
const doingCount = computed(() => filtered.value.filter((i) => i.status === 'doing').length)
const overdueCount = computed(() => filtered.value.filter((i) => i.status === 'overdue').length)
const rateText = computed(() => {
  if (!filtered.value.length) return '0%'
  return Math.round((doneCount.value / filtered.value.length) * 100) + '%'
})

const statItems = computed(() => [
  { label: '总项数', value: filtered.value.length, cls: '' },
  { label: '已闭环', value: doneCount.value, cls: 'num-success' },
  { label: '推进中', value: doingCount.value, cls: 'num-primary' },
  { label: '超期', value: overdueCount.value, cls: 'num-danger' },
  { label: '闭环率', value: rateText.value, cls: rateCls(Number(rateText.value.replace('%', ''))) },
])

const groupedItems = computed(() => {
  const map = {}
  filtered.value.forEach((it) => {
    const k = it.cw
    map[k] = map[k] || []
    map[k].push(it)
  })
  return Object.keys(map)
    .map((cw) => {
      const items = map[cw]
      const done = items.filter((i) => i.status === 'done').length
      return {
        cw: Number(cw), items, done,
        rate: items.length ? Math.round((done / items.length) * 100) : 0,
      }
    })
    .sort((a, b) => b.cw - a.cw)
})

// 详情
const detailVisible = ref(false)
const detail = ref(null)
function openDetail(it) { detail.value = it; detailVisible.value = true }

function statusText(s) {
  if (s === 'done') return '已闭环'
  if (s === 'overdue') return '超期'
  return '推进中'
}
function rateCls(rate) {
  if (rate >= 100) return 'rate-success'
  if (rate >= 70) return 'rate-warning'
  return 'rate-danger'
}
function typeTagStyle(it) {
  const c = TYPE_COLOR[it.type] || TYPE_COLOR['其他']
  return { background: c + '18', color: c, borderColor: c + '40' }
}

function previewImgs(it, idx = 0) {
  const urls = (it.images || [])
    .map((u) => (u && typeof u === 'object' ? u.url || u.src : String(u || '')))
    .filter(Boolean)
  if (urls.length) previewImage({ urls, initialIndex: idx })
}
</script>

<style scoped lang="scss">
/* 根容器撑满弹窗 body */
:deep(.issue-detail-dialog.ui-dialog.is-fullscreen .ui-dialog__body) {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
}

.iss-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 二级弹窗滚动 */
:deep(.issue-detail-sub .ui-dialog__body) {
  padding: 18px 22px;
}

/* ========== 主台账 ========== */
.iss-stat-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  border: 1px solid rgba(30, 120, 208, 0.1);
  border-radius: 10px;
  margin-bottom: 14px;
}

.iss-stat {
  text-align: center;
  position: relative;
  padding: 4px;

  &+&::before {
    content: '';
    position: absolute;
    left: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background: rgba(148, 163, 184, 0.25);
  }
}

.iss-stat-num {
  font-size: 26px;
  font-weight: 800;
  color: #1e40af;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;

  &.num-success {
    color: #059669;
  }

  &.num-primary {
    color: #2563eb;
  }

  &.num-danger {
    color: #dc2626;
  }

  &.rate-success {
    color: #059669;
  }

  &.rate-warning {
    color: #d97706;
  }

  &.rate-danger {
    color: #dc2626;
  }
}

.iss-stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}

.iss-filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.iss-sel,
.iss-input {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  outline: none;
  transition: all .2s;
  font-family: inherit;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &:hover {
    border-color: #94a3b8;
  }
}

.iss-sel {
  min-width: 110px;
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.iss-search-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;

  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
  }
}

.iss-input {
  width: 100%;
  padding-left: 30px;
}

.iss-btn-reset {
  padding: 0 16px;
  height: 34px;
  border: 1px solid #dbe3ee;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #475569;
  font-family: inherit;
  transition: all .2s;

  &:hover {
    border-color: #2563eb;
    color: #2563eb;
    background: #eff6ff;
  }
}

.iss-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(30, 120, 208, 0.2);
    border-radius: 3px;
  }
}

.iss-cw-group {
  margin-bottom: 16px;
}

.iss-cw-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.02) 60%, transparent);
  border-left: 4px solid #2563eb;
  border-radius: 6px 0 0 6px;
  margin-bottom: 2px;
}

.iss-cw-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.iss-cw-tag {
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.iss-cw-count {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.iss-cw-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
}

.iss-cw-rate b {
  font-size: 14px;
  color: #0f2b5d;
  margin: 0 2px;
  font-weight: 700;
}

.iss-cw-pct {
  font-size: 13px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;

  &.rate-success {
    background: #ecfdf5;
    color: #059669;
  }

  &.rate-warning {
    background: #fffbeb;
    color: #d97706;
  }

  &.rate-danger {
    background: #fef2f2;
    color: #dc2626;
  }
}

.iss-table-scroll {
  overflow-x: auto;
}

.iss-data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  background: #fff;

  th,
  td {
    padding: 10px 10px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }

  th {
    background: #f8fafc;
    color: #64748b;
    font-weight: 600;
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0;
    position: sticky;
    top: 0;
    z-index: 2;
    border-top: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  th:first-child {
    border-radius: 6px 0 0 0;
  }

  th:last-child {
    border-radius: 0 6px 0 0;
  }

  tr {
    transition: background .15s;
  }

  tbody tr:hover {
    background: #f8fbff !important;
  }

  tbody tr.tr-done {
    border-left: 3px solid transparent;
  }

  tbody tr.tr-doing {
    border-left: 3px solid #3b82f6;
  }

  tbody tr.tr-overdue {
    border-left: 3px solid #ef4444;
    background: #fff8f8;
  }
}

.iss-workshop {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
}

.iss-line {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.iss-title-text {
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.iss-occur {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}

.iss-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
}

.iss-owner {
  font-size: 13px;
  color: #334155;
}

.iss-date {
  font-size: 12px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

.iss-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  background: #f1f5f9;
  color: #64748b;

  .iss-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
  }

  &.chip-done {
    background: #ecfdf5;
    color: #059669;

    .iss-dot {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
    }
  }

  &.chip-doing {
    background: #eff6ff;
    color: #1d4ed8;

    .iss-dot {
      background: #3b82f6;
      box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
      animation: pulse 1.6s infinite;
    }
  }

  &.chip-overdue {
    background: #fef2f2;
    color: #dc2626;

    .iss-dot {
      background: #ef4444;
      box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
      animation: pulse 1s infinite;
    }
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: 0.5
  }
}

.iss-cat-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.iss-cat-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10.5px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.iss-cat-more {
  font-size: 11px;
  color: #94a3b8;
  padding-left: 4px;
}

.iss-img-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11.5px;
  color: #2563eb;
  font-weight: 600;
  transition: all .2s;

  &:hover {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }
}

.iss-mute {
  color: #cbd5e1;
  font-size: 12px;
}

.iss-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #2563eb;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 5px;
  transition: all .2s;

  &:hover {
    background: #eff6ff;
    text-decoration: none;
  }
}

.iss-empty-group,
.iss-empty-all {
  padding: 48px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.iss-empty-all {
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}

/* ========== 详情二级弹窗 ========== */
.iss-detail-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(30, 120, 208, 0.2);
    border-radius: 3px;
  }
}

.iss-dinfo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin-bottom: 14px;
}

.iss-dinfo {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;

  label {
    color: #94a3b8;
    font-size: 11.5px;
    display: block;
    margin-bottom: 2px;
    font-weight: 500;
  }

  b {
    color: #1e40af;
    font-weight: 700;
  }

  .muted {
    color: #cbd5e1;
  }
}

.iss-progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin-bottom: 14px;
}

.iss-pg-label {
  font-size: 13px;
  color: #64748b;
  width: 70px;
  flex-shrink: 0;
  font-weight: 500;
}

.iss-pg-bar {
  flex: 1;
  height: 14px;
  background: #e2e8f0;
  border-radius: 7px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(148, 163, 184, 0.25);
}

.iss-pg-fill {
  height: 100%;
  border-radius: 7px;
  transition: width .8s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 7px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
  }

  &.pg-done {
    background: linear-gradient(90deg, #059669 0%, #10b981 100%);
    box-shadow: 0 1px 4px rgba(16, 185, 129, 0.3);
  }

  &.pg-doing {
    background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%);
    box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
  }

  &.pg-overdue {
    background: linear-gradient(90deg, #dc2626 0%, #f87171 100%);
    box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3);
  }
}

.iss-pg-val {
  font-size: 13px;
  font-weight: 700;
  width: 100px;
  text-align: right;
  font-variant-numeric: tabular-nums;

  &.val-done {
    color: #059669;
  }

  &.val-doing {
    color: #1d4ed8;
  }

  &.val-overdue {
    color: #dc2626;
  }
}

.iss-block {
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid;
  background: #fff;

  &.iss-block-blue {
    background: linear-gradient(135deg, #eff6ff, #fff);
    border-color: rgba(37, 99, 235, 0.2);

    .iss-btitle {
      color: #1d4ed8;
    }
  }

  &.iss-block-orange {
    background: linear-gradient(135deg, #fffbeb, #fff);
    border-color: rgba(217, 119, 6, 0.2);

    .iss-btitle {
      color: #d97706;
    }
  }

  &.iss-block-red {
    background: linear-gradient(135deg, #fef2f2, #fff);
    border-color: rgba(220, 38, 38, 0.2);

    .iss-btitle {
      color: #dc2626;
    }
  }

  &.iss-block-purple {
    background: linear-gradient(135deg, #f5f3ff, #fff);
    border-color: rgba(124, 58, 237, 0.2);

    .iss-btitle {
      color: #7c3aed;
    }
  }

  &.iss-block-cyan {
    background: linear-gradient(135deg, #ecfeff, #fff);
    border-color: rgba(8, 145, 178, 0.2);

    .iss-btitle {
      color: #0891b2;
    }
  }

  &.iss-block-green {
    background: linear-gradient(135deg, #ecfdf5, #fff);
    border-color: rgba(5, 150, 105, 0.2);

    .iss-btitle {
      color: #059669;
    }
  }
}

.iss-btitle {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.iss-bico {
  font-size: 14px;
}

.iss-bcontent {
  font-size: 12.5px;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.iss-cause-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.iss-cause-row:nth-of-type(2) {
  grid-template-columns: 1fr 1fr;
}

.iss-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin: 14px 0;
}

.iss-tag-grp {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12.5px;
}

.iss-tag-grp label {
  color: #64748b;
  font-weight: 500;
}

.iss-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #dbeafe;
  color: #1d4ed8;
}

.iss-tag-green {
  background: #d1fae5;
  color: #059669;
}

.iss-img-section {
  margin-top: 14px;
}

.iss-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f2b5d;
  margin-bottom: 8px;
}

.iss-count-tip {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 400;
}

.iss-img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 140px);
  gap: 10px;
}

.iss-img-thumb {
  width: 140px;
  height: 105px;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  border: 1px solid #e2e8f0;
  position: relative;
  background: #f1f5f9;
  transition: all .25s;

  &:hover {
    border-color: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.15);
  }

  &:hover .iss-img-mask {
    opacity: 1;
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .4s;
  }

  &:hover :deep(img) {
    transform: scale(1.08);
  }
}

.iss-img-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(37, 99, 235, 0.7) 0%, transparent 60%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  opacity: 0;
  transition: opacity .25s;

  span {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 10px;
    backdrop-filter: blur(4px);
  }
}

.iss-remark {
  margin-top: 14px;
  padding: 10px 14px;
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  font-size: 12.5px;
  color: #78350f;
  line-height: 1.6;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.iss-rmico {
  font-size: 14px;
  flex-shrink: 0;
}
</style>
