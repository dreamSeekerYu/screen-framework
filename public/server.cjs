#!/usr/bin/env node
'use strict';
/*
 * ============================================================
 *  内网文件服务（零依赖）：把当前目录共享给内网同事访问
 * ============================================================
 * 这个脚本做什么：
 *   - 启动一个网页服务，同事用浏览器打开 http://你的IP:8080/ 即可
 *     浏览/下载 data\ 的 JSON、img\ 的图片、excal\ 的源文件
 *   - 根路径默认返回 index.html（没有就自动生成一个导航首页）
 *
 * 常见问题排查（看运行窗口或 run_log.txt）：
 *   Q: 提示端口被占用？
 *      A: 换端口启动：node server.cjs 9090（BAT 里改最后一行的 8080）
 *   Q: 同事打不开网页？
 *      A: 确认防火墙允许 8080 端口；确认同事与你在同一内网；
 *         run_log.txt 里会记录每个访问请求，可确认对方是否连进来了
 *
 * 用法: node server.cjs [端口]  （默认 8080）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const child = require('child_process');

const ROOT = process.cwd();
const PORT = parseInt(process.argv[2], 10) || 8080;
const LOG_FILE = path.join(ROOT, 'run_log.txt'); // 请求日志与转换日志同一个文件，按时间排序

// 写日志：屏幕 + run_log.txt
function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
function slog(msg) {
  console.log(msg);
  try { fs.appendFileSync(LOG_FILE, '[' + nowStr() + '] ' + msg + '\n', 'utf8'); } catch (e) {}
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.zip': 'application/zip', '.pdf': 'application/pdf',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'
};

function safeJoin(base, sub) {
  const p = path.normalize(path.join(base, sub));
  if (p !== base && !p.startsWith(base + path.sep)) return null; // 防目录穿越
  return p;
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function listPage(dirPath, urlPath, res) {
  let items;
  try { items = fs.readdirSync(dirPath, { withFileTypes: true }); }
  catch (e) { res.writeHead(500); res.end('Error: ' + e.message); return; }
  items.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name, 'zh'));
  const parent = path.posix.dirname(urlPath.replace(/\/$/, '')) || '/';
  const up = urlPath !== '/' ? '<tr><td colspan="3"><a href="' + esc(parent === '/' ? '/' : parent + '/') + '">&#128193; ../（上一级）</a></td></tr>' : '';
  const rows = items.map(it => {
    const href = path.posix.join(urlPath, encodeURIComponent(it.name)) + (it.isDirectory() ? '/' : '');
    const icon = it.isDirectory() ? '&#128449;' : '&#128196;';
    const full = path.join(dirPath, it.name);
    let size = '';
    if (!it.isDirectory()) {
      try {
        const st = fs.statSync(full);
        size = st.size < 1024 ? st.size + ' B'
          : st.size < 1048576 ? (st.size / 1024).toFixed(1) + ' KB'
          : (st.size / 1048576).toFixed(2) + ' MB';
      } catch (e) {}
    }
    return '<tr><td>' + icon + '</td><td><a href="' + esc(href) + '">' + esc(it.name) + '</a></td><td style="color:#888">' + size + '</td></tr>';
  }).join('\n');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>文件服务 - ' + esc(urlPath) +
    '</title><style>body{font-family:"Microsoft YaHei",sans-serif;max-width:900px;margin:30px auto;padding:0 16px;color:#333}' +
    'h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #eee}' +
    'a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}</style></head><body>' +
    '<h1>&#128231; 文件服务' + esc(urlPath) + '</h1><p style="color:#888">JSON 在 data/ 目录，图片在 img/ 目录，Excel 源文件在 excal/ 目录</p>' +
    '<table><tr><th></th><th style="text-align:left">名称</th><th style="text-align:left">大小</th></tr>' + up + rows + '</table>' +
    '</body></html>');
}

// 自动生成默认首页 index.html（仅当不存在时）
function ensureIndexHtml() {
  const idx = path.join(ROOT, 'index.html');
  if (fs.existsSync(idx)) return;
  const ip = (localIPs()[0]) || 'localhost';
  const html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Excel 转 JSON 文件服务</title>' +
    '<style>body{font-family:"Microsoft YaHei",sans-serif;max-width:860px;margin:0 auto;padding:40px 16px;color:#333;background:#f6f7fb}' +
    'h1{font-size:24px}p.sub{color:#888}' +
    '.grid{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px}' +
    '.card{flex:1;min-width:220px;background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
    '.card h2{font-size:17px;margin:0 0 8px}.card p{color:#666;font-size:13px;margin:0 0 12px}' +
    'a.btn{display:inline-block;background:#2563eb;color:#fff;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:14px}' +
    'a.btn:hover{background:#1d4ed8}</style></head><body>' +
    '<h1>&#128231; Excel 转 JSON 文件服务</h1>' +
    '<p class="sub">转换结果与源文件均可在线浏览、下载。本页由文件服务自动生成（index.html）。</p>' +
    '<div class="grid">' +
    '<div class="card"><h2>&#128196; JSON 数据</h2><p>每个 Excel 转出的同名 .json 文件</p><a class="btn" href="/data/">打开 data/</a></div>' +
    '<div class="card"><h2>&#128444; 图片</h2><p>从 Excel 中提取的全部图片</p><a class="btn" href="/img/">打开 img/</a></div>' +
    '<div class="card"><h2>&#128202; Excel 源文件</h2><p>待转换 / 已转换的原始 .xlsx</p><a class="btn" href="/excal/">打开 excal/</a></div>' +
    '</div></body></html>';
  try { fs.writeFileSync(idx, html); console.log('  已自动生成默认首页 index.html'); } catch (e) {}
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { res.writeHead(400); res.end('Bad request'); return; }
  // 防目录穿越：把 ../ 之类路径限制在服务根目录内
  const fp = safeJoin(ROOT, urlPath);
  const finish = (code) => slog('访问 ' + req.socket.remoteAddress + ' ' + req.method + ' ' + urlPath + ' -> ' + code);
  if (!fp) { res.writeHead(403); res.end('Forbidden'); finish(403); return; }
  let st;
  try { st = fs.statSync(fp); }
  catch (e) {
    // 兜底：路径不存在时区分目录/文件给出友好页面
    if (urlPath.endsWith('/')) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body style="font-family:sans-serif;max-width:600px;margin:60px auto">' +
        '<h2>&#128681; 文件夹 "' + esc(urlPath) + '" 还不存在</h2>' +
        '<p>该文件夹会在转换完成或放入文件后出现。请返回 <a href="/">首页</a>。</p></body></html>');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
    finish(404);
    return;
  }
  if (st.isDirectory()) {
    if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: urlPath + '/' }); res.end(); finish(301); return; }
    // 默认文档：目录下有 index.html 则直接转发（如根目录的导航首页）
    const idxFile = path.join(fp, 'index.html');
    if (fs.existsSync(idxFile) && fs.statSync(idxFile).isFile()) {
      const ist = fs.statSync(idxFile);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': ist.size });
      fs.createReadStream(idxFile).pipe(res);
      finish(200 + ' (index.html)');
      return;
    }
    // 没有默认文档时显示目录列表页
    listPage(fp, urlPath, res);
    finish(200 + ' (列表)');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size
  });
  fs.createReadStream(fp).pipe(res);
  finish(200 + ' ' + (st.size / 1024).toFixed(0) + 'KB');
});

function localIPs() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name in ifs) {
    for (const it of ifs[name] || []) {
      if (it.family === 'IPv4' && !it.internal) out.push(it.address);
    }
  }
  return out;
}

// 自动打开浏览器（IE 除外）：先查系统默认浏览器，若默认是 IE
// 则依次尝试 Edge / Chrome / Firefox；都找不到才退回默认浏览器
function openBrowser(url) {
  try {
    if (process.platform !== 'win32') {
      child.exec('xdg-open "' + url + '"', { stdio: 'ignore' });
      return;
    }
    // 读取 Windows 默认浏览器的 ProgId（如 ChromeHTML / MSEdgeHTM / IE.HTTP）
    let progId = '';
    try {
      const out = child.execSync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId',
        { encoding: 'utf8' });
      const m = out.match(/ProgId\s+REG_SZ\s+(\S+)/);
      if (m) progId = m[1];
    } catch (e) {}
    const isIE = /(^|\b)IE\.HTTP/i.test(progId) || /IEXPLORE/i.test(progId);
    if (progId && !isIE) {
      child.exec('start "" "' + url + '"', { stdio: 'ignore' });
      slog('已打开系统默认浏览器: ' + url);
      return;
    }
    // 默认是 IE（或无法识别）：依次尝试常见安装路径的现代浏览器
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const lad = process.env.LOCALAPPDATA || '';
    const candidates = [
      pf86 + '\\Microsoft\\Edge\\Application\\msedge.exe',
      pf + '\\Microsoft\\Edge\\Application\\msedge.exe',
      pf86 + '\\Google\\Chrome\\Application\\chrome.exe',
      pf + '\\Google\\Chrome\\Application\\chrome.exe',
      lad + '\\Google\\Chrome\\Application\\chrome.exe',
      pf + '\\Mozilla Firefox\\firefox.exe',
      pf86 + '\\Mozilla Firefox\\firefox.exe'
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        child.exec('"' + p + '" "' + url + '"', { stdio: 'ignore' });
        slog('默认浏览器是 IE，已改用现代浏览器打开: ' + url);
        slog('（使用: ' + p + '）');
        return;
      }
    }
    // 实在找不到现代浏览器，退回系统默认（IE 总比打不开强）
    child.exec('start "" "' + url + '"', { stdio: 'ignore' });
    slog('未找到 Edge/Chrome/Firefox，已用系统默认浏览器打开: ' + url);
  } catch (e) {
    slog('自动打开浏览器失败（不影响服务）: ' + e.message);
    slog('请手动访问: ' + url);
  }
}

server.listen(PORT, () => {
  ensureIndexHtml();
  slog('==============================================');
  slog('文件服务已启动（端口 ' + PORT + '）');
  slog('本机访问:   http://localhost:' + PORT + '/');
  const ips = localIPs();
  if (ips.length) {
    slog('内网同事请访问:');
    ips.forEach(ip => slog('    http://' + ip + ':' + PORT + '/'));
  }
  slog('按 Ctrl+C 停止服务');
  slog('==============================================');
  openBrowser('http://localhost:' + PORT + '/');
}).on('error', e => {
  if (e.code === 'EADDRINUSE') {
    slog('[错误] 端口 ' + PORT + ' 已被占用。解决方法：');
    slog('       换一个端口启动，例如把 BAT 最后一行改为: node server.cjs 9090');
  } else {
    slog('[错误] ' + e.message);
  }
  process.exit(1);
});
