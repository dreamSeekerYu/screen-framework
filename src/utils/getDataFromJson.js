/**
 * 获取指定单元格引用的图片（例如J4格的图片） 
**/
function getImagesAtCell(sheet, cellRef) {
    const cell = sheet.cells[cellRef];
    if (!cell || !cell.images) return [];
    return cell.images.map(id => sheet.images.find(i => i.id === id)).filter(Boolean);
}

// 使用：把J4的图片放到页面指定位置 // img.src 是相对路径（如 "img/image8.jpeg"），浏览器会自动按同目录请求 
// const sheet = data.sheets[0];
// const imgs = getImagesAtCell(sheet, 'J4');
// document.getElementById('my-image-slot').innerHTML = imgs.map(img => `<img src="${img.src}" style="max-width:300px">`).join('');

/**
 *      遍历所有数据行
**/
// sheet.rows.forEach(row => {
//     console.log('第' + row._row + '行：', row);
//     // 用表头字段名访问
//     const desc = row['问题描述'];
//     const status = row['状态'];
//     // 如果该行有图片 
//     if (row._images) {
//         row._images.forEach(imgId => {
//             const img = sheet.images.find(i => i.id === imgId);
//             console.log('图片位于' + img.cell, img.src);
//         });
//     }
// });

// ① 加载后建一次索引：之后取值全是 O(1)，切勿在循环里反复 find 全表 
export function indexSheet(s) {
    s.rowByNo = new Map((s.rows || []).map(r => [r._row, r]));
    // Excel行号 → 行对象 
    s.imgById = new Map((s.images || []).map(i => [i.id, i]));
    // 图片id → 图片(src) 
    s.imgBydispimgId = new Map((s.images || []).map(i => [i.dispimgId, i]));
    // dispimgId → 图片(src) 
    s.colByName = {};
    // 列名 → 整列值数组 
    s.colByNo = {};
    // 列名 → 列号 
    if (s.headers)
        // console.log(Object.entries(s.headers))
        for (const [L, h] of Object.entries(s.headers)) {
            s.colByNo[h] = colNum(L);
            s.colByName[h] = (s.rows || []).map(r => r[h]);
        }
    return s;
}
// ② 列号 ↔ 列字母 
const colLetter = n => {
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
};
const colNum = L => {
    let n = 0; for (const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
};
// ③ 取单格：行列号就是你在 Excel 里看到的数字和字母 
export function getCell(sheet, row, col) {
    return sheet.cells[(typeof col === 'number' ? colLetter(col) : col) + row] || null;
}
// 显示值：日期/时间/百分比用 text，普通数值/文本用 value 
export function cellText(c) {
    return c ? (c.text != null ? c.text : (c.value == null ? '' : c.value)) : '';
}
// ④ 取矩形区域：第 3~6 行 × B~E 列 → 二维数组 
export function getRange(sheet, r1, c1, r2, c2) {
    const out = []; for (let r = r1; r <= r2; r++) {
        const line = []; for (let c = c1; c <= c2; c++) line.push(cellText(getCell(sheet, r, c)));
        out.push(line);
    } return out;
}
// ⑤ 整表一次性转二维数组，之后纯下标访问最快 
export function toGrid(sheet) {
    const d = sheet.dimensions, grid = [];
    for (let r = d.minRow; r <= d.maxRow; r++) {
        const line = [];
        for (let c = d.minCol; c <= d.maxCol; c++) line.push(cellText(sheet.cells[colLetter(c) + r]));
        grid.push(line);
    }
    return {
        grid, minRow: d.minRow, minCol: d.minCol
    };
}
// grid[行-minRow][列-minCol] } // ⑥ 用法 
// const sheet = indexSheet(data.sheets[0]);
// getCell(sheet, 24, 'J');
// // 第24行J列单格 → {value, text, images:[...], style, ...} 
// getRange(sheet, 3, 2, 6, 5)
// // 第3~6行、B~E列 → 二维数组 
// sheet.rowByNo.get(24);
// // 第24行整行对象（按列名取值）
// sheet.colByName['问题描述'];
// // 「问题描述」整列的值 
// sheet.colByNo['问题描述'];
// // 「问题描述」在第几列 
// sheet.matrix[24].cells[10];
// freeform 模式（mode==='freeform'）按行列号取



// ── ① 这两类单元格的数据到底长什么样（真实输出）───────────────
// 富文本格（同一格里多段颜色），以 I6 为例：
// sheet.cells['I6'].richText → { runs:[ {text:'焊房内有胶'}, {text:'带残留', color:'FF0000', fontSize:12} ] }
// row['问题描述_rich'] → [ {text:'焊房内有胶'}, {text:'带残留', ...} ]
// ↑ 同一份 runs：格子级包了一层 {runs}，行级就是数组本身，别混用
// 含图格，以 J4 为例：
// sheet.cells['J4'].images → ['img_1'] ← 只是图片 id，不是路径
// sheet.images[i] → { id:'img_1', src:'img/image1.jpeg', width:1080, height:1080, cell:'J4', ... }

// ── ② 统一取数封装（已加载数据 + 建好第 5 节索引后使用）───────── 
function toRuns(x) { return Array.isArray(x) ? x : ((x && x.runs) || null); }
// 兼容两种存放位置 
function getCellData(sheet, ref) {
    // ref 例如 'J24' 
    const cell = sheet.cells[ref];
    if (!cell) return { ref, text: '', value: null, rich: null, html: '', images: [] };
    const rich = toRuns(cell.richText);
    return {
        ref, value: cell.value,
        // 原始值（数字仍为数字） 
        text: cell.text != null ? cell.text : (cell.value == null ? '' : cell.value),
        // 日期/百分比显示文本 
        rich: rich,
        // runs 数组 或 null 
        html: rich ? runsToHtml(rich) : '',
        // 富文本 → 彩色 HTML（runsToHtml 见第 7 节） 
        images: (cell.images || []).map(id => sheet.imgById ? sheet.imgById.get(id) : sheet.images.find(i => i.id === id)).filter(Boolean)
        // id → { src, width, height, ... }
    };
}
// ── ③ 按「行 + 列名」取一格，自动处理富文本 / 图片 / 合并格 ─────
export function cellOfRow(sheet, row, colName) {
    // colName 如 '问题描述' 
    const colNo = sheet.colByNo[colName];

    // 列名 → 列号（第 5 节的索引） 
    const ref = colLetter(colNo) + row._row;
    const c = sheet.cells[ref];
    if (c && c.mergedMain) return getCellData(sheet, c.mergedMain);

    // 合并从属格：值/图统一落到主格 
    return getCellData(sheet, ref);
}
// ── ④ 落地：一行 → 单元格 DOM（descEl / picsEl 替换成你自己的元素）── 
// sheet.rows.forEach(row => {
//     const desc = cellOfRow(sheet, row, '问题描述');
//     // 可能是富文本 
//     descEl.innerHTML = desc.html || desc.text;
//     // 有颜色就渲染 HTML，否则输出纯文本 
//     const pics = cellOfRow(sheet, row, '问题图片');
//     // 该列图片
//     picsEl.innerHTML = pics.images.map(img => `<img src="${img.src}" style="max-width:120px">`).join('');
//     // src 是相对路径，与 data.json 同级即可直接显示
// });

// 当同一格有多段颜色（如"焊房内有胶" + 红色"带残留"）时： 
// 1) row['问题描述'] → 纯文本 "焊房内有胶带残留"（完整，不会截断） 
// 2) row['问题描述_rich'] → runs 数组，含每段的颜色/字体/字号 
// 3) sheet.cells['I6'].richText.runs → 同上（按单元格取） 
// 把 runs 渲染成带颜色的 HTML 
function runsToHtml(runs) {
    return runs.map(r => {
        let st = ''; if (r.color) st += `color:#${r.color};`;
        // 6位十六进制，如 FF0000
        if (r.fontSize) st += `font-size:${r.fontSize}px;`; if (r.bold) st += 'font-weight:bold;';
        if (r.italic) st += 'font-style:italic;'; if (r.underline) st += 'text-decoration:underline;';
        return st ? `<span style="${st}">${r.text}</span>` : r.text;
    }).join('');
}
// 用法：有富文本就按颜色渲染，否则用纯文本
// sheet.rows.forEach(row => {
//     const rich = row['问题描述_rich']; if (rich) el.innerHTML = runsToHtml(rich); // 焊房内有胶 + 红色"带残留"
//     else el.textContent = row['问题描述'] || '';
// });

// 检测字符串是否以‘=DISPIMG(’为开头
const isDispImg = (str) => {
    return str.startsWith('=DISPIMG(');
};
const isIdImg = (str) => {
    return str.startsWith('img_');
};
// 获取图片真实路径
export const getImgPath = (sheet, str = '') => {
    if (!str) return ''
    let opt = null;
    if (isDispImg(str)) {
        opt = sheet?.imgBydispimgId?.get(str.slice(10, -4));
        //   const opt = sheet?.imgBydispimgId?.[str.slice(10, -4)];
        //   const opt = sheet?.images?.find(item => item?.dispimgId === str.slice(10, -4))
    }
    if (isIdImg(str)) {
        opt = sheet?.imgById?.get(str);
    }
    return '/' + opt?.src || opt?.path
}
// 判断一列是否有数据，一列的充填率大于某个值时确认有数据
export const hasData = (sheet, colName, threshold = 0.4) => {
    let cellData = sheet.colByName[colName];
    let totalCells = cellData.length;
    let count = 0;
    for (let cell of cellData) {
        if (cell || cell === 0) count++;
        if (count / totalCells > threshold) return true;
    }
    return false;
};
// 快速获取到充填数据的最靠右的列号，用于后续的图表绘制等操作
export const rightMostFilledCol = (sheet) => {
    let maxIndex = 0;
    for (let colName in sheet.colByName) {
        if (hasData(sheet, colName)) {
            maxIndex = Math.max(maxIndex, sheet.colByNo[colName]);
        }
    }
    return maxIndex;
};
// 获取最近7周的、最新充填的7列列号，用于后续的图表绘制等操作
export const latestFilledCols = (sheet) => {
    const mostFilledCol = rightMostFilledCol(sheet)
    let cols = [];
    for (let i = rightMostFilledCol(sheet); i >= mostFilledCol - 6; i--) {
        cols.push(i);
    }
    return cols.reverse();
};

/**
 * 从 sheet 数据中按指定范围提取行数据
 *
 * @param {Object} sheet 包含 sheets 结构的 JSON 数据对象
 * @param {Object} [options] 提取选项
 * @param {number} [options.startRow=0] 起始行索引，默认为 0
 * @param {number} [options.endRow] 结束行索引（不包含），省略则取到末尾
 * @return {Array} 提取出的行数据数组；数据结构非法时返回空数组
 */
export const getRowsFromSheet = (
    sheet,
    { startRow = 0, endRow } = {},
) => {
    const rows = sheet?.rows || []
    const selectedRows = rows.slice(startRow, endRow)
    // console.log(selectedRows)
    return selectedRows
}