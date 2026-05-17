#!/usr/bin/env node
/**
 * 离线字体打包 ——
 *
 * 读 public/mock/fonts.json 里每个非 system 字体的 stylesheets[]，
 * 下载 CSS + 里面引用的 woff2 字体文件到 public/fonts-vendor/<key>/，
 * 重写 fonts.json 让 stylesheets[] 指向本地 /fonts-vendor/<key>/style.css。
 *
 * 用法（在能上外网的机器上跑一次）：
 *   node scripts/vendor-fonts.mjs
 *
 * 之后所有字体都本地化，部署机可断网。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = resolve(import.meta.dirname, '..');
const FONTS_JSON = join(ROOT, 'public', 'mock', 'fonts.json');
const VENDOR_DIR = join(ROOT, 'public', 'fonts-vendor');

// 模拟一个 desktop Chrome UA —— 不然 Google Fonts 给的是字体子集会少很多 glyph
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.text();
}

/**
 * @param {string} url
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchBin(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.arrayBuffer();
}

/**
 * @param {string} css
 * @returns {string[]}
 */
function extractFontUrls(css) {
  // url(https://...) | url("https://...") | url('https://...')
  const matches = [...css.matchAll(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/g)];
  return [...new Set(matches.map(m => m[2]))];
}

/**
 * @param {string} key
 * @param {string} url
 */
async function vendorOne(key, url, idx) {
  const dir = join(VENDOR_DIR, key);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  console.log(`[${key}] fetching css ${idx}: ${url}`);
  let css = await fetchText(url);

  const fontUrls = extractFontUrls(css);
  console.log(`[${key}] css has ${fontUrls.length} font file refs`);

  for (const fu of fontUrls) {
    const fname = fu.split('/').pop()?.split('?')[0] ?? 'font.bin';
    const fpath = join(dir, fname);
    if (!existsSync(fpath)) {
      console.log(`[${key}]  download ${fname}`);
      const buf = await fetchBin(fu);
      await writeFile(fpath, Buffer.from(buf));
    }
    // 改 CSS 引用为相对路径
    css = css.replaceAll(fu, `./${fname}`);
  }

  const cssPath = join(dir, `style-${idx}.css`);
  await writeFile(cssPath, css, 'utf-8');
  return `/fonts-vendor/${key}/style-${idx}.css`;
}

async function main() {
  const fontsJson = JSON.parse(await readFile(FONTS_JSON, 'utf-8'));
  if (!Array.isArray(fontsJson.items)) {
    throw new Error('fonts.json shape unexpected: missing items[]');
  }

  for (const item of fontsJson.items) {
    if (!item.stylesheets?.length) continue;
    const newSheets = [];
    for (let i = 0; i < item.stylesheets.length; i++) {
      const localUrl = await vendorOne(item.key, item.stylesheets[i], i);
      newSheets.push(localUrl);
    }
    item.stylesheets = newSheets;
  }

  await writeFile(FONTS_JSON, JSON.stringify(fontsJson, null, 2), 'utf-8');
  console.log('done. fonts.json updated; public/fonts-vendor/ ready for offline serving.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
