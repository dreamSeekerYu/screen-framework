<template>
  <ScreenContainer class="common-demo-page" :no-scale="true">
    <div class="nav-pills">
      <router-link to="/comp" class="pill">基础组件</router-link>
      <router-link to="/newcomp" class="pill">统计卡片</router-link>
      <router-link to="/c_q_Card" class="pill">客户质量卡片</router-link>
      <router-link to="/commoncomp" class="pill active">通用组件演示</router-link>
    </div>

    <div class="demo-container">
      <h2 class="page-title">通用组件展示规范</h2>
      <p class="page-desc">本次新增的通用业务组件，统一遵循大屏主题系统（自动适配深色/浅色），可在各业务页面直接复用。图片组件已整合为 <b>Image</b>（单图）+ <b>ImagePreviewGroup</b>（图集），支持点击缩略图自动唤起预览。</p>

      <!-- Tag -->
      <section class="section">
        <h3 class="section-title">Tag 标签</h3>
        <div class="demo-card">
          <div class="row gap-sm flex-wrap">
            <Tag text="默认" />
            <Tag type="primary" text="主要" />
            <Tag type="success" text="已完成" />
            <Tag type="warning" text="处理中" />
            <Tag type="danger" text="异常" />
            <Tag type="info" text="待跟进" />
            <Tag type="cyan" text="进行中" />
            <Tag type="purple" text="预警" />
          </div>
          <div class="row gap-sm flex-wrap" style="margin-top: 16px;">
            <Tag type="danger" text="可关闭" closable @close="tagMsg('closed danger')" />
            <Tag color="var(--color-warning)" text="自定义色" />
            <Tag plain type="primary" text="透明边框" />
            <Tag type="success" size="small" text="小尺寸" />
          </div>
        </div>
      </section>

      <!-- Progress -->
      <section class="section">
        <h3 class="section-title">Progress 进度条</h3>
        <div class="demo-card grid-2">
          <div>
            <div class="demo-label">5种状态色</div>
            <Progress :percentage="35" status="primary" />
            <Progress :percentage="65" status="success" />
            <Progress :percentage="50" status="warning" />
            <Progress :percentage="80" status="danger" />
            <Progress :percentage="42" status="info" />
          </div>
          <div>
            <div class="demo-label">内置/外置文字、条纹、自定义渐变</div>
            <Progress :percentage="82" status="success" striped text-inside />
            <Progress :percentage="65" status="primary" />
            <Progress :percentage="90" status="warning" striped :stroke-width="14" />
            <Progress :percentage="78" color="linear-gradient(90deg, var(--color-danger), var(--color-warning))" />
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <section class="section">
        <h3 class="section-title">Tabs 标签页切换</h3>
        <div class="demo-card grid-2">
          <div>
            <div class="demo-label">line 下划线风格</div>
            <Tabs v-model="tab1">
              <TabPane label="本周" name="week"><div class="tab-pane-content">展示本周数据</div></TabPane>
              <TabPane label="本月" name="month"><div class="tab-pane-content">展示本月数据</div></TabPane>
              <TabPane label="本季度" name="quarter"><div class="tab-pane-content">展示季度数据</div></TabPane>
              <TabPane label="年度" name="year"><div class="tab-pane-content">展示年度数据</div></TabPane>
            </Tabs>
          </div>
          <div>
            <div class="demo-label">card 卡片风格（支持徽章/禁用）</div>
            <Tabs v-model="tab2" type="card">
              <TabPane label="全部问题" name="all"><div class="tab-pane-content">共 26 条记录</div></TabPane>
              <TabPane label="待整改" name="pending" badge="3"><div class="tab-pane-content">3 条待整改</div></TabPane>
              <TabPane label="整改中" name="doing" badge="1"><div class="tab-pane-content">1 条整改中</div></TabPane>
              <TabPane label="已关闭" name="closed"><div class="tab-pane-content">已关闭 22 条</div></TabPane>
              <TabPane label="已归档" name="archived" disabled><div class="tab-pane-content">该功能开发中</div></TabPane>
            </Tabs>
          </div>
        </div>
        <div class="demo-card" style="margin-top: 16px;">
          <div class="demo-label">segment 分段控件</div>
          <Tabs v-model="tab3" type="segment">
            <TabPane label="日" name="day"><div class="tab-pane-content">日维度</div></TabPane>
            <TabPane label="周" name="week"><div class="tab-pane-content">周维度</div></TabPane>
            <TabPane label="月" name="month"><div class="tab-pane-content">月维度</div></TabPane>
          </Tabs>
        </div>
      </section>

      <!-- Image 单图 -->
      <section class="section">
        <h3 class="section-title">Image 单图（整合懒加载 / 失败占位 / 点击预览）</h3>
        <div class="demo-card">
          <div class="row gap-md flex-wrap" style="margin-bottom: 16px;">
            <div>
              <div class="demo-label">方形 (square)</div>
              <Image :src="demoImg" shape="square" :width="140" :height="140" preview />
            </div>
            <div>
              <div class="demo-label">圆角 (rounded)</div>
              <Image :src="demoImg" shape="rounded" :width="140" :height="140" preview />
            </div>
            <div>
              <div class="demo-label">圆形 (circle)</div>
              <Image :src="demoImg" shape="circle" :width="140" :height="140" preview />
            </div>
            <div>
              <div class="demo-label">contain 模式</div>
              <Image :src="demoImg" shape="rounded" :width="140" :height="140" fit="contain" preview />
            </div>
            <div>
              <div class="demo-label">加载失败占位</div>
              <Image src="/not-exist.jpg" shape="rounded" :width="140" :height="140" />
            </div>
          </div>
          <div class="demo-label" style="margin-top: 8px;">hover 时显示放大镜蒙层，点击自动打开大图预览（单图）</div>
        </div>
      </section>

      <!-- ImagePreviewGroup 图集 -->
      <section class="section">
        <h3 class="section-title">ImagePreviewGroup 图集预览（缩略图点击自动联动）</h3>
        <div class="demo-card">
          <p class="section-desc">用 <code>&lt;ImagePreviewGroup&gt;</code> 包裹任意数量 <code>&lt;Image&gt;</code>，组内任意缩略图点击自动以图集方式打开，无需手动维护 urls 和索引。</p>
          <ImagePreviewGroup>
            <div class="img-grid">
              <Image
                v-for="(u, i) in demoImgs"
                :key="i"
                :src="u"
                shape="rounded"
                :width="120"
                :height="90"
              />
            </div>
          </ImagePreviewGroup>
          <div style="margin-top: 16px;">
            <div class="demo-label">或通过 JS API 直接唤起（业务逻辑里一行代码）：</div>
            <StatusTag type="primary" text="点我用函数式API预览" style="margin-top: 8px; cursor: pointer;" @click="openByJs" />
          </div>
        </div>
      </section>

      <!-- Dialog -->
      <section class="section">
        <h3 class="section-title">Dialog 弹窗</h3>
        <div class="demo-card">
          <div class="row gap-md">
            <StatusTag type="primary" text="打开基础弹窗（可拖拽）" style="cursor: pointer;" @click="basicVisible = true" />
            <StatusTag type="success" text="打开全屏弹窗" style="cursor: pointer;" @click="fullVisible = true" />
            <StatusTag type="warning" text="LPA 问题详情弹窗" style="cursor: pointer;" @click="lpaVisible = true" />
          </div>
        </div>
      </section>

      <!-- 组合示例：LPA 问题卡片 + 弹窗 + 图集 -->
      <section class="section">
        <h3 class="section-title">组合示例：LPA 问题卡片 → 详情弹窗（内嵌 Tabs + 图集）</h3>
        <div class="demo-card">
          <div class="lpa-card-demo" @click="lpaVisible = true">
            <div class="lpa-card-header">
              <span class="lpa-date">2026-11-15 白班</span>
              <Tag type="danger" text="整改中" size="small" />
            </div>
            <div class="lpa-desc">PACK装配线：工位3条码标签张贴偏移，需调整治具定位</div>
            <div class="lpa-meta">
              <ImagePreviewGroup>
                <div class="lpa-thumbs">
                  <Image
                    v-for="(u, i) in demoImgs.slice(0,3)" :key="i"
                    :src="u" shape="rounded" :width="56" :height="56"
                  />
                </div>
              </ImagePreviewGroup>
              <div class="lpa-progress">
                <div class="progress-label">整改进度</div>
                <Progress :percentage="65" status="warning" striped />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 底部留白 -->
      <div style="height: 80px;"></div>
    </div>

    <!-- 基础弹窗 -->
    <Dialog v-model="basicVisible" title="基础弹窗" width="520px" draggable>
      <p style="line-height: 1.8; color: var(--text-secondary);">这是一个支持拖拽、背景模糊、ESC 关闭、点击遮罩关闭的基础弹窗。</p>
      <p style="line-height: 1.8; color: var(--text-secondary);">你可以通过 header/footer 插槽自定义标题区和底部按钮区。</p>
      <template #footer>
        <div class="row gap-sm" style="justify-content: flex-end;">
          <StatusTag text="取消" @click="basicVisible = false" />
          <StatusTag type="primary" text="确定" @click="basicVisible = false" />
        </div>
      </template>
    </Dialog>

    <!-- 全屏弹窗（含 Tabs + 图片宫格） -->
    <Dialog v-model="fullVisible" title="全屏弹窗示例" fullscreen>
      <Tabs v-model="fullTab" type="segment">
        <TabPane label="图片" name="img">
          <ImagePreviewGroup>
            <div class="img-grid">
              <Image v-for="(u,i) in demoImgs" :key="i" :src="u" shape="rounded" :width="180" :height="130" />
            </div>
          </ImagePreviewGroup>
        </TabPane>
        <TabPane label="数据" name="data">
          <div class="tab-pane-content">
            <div class="row gap-md" style="flex-wrap: wrap;">
              <StatCard label="问题总数" :value="26" unit="条" trend="down" trend-value="12%" />
              <StatCard label="已整改" :value="22" unit="条" trend="up" trend-value="8%" />
              <StatCard label="整改中" :value="4" unit="条" trend="down" trend-value="3%" />
              <StatCard label="整改率" :value="84.6" unit="%" trend="up" trend-value="5.2%" />
            </div>
          </div>
        </TabPane>
      </Tabs>
      <template #footer>
        <div class="row gap-sm" style="justify-content: flex-end;">
          <StatusTag type="primary" text="关闭" @click="fullVisible = false" />
        </div>
      </template>
    </Dialog>

    <!-- LPA详情弹窗：左描述右图集 -->
    <Dialog v-model="lpaVisible" title="LPA问题详情" width="880px" draggable>
      <div class="lpa-detail">
        <div class="lpa-left">
          <div class="detail-row"><span class="label">日期</span><span class="val">2026-11-15 白班</span></div>
          <div class="detail-row"><span class="label">线体</span><span class="val">PACK装配线</span></div>
          <div class="detail-row"><span class="label">问题等级</span><Tag type="danger" text="重大" size="small" /></div>
          <div class="detail-row col"><span class="label">问题描述</span>
            <span class="val">工位3条码标签张贴偏移约3mm，经治具定位检查，发现治具定位销磨损导致偏差。</span>
          </div>
          <div class="detail-row col"><span class="label">整改措施</span>
            <span class="val">更换磨损定位销，调整治具定位精度，重新校准打印位置。</span>
          </div>
          <div class="detail-row col">
            <span class="label">整改进度</span>
            <Progress :percentage="65" status="warning" striped :stroke-width="10" />
          </div>
        </div>
        <div class="lpa-right">
          <div class="label">现场图片（点击放大）</div>
          <ImagePreviewGroup>
            <div class="img-grid-vertical">
              <Image v-for="(u,i) in demoImgs.slice(0,4)" :key="i" :src="u" shape="rounded" :width="160" :height="120" />
            </div>
          </ImagePreviewGroup>
        </div>
      </div>
      <template #footer>
        <div class="row gap-sm" style="justify-content: flex-end;">
          <StatusTag text="关闭" @click="lpaVisible = false" />
          <StatusTag type="success" text="确认整改完成" @click="lpaVisible = false" />
        </div>
      </template>
    </Dialog>
  </ScreenContainer>
