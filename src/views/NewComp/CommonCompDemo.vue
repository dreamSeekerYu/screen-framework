<template>
  <div style="padding: 40px 40px 80px; background: #f5f7fa; min-height: 100vh; box-sizing: border-box;">
    <h2 style="margin-bottom: 24px; color: #1d2129;">🧩 通用组件展示 - Dialog / Image / ImagePlaceholder / ImagePreview / Tabs / Tag / Progress</h2>

    <!-- ========== Tag 标签 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">一、Tag 标签</h3>
      <Card title="基础类型">
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <Tag text="默认 default" type="default" />
          <Tag text="主要 primary" type="primary" />
          <Tag text="成功 success" type="success" />
          <Tag text="警告 warning" type="warning" />
          <Tag text="危险 danger" type="danger" />
          <Tag text="信息 info" type="info" />
          <Tag text="青色 cyan" type="cyan" />
          <Tag text="紫色 purple" type="purple" />
        </div>
      </Card>
      <Card title="可关闭 + 自定义色">
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <Tag text="可关闭标签" closable @close="onTagClose" />
          <Tag text="自定义主色 #ec4899" color="#ec4899" />
          <Tag text="边框透明模式" type="primary" plain />
          <Tag text="小尺寸" size="small" type="success" />
        </div>
      </Card>
    </div>

    <!-- ========== Progress 进度条 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">二、Progress 进度条</h3>
      <Card title="状态色 + 文字内外">
        <Progress :percentage="40" status="primary" :text-inside="true" :stroke-width="18" />
        <div style="height: 12px;"></div>
        <Progress :percentage="65" status="success" :text-inside="true" :stroke-width="18" />
        <div style="height: 12px;"></div>
        <Progress :percentage="78" status="warning" :text-inside="true" :stroke-width="18" />
        <div style="height: 12px;"></div>
        <Progress :percentage="92" status="danger" :text-inside="true" :stroke-width="18" />
        <div style="height: 12px;"></div>
        <Progress :percentage="85" color="#722ed1" :text-inside="true" :stroke-width="18" />
      </Card>
      <Card title="条纹动效 + 外部文字">
        <Progress :percentage="55" status="success" striped :stroke-width="12" text="防错覆盖度" />
        <div style="height: 12px;"></div>
        <Progress :percentage="72" status="primary" striped :stroke-width="12" text="项目完成率" />
        <div style="height: 12px;"></div>
        <Progress :percentage="36" status="warning" striped :stroke-width="12" text="问题整改率" />
        <div style="height: 12px;"></div>
        <Progress :percentage="100" status="success" :stroke-width="12" text="按期闭环率 100%" />
      </Card>
    </div>

    <!-- ========== Tabs 标签页 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">三、Tabs 标签切换</h3>
      <Card title="type=line（默认）">
        <Tabs v-model="tabLine">
          <TabPane label="周度数据" name="w"><p style="padding: 16px 0; color: #4e5969;">当前展示 CW44 周度数据</p></TabPane>
          <TabPane label="月度汇总" name="m"><p style="padding: 16px 0; color: #4e5969;">当前展示 11 月汇总数据</p></TabPane>
          <TabPane label="季度趋势" name="q"><p style="padding: 16px 0; color: #4e5969;">Q4 季度趋势</p></TabPane>
        </Tabs>
      </Card>
      <Card title="type=card 卡片标签">
        <Tabs v-model="tabCard" type="card">
          <TabPane label="工艺优化" name="a"><p style="padding: 16px 0; color: #4e5969;">工艺优化相关内容</p></TabPane>
          <TabPane label="质量异常" name="b" badge="3"><p style="padding: 16px 0; color: #4e5969;">3 条未闭环质量异常</p></TabPane>
          <TabPane label="设备维护" name="c"><p style="padding: 16px 0; color: #4e5969;">设备维护计划</p></TabPane>
          <TabPane label="人员培训" name="d" disabled><p style="padding: 16px 0; color: #86909c;">（禁用）</p></TabPane>
        </Tabs>
      </Card>
      <Card title="type=segment 分段控件" style="grid-column: 1 / -1;">
        <Tabs v-model="tabSeg" type="segment">
          <TabPane label="本周" name="w"><p style="padding: 16px 0; color: #4e5969;">本周工作计划与执行情况</p></TabPane>
          <TabPane label="上周" name="l"><p style="padding: 16px 0; color: #4e5969;">上周工作回顾</p></TabPane>
          <TabPane label="下周" name="n"><p style="padding: 16px 0; color: #4e5969;">下周重点事项</p></TabPane>
        </Tabs>
      </Card>
    </div>

    <!-- ========== Image / ImagePlaceholder 图片 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">四、Image 与 ImagePlaceholder 图片组件</h3>
      <Card title="Image 基础用法">
        <Image src="/img/image1.jpeg" fit="cover" :height="180" />
        <p style="margin-top: 8px; font-size: 13px; color: #86909c;">基础图片组件，支持 loading 与错误占位</p>
      </Card>
      <Card title="ImagePlaceholder 默认（方形）">
        <ImagePlaceholder src="/img/image2.jpeg" shape="square" :height="180" />
      </Card>
      <Card title="ImagePlaceholder 圆角 + hover 蒙层">
        <ImagePlaceholder src="/img/image3.jpeg" shape="rounded" :height="180" clickable @click="openPreview(0)" />
        <p style="margin-top: 8px; font-size: 13px; color: #86909c;">点击即可打开图片预览</p>
      </Card>
      <Card title="ImagePlaceholder 圆形头像">
        <div style="display: flex; justify-content: center;">
          <ImagePlaceholder src="/img/image4.jpeg" shape="circle" :width="140" :height="140" />
        </div>
      </Card>
      <Card title="加载失败占位">
        <ImagePlaceholder src="/img/not-exist.jpeg" shape="rounded" :height="180" />
      </Card>
    </div>

    <!-- ========== Dialog 弹窗 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">五、Dialog 页面级弹窗</h3>
      <Card title="基础弹窗">
        <StatusTag type="primary" text="打开基础弹窗" @click="dialogBasic = true" />
        <p style="margin-top: 12px; font-size: 13px; color: #86909c;">支持拖拽、ESC 关闭、遮罩点击关闭</p>
      </Card>
      <Card title="全屏弹窗">
        <StatusTag type="success" text="打开全屏弹窗" @click="dialogFull = true" />
        <p style="margin-top: 12px; font-size: 13px; color: #86909c;">可在普通 / 全屏之间切换，适合展示图表、详情</p>
      </Card>
      <Card title="自定义底部插槽">
        <StatusTag type="warning" text="打开确认弹窗" @click="dialogFooter = true" />
        <p style="margin-top: 12px; font-size: 13px; color: #86909c;">footer 插槽自定义按钮区</p>
      </Card>
    </div>

    <!-- ========== ImagePreview 图片预览 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 32px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">六、ImagePreview 图片预览</h3>
      <Card title="单图预览">
        <StatusTag type="primary" text="打开单张预览" @click="openPreview(0)" />
        <p style="margin-top: 12px; font-size: 13px; color: #86909c;">支持滚轮缩放、旋转、拖拽、ESC 关闭</p>
      </Card>
      <Card title="多图轮播预览">
        <StatusTag type="success" text="打开多图预览" @click="openPreview(0, true)" />
        <p style="margin-top: 12px; font-size: 13px; color: #86909c;">支持 ← → 键盘切换、底部缩略图</p>
      </Card>
      <Card title="从第 3 张开始预览">
        <StatusTag type="cyan" text="从第 3 张开始" @click="openPreview(2)" />
      </Card>
    </div>

    <!-- ========== 综合示例 ========== -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 20px;">
      <h3 style="grid-column: 1 / -1; margin: 0 0 8px 0; color: #4e5969;">七、组合示例 - LPA 问题详情弹窗</h3>
      <Card title="模拟 LPA 问题卡片（点击查看详情）" style="grid-column: 1 / -1;">
        <div style="display: flex; gap: 16px; align-items: flex-start; cursor: pointer;" @click="dialogLpa = true">
          <ImagePlaceholder src="/img/image5.jpeg" shape="rounded" :width="140" :height="100" clickable />
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <Tag text="待整改" type="warning" />
              <Tag text="白班" type="primary" />
              <span style="font-size: 13px; color: #86909c;">2026-11-15</span>
            </div>
            <p style="font-size: 15px; color: #1d2129; margin-bottom: 6px;">装配线 B 工位工装夹具未按 SOP 归位，存在碰划伤风险</p>
            <p style="font-size: 13px; color: #86909c;">整改进度：</p>
            <Progress :percentage="60" status="warning" :stroke-width="8" :text-inside="true" style="margin-top: 6px;" />
          </div>
        </div>
      </Card>
    </div>

    <!-- ========== Dialog 实例 ========== -->
    <Dialog v-model="dialogBasic" title="基础弹窗" width="560px">
      <p style="line-height: 1.8; color: #4e5969;">这是一个基础页面级弹窗组件，支持：</p>
      <ul style="margin-top: 8px; padding-left: 20px; line-height: 2; color: #4e5969;">
        <li>标题栏拖拽移动</li>
        <li>ESC 键关闭</li>
        <li>遮罩层点击关闭</li>
        <li>过渡动画</li>
        <li>支持 title / default / footer 三个插槽</li>
      </ul>
    </Dialog>

    <Dialog v-model="dialogFull" title="全屏弹窗 - 数据详情" width="90%" :fullscreen.sync="fullscreenVal" show-fullscreen>
      <Tabs v-model="dialogTab" type="card">
        <TabPane label="图表" name="c">
          <div style="height: 400px; display: flex; align-items: center; justify-content: center; color: #86909c; border: 1px dashed #e5e6eb; border-radius: 8px;">
            此处可放置 ECharts 图表
          </div>
        </TabPane>
        <TabPane label="图片" name="i">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <ImagePlaceholder v-for="(u, i) in previewUrls" :key="i" :src="u" shape="rounded" :height="180" clickable @click="openPreview(i)" />
          </div>
        </TabPane>
        <TabPane label="描述" name="d">
          <p style="line-height: 2; color: #4e5969; padding: 12px 0;">全屏模式适合展示复杂数据、大图、长表格，右上角按钮可在普通 / 全屏间自由切换。</p>
        </TabPane>
      </Tabs>
    </Dialog>

    <Dialog v-model="dialogFooter" title="确认操作" width="480px">
      <p style="line-height: 1.8; color: #4e5969;">确认要提交当前整改措施吗？提交后将同步至质量系统，且无法撤回。</p>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <StatusTag type="default" text="取消" @click="dialogFooter = false" />
          <StatusTag type="primary" text="确认提交" @click="dialogFooter = false" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model="dialogLpa" title="LPA 问题详情" width="780px" show-fullscreen>
      <div style="display: flex; gap: 16px; margin-bottom: 16px;">
        <Tag text="待整改" type="warning" />
        <Tag text="白班" type="primary" />
        <Tag text="装配车间" type="info" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <p style="font-size: 13px; color: #86909c; margin-bottom: 6px;">问题描述</p>
          <p style="color: #1d2129; line-height: 1.7; background: #f7f8fa; padding: 12px; border-radius: 6px;">
            装配线 B 工位工装夹具未按 SOP 归位，存在碰划伤风险，现场要求立即整改。
          </p>
          <p style="font-size: 13px; color: #86909c; margin: 12px 0 6px;">整改措施</p>
          <p style="color: #1d2129; line-height: 1.7; background: #f7f8fa; padding: 12px; border-radius: 6px;">
            责任班组长立即归位夹具，对该班组开展 SOP 再培训，并在每日班前会强调。
          </p>
          <p style="font-size: 13px; color: #86909c; margin: 12px 0 6px;">整改进度</p>
          <Progress :percentage="60" status="warning" :stroke-width="10" :text-inside="true" />
        </div>
        <div>
          <p style="font-size: 13px; color: #86909c; margin-bottom: 8px;">问题现场图片（点击放大）</p>
          <ImagePlaceholder src="/img/image5.jpeg" shape="rounded" :height="260" clickable @click="openPreview(4)" />
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <StatusTag type="default" text="关闭" @click="dialogLpa = false" />
          <StatusTag type="primary" text="标记已整改" @click="dialogLpa = false" />
        </div>
      </template>
    </Dialog>

    <!-- 图片预览（全局单例） -->
    <ImagePreview v-model="previewShow" :urls="previewUrls" :initial-index="previewIndex" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Card from './CardWrap.vue'
