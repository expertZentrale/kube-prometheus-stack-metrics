#!/usr/bin/env node
/**
 * Post-build smoke check for the extension bundle.
 *
 * `yarn build-pkg` exiting 0 only means webpack did not throw. It does not mean the emitted UMD is
 * loadable — ts-loader runs with `transpileOnly: true` and nothing in CI ever parses or executes the
 * artifact. A toolchain bump (webpack/babel/terser/core-js) can therefore produce a green build and a
 * bundle that fails at load time inside the Rancher UI, which only surfaces after a release.
 *
 * This asserts the cheap, high-signal properties: the artifact exists, is not truncated, parses as
 * JavaScript, and still registers itself as a UMD module.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = 'kube-prometheus-stack-metrics';

// A healthy build is ~75 KB. Anything under this floor means webpack emitted a stub or truncated
// file rather than the real component.
const MIN_BYTES = 20_000;
// Guards against a toolchain change accidentally inlining Vue or the whole shell into the bundle.
const MAX_BYTES = 5_000_000;

const fail = [];
const warn = [];
const ok = [];

const version = JSON.parse(
  readFileSync(join(ROOT, 'pkg', PKG_DIR, 'package.json'), 'utf8')
).version;

const outDir = join(ROOT, 'dist-pkg', `${ PKG_DIR }-${ version }`);

if (!existsSync(outDir)) {
  console.error(`FAIL: output directory not found: ${ outDir }`);
  console.error('      Did `yarn build-pkg kube-prometheus-stack-metrics` run first?');
  process.exit(1);
}

const main = join(outDir, `${ PKG_DIR }-${ version }.umd.min.js`);

if (!existsSync(main)) {
  console.error(`FAIL: main UMD bundle missing: ${ main }`);
  console.error(`      present instead: ${ readdirSync(outDir).join(', ') }`);
  process.exit(1);
}

// Every emitted .js must parse and clear the size floor — async chunks included, since a broken
// lazy-loaded chunk is exactly how the tab would fail to open.
const jsFiles = readdirSync(outDir).filter(f => f.endsWith('.js'));

for (const file of jsFiles) {
  const path = join(outDir, file);
  const size = statSync(path).size;
  const src = readFileSync(path, 'utf8');
  const isMain = path === main;

  if (isMain && size < MIN_BYTES) {
    fail.push(`${ file }: ${ size } bytes is below the ${ MIN_BYTES } floor — likely truncated or a stub`);
  } else if (size === 0) {
    fail.push(`${ file }: zero bytes`);
  }

  if (size > MAX_BYTES) {
    warn.push(`${ file }: ${ size } bytes exceeds ${ MAX_BYTES } — check whether a dependency got inlined`);
  }

  // Compile without executing. Catches truncation and syntax corruption from a bad minifier.
  try {
    new vm.Script(src, { filename: file });
    ok.push(`${ file }: parses (${ size } bytes)`);
  } catch (e) {
    fail.push(`${ file }: does not parse — ${ e.message }`);
  }
}

// The build targets `umd-min`; if the UMD wrapper is gone, Rancher cannot load the extension at all.
const mainSrc = readFileSync(main, 'utf8');

if (!/typeof exports===?["']object["']/.test(mainSrc) && !/define\.amd/.test(mainSrc)) {
  fail.push('main bundle has no recognisable UMD wrapper (no `typeof exports === "object"` / `define.amd`)');
} else {
  ok.push('main bundle carries a UMD wrapper');
}

// The bundle must still reference its own name — that is how Rancher resolves the extension.
if (!mainSrc.includes(PKG_DIR)) {
  warn.push(`main bundle does not mention "${ PKG_DIR }" — verify the extension still self-registers`);
} else {
  ok.push(`main bundle self-identifies as "${ PKG_DIR }"`);
}

console.log(`Bundle smoke check — ${ PKG_DIR }@${ version }`);
console.log(`  ${ outDir }\n`);
ok.forEach(m => console.log(`  PASS  ${ m }`));
warn.forEach(m => console.log(`  WARN  ${ m }`));
fail.forEach(m => console.log(`  FAIL  ${ m }`));

if (fail.length) {
  console.error(`\n${ fail.length } check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${ ok.length } checks passed${ warn.length ? ` (${ warn.length } warning(s))` : '' }.`);