</template>

<script setup>
import { ref } from 'vue'
import ScreenContainer from '@/components/layout/ScreenContainer.vue'
import Tag from '@/components/common/Tag.vue'
import Progress from '@/components/common/Progress.vue'
import Tabs from '@/components/common/Tabs.vue'
import TabPane from '@/components/common/TabPane.vue'
import Image from '@/components/common/Image.vue'
import ImagePreviewGroup from '@/components/common/ImagePreviewGroup.vue'
import Dialog from '@/components/common/Dialog.vue'
import StatCard from '@/components/common/StatCard.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { previewImage } from '@/utils/imagePreview'

// 用 public/img 下真实存在的图片
const demoImg = '/img/image28.jpeg'
const demoImgs = [
  '/img/image1.jpeg', '/img/image2.jpeg', '/img/image3.jpeg',
  '/img/image4.jpeg', '/img/image5.jpeg', '/img/image6.jpeg',
  '/img/image7.jpeg', '/img/image8.jpeg'
]

// Tabs 状态
const tab1 = ref('week')
const tab2 = ref('all')
const tab3 = ref('day')
const fullTab = ref('img')

// Dialog 状态
const basicVisible = ref(false)
const fullVisible = ref(false)
const lpaVisible = ref(false)

const tagMsg = (m) => console.log('tag event:', m)
const openByJs = () => {
  previewImage({ urls: demoImgs, initialIndex: 2 })
}
</script>

