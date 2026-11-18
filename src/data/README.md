# src/data/ 目录说明

**请勿把 Excel 转换出的大 JSON 放回本目录**：
- 所有数据文件已迁移到 `public/data/`（压缩版），由 `src/utils/dataLoader.js` 异步加载；
- 如果放回 `src/data/` 并被 `import` 静态引用，Vite 会把整个 JSON 打进主 JS chunk，导致首屏体积暴涨。

数据更新方式：
1. 将 Excel 重新导出的原始 JSON 放到项目外部（不要进 src）；
2. 运行构建脚本 `npm run data` 压缩；
3. 压缩产物自动写入 `public/data/`，页面代码无需改动。

业务代码读取数据请统一使用：
```js
import { loadSheet } from '@/utils/dataLoader.js'
const sheet = await loadSheet('lpa')         // 加载 LPA 数据
const sheet = await loadSheet('main', 1)     // 指定 sheet 下标
```

可用别名：
- `main` / `data`  → data.json（周报原始数据）
- `lpa`           → dataLPA.json（LPA 分层过程审核）
- `pack`          → pack客户表现.json
- `plan`          → 周度工作计划.json