import Tag from '@/components/common/Tag.vue'
import Progress from '@/components/common/Progress.vue'
import Tabs from '@/components/common/Tabs.vue'
import TabPane from '@/components/common/TabPane.vue'
import Image from '@/components/common/Image.vue'
import ImagePlaceholder from '@/components/common/ImagePlaceholder.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'
import Dialog from '@/components/common/Dialog.vue'
import StatusTag from '@/components/common/StatusTag.vue'

// Tabs
const tabLine = ref('w')
const tabCard = ref('b')
const tabSeg = ref('w')
const dialogTab = ref('c')

// Dialog
const dialogBasic = ref(false)
const dialogFull = ref(false)
const dialogFooter = ref(false)
const dialogLpa = ref(false)
const fullscreenVal = ref(false)

// ImagePreview
const previewShow = ref(false)
const previewIndex = ref(0)
const previewUrls = ref([
  '/img/image1.jpeg',
  '/img/image2.jpeg',
  '/img/image3.jpeg',
  '/img/image4.jpeg',
  '/img/image5.jpeg',
  '/img/image6.jpeg'
])

const openPreview = (idx, multi = false) => {
  previewIndex.value = idx
  if (multi) {
    // keep all
  }
  previewShow.value = true
}

const onTagClose = (e) => {
  console.log('tag closed', e)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