<style lang="scss" scoped>
.common-demo-page {
  min-height: 100vh;
  background: var(--color-bg-soft);
  padding: 24px 32px 80px;
  overflow-y: auto;
  position: relative;
}

.nav-pills {
  position: fixed;
  top: 16px; right: 24px; z-index: 100;
  display: flex; gap: 8px;
  padding: 4px;
  background: #fff;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  .pill {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: all 0.2s;
    &:hover { background: var(--color-bg-soft); color: var(--color-text-primary); }
    &.active { background: var(--color-primary); color: #fff; }
  }
}

.demo-container {
  max-width: 1360px;
  margin: 0 auto;
  padding-top: 40px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}
.page-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0 0 24px;
  line-height: 1.6;
  b { color: var(--color-primary); font-weight: 600; }
  code {
    padding: 2px 6px;
    background: var(--color-bg-soft);
    border-radius: 4px;
    font-size: 13px;
    color: var(--color-warning);
  }
}

.section {
  margin-bottom: 24px;
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 12px;
    padding-left: 10px;
    border-left: 3px solid var(--color-primary);
  }
  .section-desc {
    font-size: 13px;
    color: var(--color-text-muted);
    margin: 0 0 16px;
    line-height: 1.6;
    code {
      padding: 2px 6px;
      background: var(--color-bg-soft);
      border-radius: 4px;
      font-size: 12px;
      color: var(--color-warning);
    }
  }
}

