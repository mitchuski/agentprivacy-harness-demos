#!/usr/bin/env node
// gen_arena_rules.mjs — the arena rules map: CHALLENGE_LANES.md A1-A40 as a clickable reader.
//
//   node generators/gen_arena_rules.mjs <bundleDir> <out.html>
//
// The bundle is a sources bundle (tools/mint_sources.mjs) holding CHALLENGE_LANES.md as a blob;
// the reader parses that blob, never a loose copy, so the page is a projection of the κ'd bytes.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_arena_rules.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const srcK = R.names['source:CHALLENGE_LANES.md']
const md = readFileSync(join(bundle, 'blobs', srcK.replace(/^sha256:/, '') + '.bin'), 'utf8')
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// ---- parse: groups "## X. Title", rules "- **A<n> · title.** body *(cite)*" (multi-line) ----
const lines = md.split('\n')
const groups = [], rules = []
let g = null, cur = null
const flush = () => { if (cur) { rules.push(cur); cur = null } }
for (const l of lines) {
  const gm = l.match(/^## ([A-G])\. (.+)$/)
  if (gm) { flush(); g = { id: gm[1], title: gm[2], rules: [] }; groups.push(g); continue }
  if (/^## /.test(l) || /^---/.test(l)) { flush(); if (!/^## [A-G]\./.test(l)) g = null; continue }
  const rm = l.match(/^- \*\*(A\d+) · (.+?)\*\* (.*)$/)
  if (rm && g) { flush(); cur = { id: rm[1], title: rm[2].replace(/\.$/, ''), body: rm[3], group: g.id }; g.rules.push(cur); continue }
  if (cur && /^  \S/.test(l)) cur.body += ' ' + l.trim()
}
flush()
for (const r of rules) {
  const cm = r.body.match(/\*\((.+?)\)\*\s*$/)
  r.cite = cm ? cm[1] : ''; r.body = r.body.replace(/\s*\*\(.+?\)\*\s*$/, '')
  const lanes = []
  for (const [re, lane] of [[/hashsmash/i, 'hashsmash'], [/sig_mage|sig\.golf/i, 'sig_mage'], [/better_codes/i, 'better_codes'], [/precompile/i, 'precompile'], [/qpcbtc/i, 'qpcbtc'], [/flock/i, 'flock'], [/matrices/i, 'matrices'], [/cudafast/i, 'cudafast'], [/heesch/i, 'heesch'], [/kappa_evidence|HOLONS/i, 'kappa_evidence'], [/seats\/|templates\//i, 'harness']]) if (re.test(r.cite)) lanes.push(lane)
  r.lanes = lanes.length ? lanes : ['harness']
  const sm = r.cite.match(/\b([0-9a-f]{8})\b/g); r.shipped = sm ? [...new Set(sm)] : []
}
const shippedTable = (md.match(/\| lane \| board \| entries under the rules \| state at the fold[^\n]*\n\|[^\n]*\n([\s\S]*?)\n\n/) || [])[1] || ''
const shippedRows = shippedTable.split('\n').filter(l => l.startsWith('|')).map(l => l.split('|').slice(1, -1).map(s => s.trim()))
const laneList = [...new Set(rules.flatMap(r => r.lanes))].sort()

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The arena rules, A1 to A40, by lane</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8;--acc:#3b6fd6}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.filters button{border:1px solid var(--line);background:transparent;color:var(--fg);border-radius:14px;padding:3px 10px;margin:2px;cursor:pointer;font-size:.85rem}
.filters button[aria-pressed=true]{background:var(--acc);color:#fff;border-color:var(--acc)}
.rule{border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin:8px 0}.rule.hide{display:none}
.rule b.id{color:var(--acc);font-family:ui-monospace,monospace}.cite{font-size:.82rem;color:var(--mut)}.tag{display:inline-block;font-size:.75rem;border:1px solid var(--line);border-radius:10px;padding:0 7px;margin-left:4px;color:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}
.count{color:var(--mut);font-size:.85rem}
</style></head><body>
<h1>The arena rules, A1 to A40, by lane</h1>
<div class="banner">Forty rules the seated loop learned against live leaderboards, August to October 2026. Each cites the lane that proved it and the entry it shipped in. Parsed from the κ'd bytes of <code>CHALLENGE_LANES.md</code> (<code>${esc(srcK)}</code>); status <b>${esc(R.status)}</b>.</div>
<div class="filters"><span class="count">lane:</span> <button data-lane="all" aria-pressed="true">all</button>${laneList.map(l => `<button data-lane="${esc(l)}" aria-pressed="false">${esc(l)} (${rules.filter(r => r.lanes.includes(l)).length})</button>`).join('')}</div>
<p class="count"><span id="n">${rules.length}</span> of ${rules.length} rules shown</p>
${groups.map(gr => `<h2>${esc(gr.id)}. ${esc(gr.title)}</h2>${gr.rules.map(r => `<div class="rule" data-lanes="${esc(r.lanes.join(' '))}"><b class="id">${esc(r.id)}</b> <b>${esc(r.title)}.</b> ${esc(r.body)}<div class="cite">${esc(r.cite)}${r.lanes.map(l => `<span class="tag">${esc(l)}</span>`).join('')}${r.shipped.map(s => `<span class="tag">shipped ${esc(s)}</span>`).join('')}</div></div>`).join('')}`).join('')}
<h2>What shipped under these rules</h2>
<table><thead><tr><th>lane</th><th>board</th><th>entries</th><th>state at the fold</th></tr></thead><tbody>${shippedRows.map(r => `<tr>${r.map(c => `<td>${esc(c.replace(/\*\*/g, ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>
<footer><div>Evidence root (sources bundle): <code>${esc(R.root_kappa)}</code></div><div>Source blob: <code>${esc(srcK)}</code> · CHALLENGE_LANES.md as committed in agentprivacy-harness (f80f896, 2026-10-07)</div><div class="count">Reader κ: in pairs.json. Generated by generators/gen_arena_rules.mjs; agentprivacy-harness-demos.</div></footer>
<script>
document.querySelectorAll('.filters button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true')
  const lane = b.dataset.lane; let n = 0
  document.querySelectorAll('.rule').forEach(r => { const show = lane === 'all' || r.dataset.lanes.split(' ').includes(lane); r.classList.toggle('hide', !show); if (show) n++ })
  document.getElementById('n').textContent = n
}))
</script></body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${rules.length} rules in ${groups.length} groups; lanes ${laneList.join(', ')}`)
