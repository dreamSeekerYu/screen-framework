子组件插槽位置不要放  注释类型的模版 tamplate 容易导致不展示并且查找不出原因

所有业务主页面均需要展示主题色切换按钮，（首页的主题色切换按钮需要调暗点）
## 新增大屏页面 checklist（20+ 页面规模化规范）

- [ ] 注册中心 `src/config/pages.js` 加一条记录（含 layout/badge/desc/nav/carousel），路由/翻页白名单/首页卡片自动生成，不手改 router 与 navPages
- [ ] 页面根节点用 `src/layouts/PageShell.vue`，整页无滚动（参考 src/layouts/README.md 三种骨架）
- [ ] 图表一律 `BaseChart`；配色一律 `chartTheme.js` 的 `chartC` 语义色 / `chartPalette()`，禁止写死 hex
- [ ] 禁止 `import * as echarts` 全量直连、禁止手写 `echarts.init` / `resolveCssVars` / `setInterval` 轮询
- [ ] 禁止旧命名 token（--text-main/--card-bg/--border-color 等），统一 `--color-*`；兼容层已弃用
- [ ] 阈值/目标口径集中到 `src/config/businessRules.js`，展示文案与判定共用同一来源
- [ ] 无写死业务数值/文案：KPI 副标题、结论、问题清单等由数据或规则引擎生成（范本：packRiskRules.js）
- [ ] 逻辑复用优先 composables：useCarousel / useTimeWindow / useMarkPointLink / usePageOverflowGuard
- [ ] dev 模式控制台不得出现 `[overflow-guard]` 溢出告警；四套主题截图核对后再提测
