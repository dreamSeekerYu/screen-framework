<template>
  <Dialog v-model="dialogVisible" title="重大质量异常明细台账" width="92vw" :fullscreen="true" :show-footer="false">
    <!-- 顶部统计行 -->
    <div class="stat-row">
      <div class="stat-cell"><div class="stat-num">{{ filtered.length }}</div><div class="stat-label">总项数</div></div>
      <div class="stat-cell"><div class="stat-num success">{{ doneCount }}</div><div class="stat-label">已闭环</div></div>
      <div class="stat-cell"><div class="stat-num primary">{{ doingCount }}</div><div class="stat-label">推进中</div></div>
      <div class="stat-cell"><div class="stat-num danger">{{ overdueCount }}</div><div class="stat-label">超期</div></div>
      <div class="stat-cell"><div class="stat-num">{{ rateText }}</div><div class="stat-label">闭环率</div></div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-row">
      <select v-model="filter.cw" class="f-sel">
        <option value="">全部周次</option>
        <option v-for="w in cwList" :key="w" :value="w">CW{{ w }}</option>
      </select>
      <select v-model="filter.workshop" class="f-sel">
        <option value="">全部车间</option>
        <option v-for="ws in workshopList" :key="ws" :value="ws">{{ ws }}</option>
      </select>
      <select v-model="filter.type" class="f-sel">
        <option value="">全部异常类型</option>
        <option v-for="t in typeList" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="filter.status" class="f-sel">
        <option value="">全部状态</option>
        <option value="done">已闭环</option>
        <option value="doing">推进中</option>
        <option value="overdue">超期</option>
      </select>
      <input v-model="filter.keyword" class="f-input" placeholder="搜索异常标题/责任人/工序..." />
      <button class="f-btn-reset" @click="resetFilter">重置</button>
    </div>

    <!-- 按周分组表格 -->
    <div class="table-wrap">
      <div v-for="group in groupedItems" :key="group.cw" class="cw-group">
        <div class="cw-head">
          <span>CW{{ group.cw }}（{{ group.items.length }}项）</span>
          <span class="cw-sub">闭环 {{ group.done }}/{{ group.items.length }} · {{ group.rate }}%</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:60px">车间</th>
              <th>异常标题</th>
              <th style="width:80px">类型</th>
              <th style="width:90px">责任人</th>
              <th style="width:95px">要求关闭</th>
              <th style="width:95px">实际关闭</th>
              <th style="width:80px">状态</th>
              <th style="width:180px">对策类别</th>
              <th style="width:70px">图片</th>
              <th style="width:80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in group.items" :key="it.row">
              <td><b>{{ it.workshop }}</b><div class="line-sub">{{ it.line }}</div></td>
              <td class="title-cell">{{ it.title }}</td>
              <td><Tag :text="it.type" effect="light" size="small" :color="it.typeColor" /></td>
              <td>{{ it.owner }}</td>
              <td>{{ it.dueMD }}</td>
              <td>{{ it.closeMD || '—' }}</td>
              <td>
                <span class="status-dot" :class="`st-${it.status}`"></span>
                {{ statusText(it.status) }}
              </td>
              <td>
                <Tag v-for="c in it.categories.slice(0,2)" :key="c" :text="c" size="small" effect="plain" style="margin-right:4px" />
              </td>
              <td>
                <button v-if="it.images.length" class="img-btn" @click="previewImgs(it)">
                  📷 {{ it.images.length }}
                </button>
                <span v-else class="muted">—</span>
              </td>
              <td><a class="link" @click="openDetail(it)">查看详情</a></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!group.items.length" class="empty-group">该周次无匹配数据</div>
      </div>
      <div v-if="!groupedItems.length" class="empty-all">未找到匹配的异常记录</div>
    </div>

    <!-- 详情二级弹窗 -->
    <Dialog v-model="detailVisible" :title="detail ? detail.title : ''" width="880px" :show-footer="false">
      <template v-if="detail">
        <div class="info-grid">
          <div class="info-item"><label>车间/线别</label><span>{{ detail.workshop }}-{{ detail.line }}</span></div>
          <div class="info-item"><label>异常类型</label><span><Tag :text="detail.type" effect="light" size="small" :color="detail.typeColor" /></span></div>
          <div class="info-item"><label>责任人</label><span>{{ detail.owner }} / {{ detail.dept }}</span></div>
          <div class="info-item"><label>发生日期</label><span>{{ detail.occurDate }}</span></div>
          <div class="info-item"><label>要求关闭</label><span>{{ detail.dueDate }}</span></div>
          <div class="info-item"><label>实际关闭</label><span>{{ detail.closeDate || '—' }}</span></div>
        </div>
        <div class="progress-row">
          <div class="pg-label">整改进度</div>
          <div class="pg-bar">
            <div class="pg-fill" :class="`pg-${detail.status}`" :style="{width: detail.progress+'%'}"></div>
          </div>
          <div class="pg-val">{{ detail.progress }}% · {{ statusText(detail.status) }}</div>
        </div>

        <_SectionBlock title="问题现象（What）" color="#1677ff" :content="detail.what" />
        <div class="cause-row">
          <_SectionBlock title="直接原因" color="#faad14" :content="detail.directCause" />
          <_SectionBlock title="根本原因" color="#f5222d" :content="detail.rootCause" />
          <_SectionBlock title="流出原因" color="#722ed1" :content="detail.leakCause" />
        </div>
        <div class="cause-row">
          <_SectionBlock title="临时措施" color="#13c2c2" :content="detail.tempAction" />
          <_SectionBlock title="永久对策" color="#52c41a" :content="detail.permanentAction" />
        </div>

        <div class="tag-row" v-if="detail.tags.length || detail.categories.length">
          <span v-if="detail.tags.length" class="tag-grp">
            <label>对策标签：</label>
            <Tag v-for="t in detail.tags" :key="t" :text="t" size="small" />
          </span>
          <span v-if="detail.categories.length" class="tag-grp">
            <label>对策类别：</label>
            <Tag v-for="t in detail.categories" :key="t" :text="t" size="small" type="success" />
          </span>
        </div>

        <div v-if="detail.images.length" class="img-section">
          <div class="section-title">现场/凭证图片</div>
          <div class="img-grid">
            <div v-for="(src, i) in detail.images" :key="i" class="img-thumb" @click="previewImgs(detail, i)">
              <Image :src="src" fit="cover" />
            </div>
          </div>
        </div>

        <div v-if="detail.remark" class="remark">备注：{{ detail.remark }}</div>
      </template>
    </Dialog>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import Dialog from './Dialog.vue'
