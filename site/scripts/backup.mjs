#!/usr/bin/env node
/**
 * 笔记站本地数据备份/恢复（不依赖 4400 服务，直接读写 site/server-data）
 *
 *   node scripts/backup.mjs export                 # 导出到 backups/notes-backup-<时间>.json
 *   node scripts/backup.mjs export --out D:\x.json # 指定位置
 *   node scripts/backup.mjs import <file>          # 合并恢复（同 id 取较新的）
 *   node scripts/backup.mjs import <file> --replace# 覆盖恢复（先自动备份现状）
 *   node scripts/backup.mjs info <file>            # 只看备份里有什么
 */
import fs from 'node:fs';
import path from 'node:path';
import { APP_ID, BUNDLE_KIND, readBundle, writeBundle, dataDir, defaultExportPath } from './backup-lib.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const flag = (name) => rest.includes(name);
const value = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const pos = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--out');

const dir = dataDir();
const kb = (n) => `${Math.round(n / 1024)} KB`;

const help = () => {
  console.log(`笔记站数据备份（server-data = ${dir}）

  node scripts/backup.mjs export [--out <file>]   导出批注/编辑/统计/复习记录 + 上传图片
  node scripts/backup.mjs import <file> [--replace]
                                                 恢复；默认合并（同 id 保留较新的），--replace 覆盖
  node scripts/backup.mjs info <file>            查看备份内容

提示：换机器时把 server-data 整个目录拷走也行，但备份 JSON 更小、更好传。`);
};

const load = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') { help(); process.exit(0); }

if (cmd === 'export') {
  if (!fs.existsSync(dir)) {
    console.error(`✗ 找不到 ${dir}（还没产生过批注/编辑数据？）`);
    process.exit(1);
  }
  const bundle = readBundle(dir);
  const out = value('--out') ? path.resolve(value('--out')) : defaultExportPath();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(bundle, null, 1), 'utf8');
  const size = fs.statSync(out).size;
  console.log('✓ 已导出');
  console.log(`  文件: ${out}（${kb(size)}）`);
  console.log(`  内容: ${bundle.stats.pages} 页批注 / ${bundle.stats.annos} 条 · 内容编辑 ${bundle.stats.contentPages} 页 · 图片 ${bundle.stats.uploads} 张`);
  process.exit(0);
}

if (cmd === 'info') {
  const file = pos[0];
  if (!file) { console.error('✗ 用法: info <file>'); process.exit(1); }
  const b = load(path.resolve(file));
  if (b.app !== APP_ID || b.kind !== BUNDLE_KIND) { console.error('✗ 不是本工具的备份文件'); process.exit(1); }
  console.log(`备份时间: ${b.exportedAt}`);
  console.log(`来源: ${b.source?.dataDir ?? '?'}`);
  console.log(`批注: ${b.stats?.pages ?? 0} 页 / ${b.stats?.annos ?? 0} 条`);
  console.log(`内容编辑: ${b.stats?.contentPages ?? 0} 页`);
  console.log(`图片: ${b.stats?.uploads ?? 0} 张`);
  console.log(`体积: ${kb(fs.statSync(path.resolve(file)).size)}`);
  process.exit(0);
}

if (cmd === 'import') {
  const file = pos[0];
  if (!file) { console.error('✗ 用法: import <file> [--replace]'); process.exit(1); }
  const src = path.resolve(file);
  if (!fs.existsSync(src)) { console.error(`✗ 文件不存在: ${src}`); process.exit(1); }

  // 恢复前先给现状留一份，误操作还能回去
  if (fs.existsSync(dir)) {
    const snapshot = defaultExportPath().replace(/\.json$/, '-before-import.json');
    fs.mkdirSync(path.dirname(snapshot), { recursive: true });
    fs.writeFileSync(snapshot, JSON.stringify(readBundle(dir), null, 1), 'utf8');
    console.log(`· 已先备份现状: ${snapshot}`);
  }

  const mode = flag('--replace') ? 'replace' : 'merge';
  try {
    const restored = writeBundle(dir, load(src), { mode });
    console.log(`✓ 已恢复（${mode === 'replace' ? '覆盖' : '合并'}）到 ${dir}`);
    console.log(`  批注 ${restored.annos} 条 · 内容编辑 ${restored.content} 处 · 实习 ${restored.intern} 条 · 统计 ${restored.usage} 项 · 图片 ${restored.uploads} 张`);
    console.log('  重启 ./start.ps1 或刷新页面后生效（服务会重新读文件）');
  } catch (e) {
    console.error(`✗ 恢复失败: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

console.error(`✗ 未知命令: ${cmd}`);
help();
process.exit(1);
