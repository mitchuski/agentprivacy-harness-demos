#!/usr/bin/env node
// gen_credit_graph.mjs — credit and provenance: who cited our levers (sig.golf), and the
// chain of entries a measurement travelled through (hashsmash r32).
//
//   node generators/gen_credit_graph.mjs <bundleDir> <out.html>
//
// The sources bundle holds citations_2026-10-05.json (sig_mage) and R32_LOG.md (hashsmash)
// as blobs; the reader parses the citations from the κ'd bytes and quotes the r32 chain from
// the log's own lines (searched by pattern, line numbers shown), never from memory.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_credit_graph.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const blob = (name) => readFileSync(join(bundle, 'blobs', R.names[name].replace(/^sha256:/, '') + '.bin'), 'utf8')
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// ---- sig.golf citations ------------------------------------------------------------------
const C = JSON.parse(blob('source:citations_2026-10-05.json'))
const solvers = [...new Set(C.map(c => c.who))].sort((a, b) => C.filter(c => c.who === b).length - C.filter(c => c.who === a).length)
const levers = [...new Set(C.flatMap(c => c.hits))].sort((a, b) => C.filter(c => c.hits.includes(b)).length - C.filter(c => c.hits.includes(a)).length)
const cell = (w, l) => C.filter(c => c.who === w && c.hits.includes(l))
const status = { MERGED: '#4f9d59', CLOSED: '#9a9a94', OPEN: '#3b6fd6' }
// matrix svg: solvers down, levers across; a dot per PR, colour = status, coauthor = ring
const cw = 120, rh = 22, x0 = 170, y0 = 30
let m = `<svg viewBox="0 0 ${x0 + levers.length * cw + 20} ${y0 + solvers.length * rh + 10}" width="100%" role="img" aria-label="citation matrix">`
m += levers.map((l, i) => `<text x="${x0 + i * cw}" y="18" class="head">${esc(l)} (${C.filter(c => c.hits.includes(l)).length})</text>`).join('')
solvers.forEach((w, si) => {
  const y = y0 + si * rh + 14
  m += `<text x="4" y="${y}" class="who">${esc(w)} <tspan class="mut">${C.filter(c => c.who === w).length}</tspan></text>`
  levers.forEach((l, li) => cell(w, l).forEach((c, k) => { m += `<circle cx="${x0 + li * cw + 8 + k * 11}" cy="${y - 4}" r="4" fill="${status[c.s] || '#000'}" ${c.co ? 'stroke="#d6a23b" stroke-width="2"' : ''}><title>#${c.n} ${esc(c.s)} by ${esc(c.who)} cites ${esc(c.hits.join(','))}${c.co ? ' (coauthor credit)' : ''}</title></circle>` }))
})
m += '</svg>'
const byStatus = Object.fromEntries(Object.keys(status).map(s => [s, C.filter(c => c.s === s).length]))

// ---- r32 provenance chain, quoted from R32_LOG.md lines ---------------------------------------
const log = blob('source:R32_LOG.md').split('\n')
const find = (re) => log.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l))
const chain = [
  ['the measurement', /593,858/],
  ['the chain stated', /#296 .*#367 .*#377|Provenance chain|Chain\s+stated/],
  ['credit audit', /Coauthors:|credit.*dropped|#235/i],
  ['third-party witness credited', /yudduy.*#227|#227.*yudduy/],
  ['adopted parameters credited', /credited to #367|credited to #377/],
]
const chainRows = chain.map(([label, re]) => [label, find(re).slice(0, 3)])

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credit and provenance: citations and the r32 chain</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.head{font-size:11px;fill:var(--mut);font-weight:600}.who{font-size:11px;fill:var(--fg)}.mut{fill:var(--mut)}
.lg i{display:inline-block;width:10px;height:10px;border-radius:5px;margin-right:4px;vertical-align:middle}.lg{margin-right:12px;font-size:.85rem}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.q{font-family:ui-monospace,monospace;font-size:.8rem;white-space:pre-wrap}.ln{color:var(--mut)}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}
</style></head><body>
<h1>Credit and provenance</h1>
<div class="banner">Two lanes, two shapes of credit. On sig.golf, ${C.length} pull requests by ${solvers.length} solvers cite levers this lane shipped (${byStatus.MERGED} merged, ${byStatus.CLOSED} closed, ${byStatus.OPEN} open; ${C.filter(c => c.co).length} carry coauthor credit). On hashsmash, one measured number travelled through other people's packages and the lane stated the chain rather than disputing it. Status of the κ: <b>${esc(R.status)}</b>.</div>
<h2>sig.golf: who cited which lever</h2>
<p class="lg"><i style="background:${status.MERGED}"></i>merged <i style="background:${status.CLOSED}"></i>closed <i style="background:${status.OPEN}"></i>open <i style="background:#fff;border:2px solid #d6a23b"></i>coauthor credit given</p>
<div style="overflow:auto">${m}</div>
<p class="ln">One dot per citing PR; hover for its number. Source: the lane's citations file as of 2026-10-05, parsed from its κ'd bytes.</p>
<h2>hashsmash r32: the chain of one measurement</h2>
<p>The route-search cost (59 calls, 593,858.32 CPU-s) was measured once by this lane and then reused by others, with and without credit. The lane's log states the chain and the credit audit in its own words; the lines below are quoted from the log blob by pattern, with their line numbers.</p>
<table><thead><tr><th>what</th><th>lines from R32_LOG.md</th></tr></thead><tbody>
${chainRows.map(([label, rows]) => `<tr><td>${esc(label)}</td><td>${rows.length ? rows.map(([n, l]) => `<div class="q"><span class="ln">L${n}</span> ${esc(l.trim().slice(0, 260))}</div>`).join('') : '<span class="ln">not_found_in(R32_LOG.md)</span>'}</td></tr>`).join('')}
</tbody></table>
<p>Under the evidence root the measurement is an object: a package that reuses the number reuses the object, byte for byte, and its κ says so wherever it lands. The decimal travels; the root stays.</p>
<footer><div>Evidence root (sources bundle): <code>${esc(R.root_kappa)}</code></div><div>Blobs: citations <code>${esc(R.names['source:citations_2026-10-05.json'])}</code> · R32_LOG <code>${esc(R.names['source:R32_LOG.md'])}</code></div><div class="ln">Reader κ: in pairs.json. Generated by generators/gen_credit_graph.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${C.length} citing PRs, ${solvers.length} solvers, ${levers.length} levers; chain rows ${chainRows.map(r => r[1].length).join('/')}`)
