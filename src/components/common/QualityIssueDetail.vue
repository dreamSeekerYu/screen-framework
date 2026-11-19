<template>
  <Teleport to="body">
    <Transition name="ldg-fade">
      <div v-if="modelValue" class="ldg-mask">
        <div class="ldg-panel">
          <!-- 头部 -->
          <div class="ldg-head">
            <div class="ldg-head-main">
              <h2 class="ldg-title">重大异常明细台账</h2>
              <p class="ldg-sub">
                共 {{ list.length }} 条记录·上半为主表（可滚动），下半自动展示选中行完整根因与措施
              </p>
            </div>
            <div class="ldg-head-actions">
              <button
                class="ldg-pill"
                :class="{ 'is-active': activeFactory === '' }"
                @click="activeFactory = ''"
              >全部</button>
              <button
                v-for="f in factoryList"
                :key="f"
                class="ldg-pill"
                :class="{ 'is-active': activeFactory === f }"
                @click="activeFactory = f"
              >{{ f }}</button>
              <button class="ldg-back" @click="close">返回大屏</button>
            </div>
          </div>

          <!-- 上半：主表 -->
          <div ref="tableWrapRef" class="ldg-table-wrap">
            <table class="ldg-table">
              <colgroup>
                <col style="width: 5%" />
                <col style="width: 6%" />
                <col style="width: 5%" />
                <col style="width: 24%" />
                <col style="width: 9%" />
                <col style="width: 9%" />
                <col style="width: 10%" />
                <col style="width: 8%" />
                <col style="width: 8%" />
                <col style="width: 7%" />
                <col style="width: 9%" />
              </colgroup>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>工厂</th>
                  <th>线别</th>
                  <th class="is-left">异常问题</th>
                  <th>发生日期</th>
                  <th>产生工序</th>
                  <th>发现工序</th>
                  <th>责任部门</th>
                  <th>责任人</th>
                  <th>节点</th>
                  <th>闭环状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(it, i) in list"
                  :key="it.row"
                  :data-idx="i"
                  :class="{ 'is-active': i === activeIndex }"
                  @click="selectRow(i)"
                >
                  <td class="is-idx">{{ i + 1 }}</td>
                  <td>{{ factoryName(it) }}</td>
                  <td>{{ it.line || '—' }}</td>
                  <td class="is-left">{{ it.title }}</td>
                  <td>{{ fmtDate(it.occurDate) }}</td>
                  <td>{{ it.occurProcess || '—' }}</td>
                  <td>{{ it.findProcess || '—' }}</td>
                  <td>{{ it.dept || '—' }}</td>
                  <td>{{ it.owner || '—' }}</td>
                  <td>{{ it.nodeText || '—' }}</td>
                  <td>
                    <span class="ldg-status" :class="`is-${it.status}`">{{ statusText(it.status) }}</span>
                  </td>
                </tr>
                <tr v-if="!list.length">
                  <td class="ldg-empty" colspan="11">暂无匹配记录</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 下半：选中行完整详情 -->
          <div v-if="current" class="ldg-detail">
            <!-- 问题现场图片 -->
            <section class="ldg-col ldg-col--img">
              <div class="ldg-col-head"><span class="ldg-bar"></span>问题现场图片</div>
              <div class="ldg-scroll">
                <div class="ldg-img-grid">
                  <div
                    v-for="(slot, i) in current.imgSlots"
                    :key="`img${i}`"
                    class="ldg-img-card"
                    :class="{ 'is-active': activeImg === i, 'has-img': !!slot.url }"
                    @click="openImg(i)"
                  >
                    <Image
                      v-if="slot.url"
                      :src="slot.url"
                      fit="cover"
                      width="100%"
                      height="100%"
                      radius="0"
                      :lazy="false"
                    />
                    <template v-else>
                      <svg
                        class="ldg-img-ico"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <span class="ldg-img-cap">{{ slot.label }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </section>

            <!-- 问题描述（5W2H） -->
            <section class="ldg-col ldg-col--desc">
              <div class="ldg-col-head"><span class="ldg-bar"></span>问题描述（5W2H）</div>
              <div class="ldg-scroll">
                <div class="ldg-w2h">
                  <div class="ldg-w2h-title">{{ current.title }}</div>
                  <div class="ldg-w2h-grid">
                    <div v-for="c in w2hCells" :key="c.label" class="ldg-w2h-cell">
                      <div class="ldg-w2h-label">{{ c.label }}</div>
                      <div class="ldg-w2h-value" :class="{ 'is-warn': c.warn }">{{ c.value || '—' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 原因分析 & 整改措施 -->
            <section class="ldg-col ldg-col--cause">
              <div class="ldg-col-head"><span class="ldg-bar"></span>原因分析 &amp; 整改措施</div>
              <div class="ldg-scroll ldg-scroll--cause">
                <div class="ldg-cause">
                  <div class="ldg-cause-head"><span class="ldg-dot"></span>原因分析</div>
                  <p class="ldg-cause-line"><b>直接原因：</b>{{ current.directCause || '—' }}</p>
                  <p class="ldg-cause-line"><b>根本原因：</b>{{ current.rootCause || '—' }}</p>
                </div>
                <div class="ldg-act ldg-act--temp">
                  <div class="ldg-act-head">临时措施</div>
                  <p class="ldg-cause-line">{{ current.tempAction || '—' }}</p>
                </div>
                <div class="ldg-act ldg-act--perm">
                  <div class="ldg-act-head">永久对策</div>
                  <p class="ldg-cause-line">{{ current.permanentAction || '—' }}</p>
                </div>
                <div v-if="current.tags && current.tags.length" class="ldg-tags">
                  <span
                    v-for="(t, i) in current.tags"
                    :key="t"
                    class="ldg-tag"
                    :class="`tone-${i % 3}`"
                  >{{ t }}</span>
                </div>
              </div>
            </section>

            <!-- 整改凭证 -->
            <section class="ldg-col ldg-col--proof">
              <div class="ldg-col-head"><span class="ldg-bar"></span>整改凭证</div>
              <div class="ldg-scroll">
                <div class="ldg-proof-grid">
                  <div
                    v-for="(p, i) in current.proofSlots"
                    :key="`proof${i}`"
                    class="ldg-proof-card"
                    :class="`tone-${i % 3}`"
                    @click="openProof(i)"
                  >
                    <div class="ldg-proof-thumb">
                      <Image
                        v-if="p.url"
                        :src="p.url"
                        fit="cover"
                        width="100%"
                        height="100%"
                        radius="0"
                        :lazy="false"
                      />
                      <svg
                        v-else
                        class="ldg-proof-ico"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="4" y="3" width="16" height="18" rx="2" />
                        <path d="M9 3v18" />
                      </svg>
                    </div>
                    <span class="ldg-proof-cap">{{ p.label }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 底部提示 -->
          <div class="ldg-foot">
            <span>提示：点击表格行切换详情·上下方向键翻行·Esc 返回大屏·点击图片放大查看</span>
            <span class="ldg-page">{{ list.length ? activeIndex + 1 : 0 }} / {{ list.length }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Image from './Image.vue'
import { previewImage } from '@/utils/imagePreview.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** parseQualityIssues() 解析出的全部异常明细 */
  items: { type: Array, default: () => [] },
  cwList: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const activeFactory = ref('')
const activeIndex = ref(0)
const activeImg = ref(-1)
const tableWrapRef = ref(null)

/** 工厂（取车间代码，形如 A3 / M6） */
function factoryName(it) {
  const w = String(it.workshop || '').trim()
  if (w) return w.replace(/集成$/, '')
  return String(it.factory || '').replace(/集成$/, '')
}

const factoryList = computed(() => {
  const s = new Set()
  props.items.forEach((it) => {
    const f = factoryName(it)
    if (f) s.add(f)
  })
  return Array.from(s).sort()
})

/** 主表数据：按工厂筛选 + 最新周次在前 */
const list = computed(() => {
  const arr = props.items
    .filter((it) => !activeFactory.value || factoryName(it) === activeFactory.value)
    .slice()
  arr.sort((a, b) => b.cw - a.cw || a.row - b.row)
  return arr
})

const current = computed(() => list.value[activeIndex.value] || null)

const w2hCells = computed(() => {
  const it = current.value
  if (!it) return []
  return [
    { label: 'Who（责任主体）', value: it.who },
    { label: 'When（发生时间）', value: it.when },
    { label: 'Where（发生位置）', value: it.where },
    { label: 'Why（问题性质）', value: it.why, warn: true },
    { label: 'How（发现方式）', value: it.howFind },
    { label: 'How many（数量）', value: it.howMany, warn: true },
  ]
})

function statusText(s) {
  if (s === 'done') return '已完成'
  if (s === 'overdue') return '超期'
  return '推进中'
}

function fmtDate(v) {
  return String(v || '').replace(/-/g, '/')
}

function selectRow(i) {
  activeIndex.value = i
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = tableWrapRef.value?.querySelector(`tr[data-idx="${activeIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function move(step) {
  const n = list.value.length
  if (!n) return
  activeIndex.value = Math.min(n - 1, Math.max(0, activeIndex.value + step))
  scrollActiveIntoView()
}

function close() {
  emit('update:modelValue', false)
}

function openImg(i) {
  activeImg.value = i
  const slots = current.value?.imgSlots || []
  const urls = slots.map((s) => s.url).filter(Boolean)
  if (!urls.length) return
  previewImage({ urls, initialIndex: Math.max(0, urls.indexOf(slots[i]?.url)) })
}

function openProof(i) {
  const slots = current.value?.proofSlots || []
  const urls = slots.map((s) => s.url).filter(Boolean)
  if (!urls.length) return
  previewImage({ urls, initialIndex: Math.max(0, urls.indexOf(slots[i]?.url)) })
}

// 列表变化后保证选中项不越界
watch(
  () => list.value.length,
  (n) => {
    if (activeIndex.value >= n) activeIndex.value = 0
  }
)

// 切换选中行时清掉上一行留下的图片高亮
watch(current, () => {
  activeImg.value = -1
})

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      activeIndex.value = 0
      activeImg.value = -1
      document.body.style.overflow = 'hidden'
      scrollActiveIntoView()
    } else {
      document.body.style.overflow = ''
    }
  }
)

function onKeydown(e) {
  if (!props.modelValue) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Escape') {
    // 大图预览打开时，Esc 先交给预览关闭
    if (document.querySelector('.ui-preview-mask')) return
    e.preventDefault()
    close()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.ldg-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.45);
}

.ldg-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1e3a68;
  overflow: hidden;
}

/* ========== 头部 ========== */
.ldg-head {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 22px 12px;
}

.ldg-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  color: #1e3a68;
}

.ldg-sub {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8a99b3;
}

.ldg-head-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ldg-pill {
  height: 30px;
  min-width: 54px;
  padding: 0 15px;
  border: 1px solid #dbe5f1;
  border-radius: 15px;
  background: #ffffff;
  color: #3b5378;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #9fc2ea;
    color: #1e3a68;
  }

  &.is-active {
    background: #17335e;
    border-color: #17335e;
    color: #ffffff;
  }
}

.ldg-back {
  height: 32px;
  padding: 0 20px;
  margin-left: 14px;
  border: none;
  border-radius: 16px;
  background: #17335e;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #1f4680;
  }
}

/* ========== 主表 ========== */
.ldg-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.ldg-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 10px 6px;
    background: #eef3fa;
    border-bottom: 1px solid #e2ebf6;
    font-size: 12.5px;
    font-weight: 600;
    color: #33507a;
    text-align: center;
    white-space: nowrap;
  }

  td {
    padding: 11px 6px;
    border-bottom: 1px solid #eef2f7;
    font-size: 13px;
    line-height: 1.4;
    color: #33415c;
    text-align: center;
    word-break: break-all;
  }

  th.is-left,
  td.is-left {
    text-align: left;
    padding-left: 12px;
    padding-right: 12px;
  }

  td.is-idx {
    color: #8a99b3;
    font-variant-numeric: tabular-nums;
  }

  tbody tr {
    cursor: pointer;
    transition: background 0.15s;

    &:hover td {
      background: #f6faff;
    }

    &.is-active td {
      background: #e9f3ff;

      &.is-idx {
        box-shadow: inset 3px 0 0 #2f7fe0;
        color: #2f7fe0;
      }
    }
  }
}

.ldg-empty {
  padding: 40px 0 !important;
  color: #8a99b3 !important;
}

.ldg-status {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;

  &.is-done {
    color: #16a34a;
    background: #e9f8ee;
  }

  &.is-doing {
    color: #d98a16;
    background: #fdf3e2;
  }

  &.is-overdue {
    color: #dc2626;
    background: #fdecea;
  }
}

/* ========== 下半详情 ========== */
.ldg-detail {
  flex: 0 0 45%;
  min-height: 230px;
  display: flex;
  align-items: stretch;
  padding: 14px 22px 12px;
  border-top: 1px solid #e6edf6;
  overflow: hidden;
}

.ldg-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;

  & + & {
    margin-left: 18px;
    padding-left: 18px;
    border-left: 1px solid #eaf0f8;
  }

  &--img {
    flex: 0 0 22%;
  }

  &--desc {
    flex: 0 0 28%;
  }

  &--cause {
    flex: 0 0 27%;
  }

  &--proof {
    flex: 1 1 auto;
  }
}

.ldg-col-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #1e3a68;
}

.ldg-bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #2f7fe0;
}

.ldg-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.ldg-scroll--cause {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 现场图片 */
.ldg-img-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

.ldg-img-card {
  position: relative;
  height: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: #fce9ec;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &.has-img {
    padding: 0;
    background: #eef2f7;
  }

  &.is-active {
    background: #fdf3e2;
    border-color: #4a9fe8;
  }

  :deep(.sc-image) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    background: transparent;
  }
}

.ldg-img-ico {
  width: 18px;
  height: 18px;
  color: #b9909a;
}

.ldg-img-cap {
  font-size: 11.5px;
  line-height: 1.3;
  color: #ab8d95;
  text-align: center;
  padding: 0 6px;
}

/* 5W2H */
.ldg-w2h {
  padding: 12px 14px;
  border: 1px solid #e6edf6;
  border-radius: 10px;
  background: #fbfcfe;
}

.ldg-w2h-title {
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.45;
  color: #24405f;
}

.ldg-w2h-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.ldg-w2h-cell {
  padding: 7px 9px;
  border: 1px solid #e9eff8;
  border-radius: 6px;
  background: #ffffff;
}

.ldg-w2h-label {
  font-size: 11px;
  line-height: 1.3;
  color: #8a99b3;
}

.ldg-w2h-value {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.45;
  color: #33415c;
  word-break: break-all;

  &.is-warn {
    color: #e8820c;
    font-weight: 600;
  }
}

/* 原因分析 & 整改措施 */
.ldg-cause {
  flex: 1 1 auto;
  min-height: 92px;
  padding: 12px 14px;
  border: 1px solid #f7e2e2;
  border-radius: 10px;
  background: #fdf3f3;
  overflow-y: auto;
}

.ldg-cause-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #33415c;
}

.ldg-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e5574f;
}

.ldg-cause-line {
  margin: 0 0 6px;
  font-size: 12.5px;
  line-height: 1.6;
  color: #3d4c66;
  word-break: break-all;

  &:last-child {
    margin-bottom: 0;
  }

  b {
    color: #22344f;
    font-weight: 700;
  }
}

.ldg-act {
  flex: 0 0 auto;
  padding: 9px 12px;
  border-radius: 8px;

  &--temp {
    border-left: 3px solid #4a97e8;
    background: #f2f8ff;
  }

  &--perm {
    border-left: 3px solid #3cae6a;
    background: #f2fbf5;
  }
}

.ldg-act-head {
  margin-bottom: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: #2b3d5c;
}

.ldg-tags {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;
}

.ldg-tag {
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;

  &.tone-0 {
    color: #2f7fe0;
    background: #eaf3ff;
  }

  &.tone-1 {
    color: #d98a16;
    background: #fdf3e2;
  }

  &.tone-2 {
    color: #16a34a;
    background: #e9f8ee;
  }
}

/* 整改凭证 */
.ldg-proof-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 320px;
  align-content: start;
}

.ldg-proof-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover {
    filter: brightness(0.97);
  }

  &.tone-0 {
    background: #e6f5ec;
  }

  &.tone-1 {
    background: #eceffb;
  }

  &.tone-2 {
    background: #fdf5e0;
  }
}

.ldg-proof-thumb {
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;

  :deep(.sc-image) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    background: transparent;
  }
}

.ldg-proof-ico {
  width: 18px;
  height: 18px;
  color: #93a3b8;
}

.ldg-proof-cap {
  font-size: 11.5px;
  line-height: 1.3;
  color: #7b8ba6;
  text-align: center;
}

/* ========== 底部 ========== */
.ldg-foot {
  flex: 0 0 auto;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  border-top: 1px solid #e6edf6;
  background: #f2f5fa;
  font-size: 12px;
  color: #8a99b3;
}

.ldg-page {
  font-size: 13px;
  font-weight: 600;
  color: #33415c;
  font-variant-numeric: tabular-nums;
}

/* ========== 过渡 ========== */
.ldg-fade-enter-active,
.ldg-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ldg-fade-enter-from,
.ldg-fade-leave-to {
  opacity: 0;
}
</style>
