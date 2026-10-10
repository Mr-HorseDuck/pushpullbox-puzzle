/* 关卡构建脚本：把 levels/*.txt 编译成 js/levels/builtin.js。
 * 用法：
 *   node scripts/build-levels.js
 *   npm run build:levels
 *   npm run watch:levels（文件变化时自动重编译）
 *
 * 生成的文件是自动产物，请勿手动编辑；修改关卡请编辑 levels/*.txt。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEVELS_DIR = path.join(ROOT, 'levels');
const OUT_FILE = path.join(ROOT, 'js', 'levels', 'builtin.js');

function fail(msg) {
  console.error('[build:levels] 错误：' + msg);
  process.exit(1);
}

/** 模板字符串转义：顺序很重要——先反斜杠，再反引号，最后 ${，避免重复转义。 */
function escapeForTemplateLiteral(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/** 从文件名前缀 NN 推导稳定的关卡 id，例如 01-tutorial.txt -> builtin-01。 */
function deriveId(fileName, index) {
  const m = fileName.match(/^(\d+)-/);
  if (m) return 'builtin-' + String(parseInt(m[1], 10)).padStart(2, '0');
  return 'builtin-' + String(index + 1).padStart(2, '0');
}

function main() {
  if (!fs.existsSync(LEVELS_DIR)) {
    fail('levels/ 目录不存在，无法编译内置关卡');
  }

  let names;
  try {
    names = fs.readdirSync(LEVELS_DIR);
  } catch (e) {
    fail('读取 levels/ 目录失败：' + e.message);
  }

  const txtNames = names
    .filter((n) => /\.txt$/i.test(n))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (txtNames.length === 0) {
    fail('levels/ 里没有 .txt 文件，无法编译内置关卡');
  }

  const parts = [];
  parts.push('/* 本文件由脚本自动生成，请勿手动编辑。');
  parts.push(' * 编辑 levels/*.txt 后运行 npm run build:levels 重新生成。');
  parts.push(' */');
  parts.push('(function (PPZ) {');
  parts.push("  'use strict';");
  parts.push('');
  parts.push('  PPZ.levels = PPZ.levels || {};');
  parts.push('');
  parts.push('  PPZ.levels.builtin = [');

  txtNames.forEach((name, i) => {
    const full = path.join(LEVELS_DIR, name);
    let raw;
    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch (e) {
      fail('读取失败：' + name + '（' + e.message + '）');
    }
    // 去掉 BOM、统一换行为 LF，保证生成文件跨平台一致
    const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const id = deriveId(name, i);

    parts.push('    {');
    parts.push("      id: '" + id + "',");
    parts.push('      // ---- ' + name + ' ----');
    parts.push('      text: `' + escapeForTemplateLiteral(text) + '`');
    parts.push('    }' + (i < txtNames.length - 1 ? ',' : ''));
  });

  parts.push('  ];');
  parts.push('})(window.PPZ);');
  parts.push('');

  try {
    fs.writeFileSync(OUT_FILE, parts.join('\n'), 'utf8');
  } catch (e) {
    fail('写入 ' + OUT_FILE + ' 失败：' + e.message);
  }

  console.log('已编译 ' + txtNames.length + ' 个关卡 → js/levels/builtin.js');
  txtNames.forEach((n) => console.log('  - ' + n));
}

main();
