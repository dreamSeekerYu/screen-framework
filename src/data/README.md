# src/data/ 目录说明

**请勿把 Excel 转换出的大 JSON 放回本目录**：
- 所有数据文件已迁移到 `public/data/`（压缩版），由 `src/utils/dataLoader.js` 异步加载；
- 如果放回 `src/data/` 并被 `import` 静态引用，Vite 会把整个 JSON 打进主 JS chunk，导致首屏体积暴涨。

数据更新方式（`public/Excel转JSON服务.bat` 一键流水线）：
1. 把 xlsx 放到共享目录，或直接修改 `.bat` 里的 `SHARE` 路径；
2. 双击 `public/Excel转JSON服务.bat`：自动拉取 xlsx → 转换 JSON 到 `public/data/`、导出图片到 `public/img/` → 启动 8080 局域网静态服务；
3. 页面代码无需改动，刷新即可看到新数据。

业务代码读取数据请统一使用：
```js
import { loadSheet } from '@/utils/dataLoader.js'
const sheet = await loadSheet('lpa')         // 加载 LPA 数据
const sheet = await loadSheet('main', 1)     // 指定 sheet 下标
```

可用别名（来自 `src/utils/dataLoader.js` 的 `FILE_MAP`）：
- `main` / `data`  → 周报源数据.json（周报原始数据）
- `lpa`            → LPA审核问题闭环.json（LPA 分层过程审核）
- `pack`           → pack客户表现.json
- `plan`           → 周度工作计划.json
- `think`          → 周度思考.json
- `question`       → 重大质量异常闭环.json
- `cpk`            → 过程能力达标率.json
- `qc`             → qc人力.json

> 转换脚本以 Excel 文件名作为 JSON 文件名，共享目录里的 xlsx 命名需与上表保持一致，改名会导致页面 404。
