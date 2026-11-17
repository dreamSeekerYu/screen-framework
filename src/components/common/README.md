# 通用组件文档

所有组件已适配大屏三套主题（科技深蓝 / 政务红金 / 浅色商务），会自动跟随主题切换。

---

## 组件清单

| 组件 | 文件 | 说明 |
|---|---|---|
| Tag | Tag.vue | 标签，8种状态色、支持可关闭/自定义色/透明边框 |
| Progress | Progress.vue | 进度条，支持条纹动效/内置外置文字/自定义渐变 |
| Tabs / TabPane | Tabs.vue / TabPane.vue | 标签页切换，三种风格：line/card/segment |
| Image | Image.vue | **单图组件**：整合懒加载、loading 占位、错误占位、hover 放大镜、点击预览 |
| ImagePreviewGroup | ImagePreviewGroup.vue | **图集预览组**：用 provide/inject 收集子 `<Image>`，缩略图点击自动联动预览 |
| Dialog | Dialog.vue | 页面级弹窗：拖拽、全屏、ESC/遮罩关闭、过渡动画 |
| ImagePreview | ImagePreview.vue | 预览底层组件，通常不直接使用，用函数式 API `previewImage` 唤起 |

> 图片相关原 `ImagePlaceholder.vue` 已整合进 `Image.vue`，删除冗余，不再单独提供。

---

## Image（核心图片组件）

```vue
<Image src="/img/a.jpeg" />
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| src | string | '' | 图片地址 |
| alt | string | '' | 替代文本 |
| width / height | string/number | '' | 尺寸，数字默认 px |
| radius | string | '' | 自定义圆角，不填跟随 shape |
| shape | 'square'\|'rounded'\|'circle' | 'rounded' | 形状 |
| fit | 'fill'\|'contain'\|'cover'\|'none'\|'scale-down' | 'cover' | object-fit 填充模式 |
| lazy | boolean | true | 是否启用 IntersectionObserver 懒加载 |
| preview | boolean \| string[] | - | 是否点击预览：<br>- `true` 单图预览<br>- `string[]` 自定义图集<br>- 不填但外层包裹了 ImagePreviewGroup，自动加入组内图集 |
| onClick | Function | null | 自定义点击，设置后会覆盖默认预览行为 |

插槽：`#loading` 自定义加载中占位、`#error` 自定义加载失败占位。

### 三种预览用法

```vue
<!-- 1. 单图点击预览 -->
<Image :src="url" preview />

<!-- 2. 单图点击打开自定义图集（当前图在图集中定位） -->
<Image :src="url" :preview="allUrls" />

<!-- 3. 由 Group 自动收集图集，无需维护 urls 数组 -->
<ImagePreviewGroup>
  <Image v-for="u in urls" :key="u" :src="u" :width="100" :height="80" />
</ImagePreviewGroup>
```

### JS 函数式唤起（无需写模板组件）

```js
import { previewImage } from '@/utils/imagePreview'
previewImage({ urls: imgList, initialIndex: 2 })
// 或直接用 window.$previewImage({...})
```

---

## ImagePreviewGroup（图集组）

将若干 `<Image>` 包在 `<ImagePreviewGroup>` 里，组内任意图片点击时自动以图集方式预览（带左右切换、底部缩略图、键盘 ←→ 切换、滚轮缩放、旋转、下载）。

```vue
<ImagePreviewGroup>
  <div class="grid">
    <Image v-for="u in list" :key="u" :src="u" :width="120" :height="90" />
  </div>
</ImagePreviewGroup>
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| current | number | 0 | 初始索引（通常不需要，组件会按点击的图片自动定位） |

组件内部使用 `display: contents`，不会额外增加 DOM 层级，不影响你的布局。

---

## Tag

```vue
<Tag type="primary" text="标签" />
<Tag type="danger" text="可关闭" closable @close="..." />
<Tag color="#FF9500" text="自定义色" />
<Tag plain type="success" text="透明边框" />
<Tag size="small" text="小尺寸" />
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| text | string | '' | 标签文字 |
| type | 'default'\|'primary'\|'success'\|'warning'\|'danger'\|'info'\|'cyan'\|'purple' | 'default' | 状态色 |
| color | string | '' | 自定义颜色（优先于 type） |
| plain | boolean | false | 透明描边风格 |
| closable | boolean | false | 是否显示关闭按钮 |
| size | 'default'\|'small' | 'default' | 尺寸 |

事件：`@close` 关闭按钮点击。

---

## Progress

```vue
<Progress :percentage="65" status="success" striped text-inside />
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| percentage | number | 0 | 百分比 0-100 |
| status | 'primary'\|'success'\|'warning'\|'danger'\|'info' | 'primary' | 状态色 |
| strokeWidth | number | 8 | 进度条粗细 px |
| textInside | boolean | false | 文字在进度条内显示 |
| striped | boolean | false | 斑马条纹动效 |
| showText | boolean | true | 是否显示文字 |
| color | string | '' | 自定义颜色/渐变，如 `linear-gradient(90deg, #f66, #f90)` |

---

## Tabs / TabPane

```vue
<Tabs v-model="active" type="card">
  <TabPane label="本周" name="week">...</TabPane>
  <TabPane label="本月" name="month" badge="3">...</TabPane>
  <TabPane label="归档" name="archived" disabled>...</TabPane>
</Tabs>
```

**Tabs props**

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| modelValue | string/number | '' | v-model 绑定当前激活的 pane name |
| type | 'line'\|'card'\|'segment' | 'line' | 风格 |

**TabPane props**

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| label | string | '' | 标签文字 |
| name | string/number | '' | 唯一标识 |
| disabled | boolean | false | 禁用 |
| badge | string/number | '' | 右上角徽标（小红点/数字） |

---

## Dialog

```vue
<Dialog v-model="visible" title="标题" width="600px" draggable>
  内容
  <template #footer>
    <StatusTag text="取消" @click="visible=false" />
    <StatusTag type="primary" text="确定" @click="visible=false" />
  </template>
</Dialog>
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| modelValue | boolean | false | v-model 控制显隐 |
| title | string | '' | 标题 |
| width | string | '520px' | 宽度 |
| top | string | '12vh' | 距顶距离 |
| fullscreen | boolean | false | 是否全屏 |
| draggable | boolean | true | 是否允许拖拽标题栏移动 |
| closeOnClickModal | boolean | true | 点击遮罩关闭 |
| closeOnPressEscape | boolean | true | 按 ESC 关闭 |
| showClose | boolean | true | 是否显示右上角关闭按钮 |
| modal | boolean | true | 是否显示遮罩 |
| appendToBody | boolean | true | 是否挂载到 body |

插槽：`#header` 自定义头部、`#footer` 自定义底部、`#default` 内容区。

事件：`@open`、`@close`、`@opened`、`@closed`。