import Tag from './Tag.vue'
import Image from './Image.vue'
import _SectionBlock from './_SectionBlock.vue'
import { previewImage } from '@/utils/imagePreview.js'

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
  filter.cw = ''; filter.workshop = ''; filter.type = ''; filter.status = ''; filter.keyword = ''
}

const workshopList = computed(() => {
  const s = new Set()
  props.items.forEach((i) => s.add(i.workshop))
  return Array.from(s).filter(Boolean)
})
const typeList = computed(() => {
  const s = new Set()
  props.items.forEach((i) => s.add(i.type))
  return Array.from(s).filter(Boolean)
})

const filtered = computed(() => {
  return props.items.filter((it) => {
    if (filter.cw && it.cw !== Number(filter.cw)) return false
    if (filter.workshop && it.workshop !== filter.workshop) return false
    if (filter.type && it.type !== filter.type) return false
    if (filter.status && it.status !== filter.status) return false
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      const blob = `${it.title} ${it.owner} ${it.occurProcess} ${it.findProcess}`.toLowerCase()
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

const groupedItems = computed(() => {
  const map = {}
  filtered.value.forEach((it) => {
    map[it.cw] = map[it.cw] || []
    map[it.cw].push(it)
  })
  return Object.keys(map)
    .map((cw) => {
      const items = map[cw]
      const done = items.filter((i) => i.status === 'done').length
      return {
        cw: Number(cw),
        items,
        done,
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

function previewImgs(it, idx = 0) {
  const urls = (it.images || []).map((u) => {
    if (u && typeof u === 'object') return u.url || u.src || ''
    return String(u || '')
  }).filter(Boolean)
  if (urls.length) previewImage({ urls, initialIndex: idx })
}
</script>

<style scoped lang="scss">
.stat-row {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: var(--color-bg-hover);
  border-radius: $radius-md;
  margin-bottom: $spacing-md;
}
.stat-cell {
  flex: 1;
  text-align: center;
  .stat-num {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1.2;
    &.success { color: var(--color-success); }
    &.danger { color: var(--color-danger); }
    &.primary { color: var(--color-primary); }
  }
  .stat-label { font-size: $font-xs; color: var(--color-text-secondary); margin-top: 4px; }
}
.filter-row {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
  .f-sel, .f-input {
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-card);
    border-radius: $radius-sm;
    font-size: $font-sm;
    color: var(--color-text-primary);
    outline: none;
    &:focus { border-color: var(--color-primary); }
  }
  .f-input { flex: 1; min-width: 200px; }
  .f-btn-reset {
    padding: 0 14px;
    height: 32px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-card);
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: $font-sm;
    color: var(--color-text-secondary);
    &:hover { color: var(--color-primary); border-color: var(--color-primary); }
  }
}
.table-wrap {
  flex: 1;
  min-height: 0;
  max-height: calc(100vh - 340px);
  overflow-y: auto;
}
.cw-group { margin-bottom: $spacing-md; }
.cw-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: linear-gradient(90deg, rgba(22,119,255,.08), transparent);
  border-left: 3px solid var(--color-primary);
  font-weight: 600;
  font-size: $font-sm;
  .cw-sub { color: var(--color-text-secondary); font-weight: 400; font-size: $font-xs; }
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-sm;
  th, td {
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid var(--color-border-light);
    vertical-align: middle;
  }
  th {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
    font-weight: 500;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .title-cell { max-width: 300px; }
  .line-sub { font-size: $font-xs; color: var(--color-text-muted); margin-top: 2px; }
  .muted { color: var(--color-text-muted); }
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
  &.st-done { background: var(--color-success); }
  &.st-doing { background: var(--color-primary); }
  &.st-overdue { background: var(--color-danger); }
}
.img-btn {
  padding: 2px 8px;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: $font-xs;
  color: var(--color-primary);
  &:hover { background: var(--color-primary-light); color: var(--color-primary); }
}
.link {
  color: var(--color-primary);
  cursor: pointer;
  &:hover { text-decoration: underline; }
}
.empty-group, .empty-all {
  padding: $spacing-lg;
  text-align: center;
  color: var(--color-text-muted);
  font-size: $font-sm;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-sm $spacing-md;
  padding: $spacing-md;
  background: var(--color-bg-hover);
  border-radius: $radius-md;
  margin-bottom: $spacing-md;
}
.info-item {
  font-size: $font-sm;
  label { color: var(--color-text-secondary); margin-right: 8px; }
}
.progress-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  .pg-label { font-size: $font-sm; color: var(--color-text-secondary); width: 70px; }
  .pg-bar {
    flex: 1; height: 10px; background: var(--color-border-light); border-radius: 5px; overflow: hidden;
  }
  .pg-fill { height: 100%; border-radius: 5px; transition: width .5s;
    &.pg-done { background: linear-gradient(90deg, var(--color-success), #73d13d); }
    &.pg-doing { background: linear-gradient(90deg, var(--color-primary), #40a9ff); }
    &.pg-overdue { background: linear-gradient(90deg, var(--color-danger), #ff7875); }
  }
  .pg-val { font-size: $font-sm; font-weight: 600; width: 110px; text-align: right; }
}
.cause-row { display: grid; grid-template-columns: repeat(3,1fr); gap: $spacing-sm; margin-bottom: $spacing-sm; }
.section-title {
  font-size: $font-sm;
  font-weight: 600;
  margin: $spacing-md 0 $spacing-sm;
  color: var(--color-text-primary);
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: var(--color-bg-hover);
  border-radius: $radius-md;
  margin-top: $spacing-md;
  .tag-grp label { color: var(--color-text-secondary); font-size: $font-sm; margin-right: 6px; }
}
.img-section { margin-top: $spacing-md; }
.img-grid { display: grid; grid-template-columns: repeat(auto-fill, 120px); gap: $spacing-sm; }
.img-thumb {
  width: 120px; height: 90px; border-radius: $radius-sm; overflow: hidden; cursor: zoom-in;
  border: 1px solid var(--color-border);
  &:hover { border-color: var(--color-primary); }
}
.remark {
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: #fffbe6;
  border-left: 3px solid #faad14;
  border-radius: $radius-sm;
  font-size: $font-sm;
}
</style>