.demo-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.row { display: flex; align-items: center; }
.gap-sm { gap: 8px; }
.gap-md { gap: 16px; }
.flex-wrap { flex-wrap: wrap; }

.demo-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
  font-weight: 500;
  :deep(.progress) { margin-bottom: 12px; }
}

.tab-pane-content {
  padding: 20px;
  font-size: 14px;
  color: var(--color-text-secondary);
  min-height: 80px;
}

.img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.img-grid-vertical {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* LPA 卡片演示 */
.lpa-card-demo {
  cursor: pointer;
  padding: 16px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(var(--color-primary), 0.12);
    transform: translateY(-2px);
  }
  .lpa-card-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px;
    .lpa-date { font-size: 13px; color: var(--color-text-muted); }
  }
  .lpa-desc {
    font-size: 14px;
    color: var(--color-text-primary);
    line-height: 1.6;
    margin-bottom: 12px;
  }
  .lpa-meta {
    display: flex; align-items: center; gap: 20px;
    .lpa-thumbs { display: flex; gap: 8px; }
    .lpa-progress { flex: 1;
      .progress-label { font-size: 12px; color: var(--color-text-muted); margin-bottom: 4px; }
    }
  }
}

/* LPA 详情弹窗 */
.lpa-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  .detail-row {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 0;
    font-size: 14px;
    &.col { flex-direction: column; align-items: flex-start; gap: 6px; }
    .label { color: var(--color-text-muted); min-width: 70px; }
    .val { color: var(--color-text-primary); line-height: 1.6; flex: 1; }
  }
  .lpa-right .label {
    font-size: 13px; color: var(--color-text-secondary); font-weight: 500;
    margin-bottom: 10px; display: block;
  }
}

@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
  .lpa-detail { grid-template-columns: 1fr; }
}
</style>
