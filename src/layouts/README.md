# 布局模板（新页面开发规范）

新增大屏页面从注册中心（`src/config/pages.js`）的 `layout` 字段选择骨架，
模板的作用是把「1080 一屏约束」和统一的间距体系固化，避免逐页自由发挥。

## 基础件

- `PageShell.vue` —— 页面根骨架：KPI 行（固定高度）+ 主体区（占满剩余高度）+ 可选页脚。
  整页 `overflow: hidden`，内部滚动只能出现在面板内部（列表/表格）。

## 三种标准骨架

| layout | 结构 | 参考页面 |
|---|---|---|
| `kpi-grid` | PageShell > #kpi(KPI 卡行) + 图表/卡片栅格 | `/pack` 总览、`/question` |
| `kpi-table` | PageShell > #kpi + 上图表下明细表（表头吸顶+斑马纹） | `/plain`、`/pack` 详情 |
| `tabbed-matrix` | PageShell > Tab 行 + 矩阵看板/详情视图 | `/think`、`/pack` 客户详情 |

## 新页面接入步骤

1. 注册中心加一条记录（含 `layout`、`badge`、`desc`、`nav`、`carousel`）
2. 建 `views/{View}/index.vue`，根节点用 `<PageShell>`
3. 数据层走 `dataLoader.loadSheet` / 独立 parse 适配器，输出 `kpis/charts/tables/insights`
4. 图表一律 `BaseChart`，配色一律 `chartTheme.js` 的 `chartC` 语义色（禁 hex/写死）
5. 开发期挂 `usePageOverflowGuard()`，控制台出现 overflow 告警即需压缩布局
6. 需要轮播用 `useCarousel`，时间窗用 `useTimeWindow`，问题联动用 `useMarkPointLink`

## 完成后自查（新页面 checklist）

- [ ] 注册中心已登记，翻页链路/首页卡片自动出现
- [ ] 页面根节点为 PageShell，整页无滚动（1024×768~1920×1080 均一屏）
- [ ] 无 `import * as echarts`、无 `resolveCssVars` 手写图表初始化
- [ ] 无旧命名 token（`--card-bg`/`--border-color`/`--text-body`），只用 `--color-*`
- [ ] 无写死业务数值/文案（副标题、结论等由数据或规则引擎生成）
- [ ] 四套主题截图核对（淡色商务/淡色青碧/科技深蓝/政务红金）
