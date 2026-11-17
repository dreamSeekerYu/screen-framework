# Common 通用组件说明

本目录为大屏项目的通用基础组件，全部使用 SCSS 变量 + CSS 自定义属性，自动跟随 `data-theme`（dark-blue / gov-red / light-business）主题切换。

---

## Dialog 页面级弹窗

```vue
<Dialog v-model="visible" title="问题详情" width="900px" draggable>
  <div>弹窗内容</div>
  <template #footer>
    <button @click="visible = false">关闭</button>
  </template>
</Dialog>
```

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| v-model | Boolean | false | 显示/隐藏 |
| title | String | '' | 标题（也可通过 #header 插槽自定义） |
| width | String/Number | '60%' | 宽度 |
| size | String | 'default' | small/default/large |
| fullscreen | Boolean | false | 是否全屏 |
| draggable | Boolean | false | 头部是否可拖拽 |
| closeOnClickModal | Boolean | true | 点击遮罩关闭 |
| closeOnPressEscape | Boolean | true | ESC 关闭 |
| blur | Boolean | true | 遮罩背景模糊 |
| top | String | '10vh' | 距顶距离 |

事件：`@open` `@close` `@opened` `@closed`；插槽：`#header` `#header-extra` `#footer`。

---

## Tabs / TabPane 标签页切换

```vue
<Tabs v-model="tab" type="card">
  <TabPane label="本周" name="week">内容</TabPane>
  <TabPane label="本月" name="month" badge="3">内容</TabPane>
</Tabs>
```

Tabs Props：

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| v-model | String/Number | 0 | 当前激活项 |
| type | String | 'card' | line / card / segment |
| stretch | Boolean | false | segment 类型下是否均分宽度 |

TabPane Props：`label`、`name`、`disabled`、`badge`。
事件：`@change`。

---

## ImagePreview 图片预览

支持单张/多张、缩放、旋转、拖拽、滚轮缩放、键盘方向键切换、全屏、下载、缩略图列表。

```vue
<ImagePreview v-model="previewVisible" :urls="imgList" :initial-index="0" />
```

触发方式：通常配合 `ImagePlaceholder` 或 `Image` 点击后把 v-model 置 true，urls 可以是字符串数组或单个字符串。

快捷键：← → 切换、+/- 缩放、Esc 关闭、双击图片重置。

---

## Image 图片（带加载/失败状态）

```vue
<Image src="/img/xx.jpeg" fit="cover" width="120px" height="80px" @click="preview" />
```

Props：`src`、`alt`、`width`、`height`、`fit`（fill/contain/cover/none/scale-down）、`loadingText`、`errorText`。
事件：`@load` `@error` `@click`。

---

## ImagePlaceholder 图片占位（带懒加载+骨架屏）

专为大屏列表/表格缩略图设计，默认 IntersectionObserver 懒加载，未加载时显示骨架屏，加载失败显示图标。

```vue
<ImagePlaceholder
  :src="item.img"
  shape="rounded"
  width="80px"
  height="60px"
  clickable
  @click="openPreview"
/>
```

Props：`src`、`width`、`height`、`shape`（square/rounded/circle）、`text`、`errorText`、`clickable`、`lazy`。
插槽：`#icon`（自定义占位图标）、`#hover`（自定义 hover 蒙层内容）。

---

## Tag 标签

```vue
<Tag text="已完成" type="success" closable @close="onClose" />
```

Props：`text`、`type`（default/primary/success/info/warning/danger）、`size`（small/default/large）、`round`、`closable`。

> 注意与 `StatusTag` 的区别：StatusTag 用于状态强调（多为实色填充），Tag 用于数据标注（描边半透明风格，更适合大屏深色背景）。

---

## Progress 进度条

```vue
<Progress :percentage="78" status="success" :stroke-width="10" striped />
```

Props：`percentage`（0–100）、`status`（success/warning/danger）、`strokeWidth`、`color`（单色或色数组渐变）、`trackColor`、`showText`、`textInside`、`striped`（斑马条纹动效）、`duration`。
插槽：`#text`（自定义百分比文字）。
