#!/usr/bin/env node
// gen_evidence_graph.mjs — the evidence-graph explorer: one κ bundle → one HTML reader.
//
//   node generators/gen_evidence_graph.mjs <bundleDir> <out.html> [title]
//
// Reads ONLY the bundle's graph.json and root.json (as minted by kappa_evidence_mage or
// the harness's tools/kappa_evidence.mjs). Zero dependencies, inline SVG, no network.
// The reader embeds the graph data and recomputes the headline numbers in the browser,
// so what the viewer sees is a derivation from the objects, not a quoted figure.
// Footer: the evidence root and a "Reader κ" slot that tools/pair.mjs fills in pairs.json
// (the file never contains its own κ).

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg, titleArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_evidence_graph.mjs <bundleDir> <out.html> [title]'); process.exit(2) }
const bundle = resolve(bundleArg)
const G = JSON.parse(readFileSync(join(bundle, 'graph.json'), 'utf8'))
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const short = (k) => k.replace(/^sha256:/, '').slice(0, 10)
const kind = (o) => String(o['0'] || '').split('/').slice(-2, -1)[0] || 'object'

// ---- classify nodes into columns ------------------------------------------------------
const nodes = new Map() // kappa -> {kind, label, col}
for (const [k, o] of Object.entries(G.objects)) {
  const kd = kind(o)
  let label = kd, col = 2
  if (kd === 'run-root') { label = 'run root'; col = 0 }
  else if (kd === 'ledger') { label = o['1']; col = 1 }
  else if (kd === 'summary' || kd === 'check') { label = kd + (o['2'] && typeof o['2'] === 'string' ? ' ' + o['2'].split('/').slice(-2, -1)[0] : ''); col = 1 }
  else if (kd === 'images') { label = 'images'; col = 1 }
  else if (kd === 'call') { label = o['2'] }
  else if (kd === 'record') { label = `${o['2']} #${o['1']}` }
  else if (kd === 'harness-proposal') { label = o['5'] }
  else if (kd === 'harness-gap') { label = 'gap' }
  else if (kd === 'harness-verdict') { label = 'verdict ' + o['2'] }
  nodes.set(k, { kind: kd, label, col })
}
for (const [k, size] of Object.entries(G.blobs)) {
  const name = [...Object.entries(R.names)].find(([, v]) => v === k)?.[0] || 'blob'
  nodes.set(k, { kind: 'blob', label: `${name} (${size} B)`, col: 3 })
}
const cols = [[], [], [], []]
for (const [k, n] of nodes) cols[n.col].push(k)
cols[2].sort((a, b) => { const A = G.objects[a], B = G.objects[b]; return (A['1'] ?? 0) - (B['1'] ?? 0) })

// ---- SVG graph ------------------------------------------------------------------------
const RH = 13, W = 1180, CX = [60, 320, 640, 960], CW = [160, 260, 260, 210]
const pos = new Map()
const H = Math.max(...cols.map(c => c.length)) * RH + 60
cols.forEach((c, ci) => c.forEach((k, i) => pos.set(k, { x: CX[ci], y: 30 + i * RH + (ci === 0 ? H / 2 - 30 : 0) })))
const relColor = { 'composed-of': '#3b6fd6', 'derived-from': '#d6763b', 'evidence-provenance': '#6aa84f', 'section-of': '#8e44ad', 'refers-to': '#999', 'certified-by': '#c0392b' }
let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="evidence graph">`
svg += ['run root', 'ledgers · checks · images', 'rows', 'blobs (saved bytes)'].map((t, i) => `<text x="${CX[i]}" y="16" class="colhead">${t}</text>`).join('')
for (const e of G.edges) {
  const a = pos.get(e.source), b = pos.get(e.target); if (!a || !b) continue
  svg += `<line x1="${a.x + CW[nodes.get(e.source).col]}" y1="${a.y - 4}" x2="${b.x}" y2="${b.y - 4}" stroke="${relColor[e.relation] || '#bbb'}" stroke-width="0.8" opacity="0.55"><title>${esc(e.relation)}: ${esc(short(e.source))} → ${esc(short(e.target))}</title></line>`
}
for (const [k, n] of nodes) {
  const p = pos.get(k)
  svg += `<g><rect x="${p.x}" y="${p.y - 11}" width="${CW[n.col]}" height="${RH - 1}" rx="2" class="node ${esc(n.kind)}"><title>${esc(k)}\n${esc(n.kind)}: ${esc(n.label)}</title></rect><text x="${p.x + 3}" y="${p.y - 2}" class="nl">${esc(n.label.slice(0, 40))} <tspan class="k">${esc(short(k))}</tspan></text></g>`
}
svg += '</svg>'
const legend = Object.entries(relColor).map(([r, c]) => `<span class="lg"><i style="background:${c}"></i>${r} (${G.edges.filter(e => e.relation === r).length})</span>`).join(' ')

// ---- per-kind panels (rendered server-side; totals recomputed client-side too) ----------
const calls = Object.entries(G.objects).filter(([, o]) => kind(o) === 'call').map(([k, o]) => ({ k, ...o })).sort((a, b) => a['1'] - b['1'])
const honest = Object.entries(G.objects).filter(([, o]) => kind(o) === 'record' && o['2'] === 'honest').map(([k, o]) => ({ k, f: o['3'] }))
const tamper = Object.entries(G.objects).filter(([, o]) => kind(o) === 'record' && o['2'] === 'tamper').map(([, o]) => o['3'])
const verdicts = Object.entries(G.objects).filter(([, o]) => kind(o) === 'harness-verdict').map(([k, o]) => ({ k, ...o }))
let panels = ''

if (calls.length) {
  const phase = (t) => t.replace(/_le\d+$/, '').replace(/_.*$/, '')
  const maxCpu = Math.max(...calls.map(c => c['7']))
  const bw = Math.max(4, Math.floor(1100 / calls.length))
  const bars = calls.map((c, i) => { const h = Math.max(1, Math.log10(1 + c['7']) / Math.log10(1 + maxCpu) * 140); const cls = c['3'] === 'SAT' ? 'sat' : c['3'] === 'UNSAT' ? 'unsat' : 'other'; return `<rect x="${40 + i * bw}" y="${150 - h}" width="${bw - 1}" height="${h}" class="bar ${cls}"><title>#${c['1']} ${esc(c['2'])} ${esc(c['3'])}\n${c['7']} CPU-s · ${c['4']} s wall · ${c['9'] ?? '?'} threads · ${c['8']} KiB</title></rect>` }).join('')
  panels += `<section><h2>Solver calls, in ledger order (CPU-seconds per call, log scale)</h2>
<svg viewBox="0 0 1180 170" width="100%"><g class="axis"><line x1="40" y1="150" x2="1160" y2="150"/><text x="2" y="20" class="small">10^${Math.log10(maxCpu).toFixed(1)}</text><text x="2" y="150" class="small">0</text></g>${bars}</svg>
<p class="small">green SAT · red UNSAT · grey TIMEOUT / ERROR / ABANDONED (charged in full). Hover a bar for the row.</p>
<table><thead><tr><th>#</th><th>tag</th><th>result</th><th>CPU-s</th><th>wall s</th><th>threads</th><th>peak RSS KiB</th><th>source</th><th>κ</th></tr></thead><tbody>
${calls.map(c => `<tr class="${esc(c['3']).toLowerCase()}"><td>${c['1']}</td><td>${esc(c['2'])}</td><td>${esc(c['3'])}</td><td class="num">${c['7'].toLocaleString()}</td><td class="num">${c['4']}</td><td class="num">${c['9'] ?? ''}</td><td class="num">${(c['8'] || 0).toLocaleString()}</td><td>${esc(c['13'] || '')}</td><td class="k">${esc(short(c.k))}</td></tr>`).join('\n')}
</tbody></table></section>`
}
if (honest.length) {
  const rows = honest.map(h => h.f)
  const maxE = Math.max(...rows.map(r => r.expand), ...rows.map(r => r.base_expand))
  const bw = Math.floor(1100 / rows.length)
  const bars = rows.map((r, i) => `<rect x="${40 + i * bw}" y="${150 - r.base_expand / maxE * 140}" width="${bw / 2 - 1}" height="${r.base_expand / maxE * 140}" class="bar base"><title>key ${r.key} msg ${r.msg}: base expand ${r.base_expand}</title></rect><rect x="${40 + i * bw + bw / 2}" y="${150 - r.expand / maxE * 140}" width="${bw / 2 - 1}" height="${r.expand / maxE * 140}" class="bar h2"><title>key ${r.key} msg ${r.msg}: H2 expand ${r.expand} (+${r.extra_cycles})</title></rect>`).join('')
  panels += `<section><h2>Honest runs: expand cycles, base (grey) against H2 (blue), per key/message</h2>
<svg viewBox="0 0 1180 170" width="100%"><g class="axis"><line x1="40" y1="150" x2="1160" y2="150"/></g>${bars}</svg>
<table><thead><tr><th>key</th><th>msg</th><th>ok</th><th>witness equal</th><th>verify</th><th>Δ verify</th><th>sign</th><th>Δ sign cycles</th><th>expand</th><th>extra compr = c</th><th>κ</th></tr></thead><tbody>
${honest.map(({ k, f: r }) => `<tr><td>${r.key}</td><td>${r.msg}</td><td>${r.ok ? '✓' : '✗'}</td><td>${r.witness_equal ? '✓' : '✗'}</td><td class="num">${r.verify}</td><td class="num">${r.verify - r.base_verify}</td><td class="num">${r.sign.toLocaleString()}</td><td class="num">${r.sign - r.base_sign}</td><td class="num">${r.expand.toLocaleString()}</td><td>${r.extra_compr === r.c ? '✓' : '✗'}</td><td class="k">${esc(short(k))}</td></tr>`).join('\n')}
</tbody></table>
<p class="small">Tamper runs: ${tamper.length}, rejected ${tamper.filter(t => t.ok).length} (every flipped offset exits 1 at expand). Cross and exhaustion rows are in the graph above as their own ledgers.</p></section>`
}
if (verdicts.length) {
  panels += `<section><h2>Verdicts</h2><table><thead><tr><th>proposal</th><th>status</th><th>metric</th><th>gate</th><th>κ</th></tr></thead><tbody>
${verdicts.map(v => { const p = G.objects[v['1']] || {}; return `<tr><td>${esc(p['5'] || '')}</td><td>${esc(v['2'])}</td><td class="num">${v['3'] ?? ''}</td><td>${esc(String(v['4'] || '').slice(0, 60))}</td><td class="k">${esc(short(v.k))}</td></tr>` }).join('\n')}
</tbody></table></section>`
}

// ---- checks and summaries as stored (the browser recomputes beside them) ----------------
const checks = Object.entries(G.objects).filter(([, o]) => kind(o) === 'check' || kind(o) === 'summary')
const checksHtml = checks.map(([k, o]) => `<tr><td>${esc(kind(o))}</td><td>${esc((G.objects[o['1']] || {})['1'] || '')}</td><td><code>${esc(JSON.stringify(kind(o) === 'summary' ? { n: o['2'], cpu_s: o['3'], peak_kb: o['4'], cpu_h: o['5'] } : o['3']))}</code></td><td class="recomp" data-k="${esc(k)}">…</td></tr>`).join('\n')

const title = titleArg || `${R.lane} — evidence graph`
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8;--sat:#4f9d59;--unsat:#c0392b;--oth:#9a9a94;--blue:#3b6fd6}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:1240px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.meta{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;font-size:.9rem}.meta code{word-break:break-all}
table{border-collapse:collapse;width:100%;font-size:.84rem;margin:.5em 0}th,td{border-bottom:1px solid var(--line);padding:3px 6px;text-align:left;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums}
tr.unsat td{color:var(--unsat)}tr.error td,tr.timeout td,tr.abandoned td{color:var(--mut)}
.k{font-family:ui-monospace,monospace;font-size:.78em;color:var(--mut)}.small{font-size:.82rem;color:var(--mut)}
.node{fill:#fff;stroke:#bbb;stroke-width:.6}.node.run-root{stroke:#d6a23b;stroke-width:1.4}.node.ledger,.node.check,.node.summary,.node.images{stroke:var(--blue)}.node.blob{stroke:#6aa84f}
@media (prefers-color-scheme:dark){.node{fill:#23232a}}
.nl{font-size:9px;fill:var(--fg)}.colhead{font-size:11px;fill:var(--mut);font-weight:600}
.bar.sat{fill:var(--sat)}.bar.unsat{fill:var(--unsat)}.bar.other{fill:var(--oth)}.bar.base{fill:#9a9a94}.bar.h2{fill:var(--blue)}.axis line{stroke:var(--line)}
.lg i{display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:middle}.lg{margin-right:12px;font-size:.82rem}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}
details summary{cursor:pointer;color:var(--mut)}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="banner">Status of every κ on this page: <b>${esc(R.status)}</b> — compatible with the registry's rules, not yet checked against its compiled crate (P1). Numbers below are recomputed in your browser from the embedded objects.</div>
<div class="meta">
<span>Evidence root</span><code>${esc(R.root_kappa)}</code>
<span>Lane · minted</span><span>${esc(R.lane)} · ${esc(R.minted_on)}</span>
<span>Merkle root</span><code>${esc(R.merkle_root_sha256)} (${R.merkle_leaves} leaves, provisional)</code>
<span>Counts</span><span>${R.counts.objects} objects · ${R.counts.blobs} blobs · ${R.counts.edges} edges</span>
<span>Upstream pins</span><span>${esc(Object.entries(R.upstream).map(([a, b]) => a + ' @ ' + b).join(' · '))}</span>
</div>
<h2>The graph</h2>
<p class="small">${legend}</p>
<div style="overflow:auto">${svg}</div>
<h2>Checks: stored beside recomputed</h2>
<table><thead><tr><th>kind</th><th>over ledger</th><th>stored facts</th><th>recomputed here, in your browser</th></tr></thead><tbody>${checksHtml}</tbody></table>
${panels}
<details><summary>Named objects (${Object.keys(R.names).length})</summary><table><tbody>${Object.entries(R.names).sort().map(([n, k]) => `<tr><td>${esc(n)}</td><td class="k">${esc(k)}</td></tr>`).join('')}</tbody></table></details>
<footer>
<div>Evidence root: <code>${esc(R.root_kappa)}</code></div>
<div>Reader κ: <code>see pairs.json (a reader never carries its own κ; the pair is minted by tools/pair.mjs as a transform/1 object)</code></div>
<div class="small">Generated by generators/gen_evidence_graph.mjs from the bundle's graph.json; agentprivacy-harness-demos. The run records stay in their lane; this page is a projection.</div>
</footer>
<script type="application/json" id="graph">${JSON.stringify({ objects: G.objects }).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  const G = JSON.parse(document.getElementById('graph').textContent).objects
  const kind = o => String(o['0']||'').split('/').slice(-2,-1)[0]
  const rules = {
    'summary': rows => { const cpu = Math.round(rows.reduce((a,c)=>a+c['7'],0)*100)/100; return { n: rows.length, cpu_s: cpu, peak_kb: Math.max(...rows.map(c=>c['8'])), cpu_h: Math.round(cpu/36)/100 } },
    'sig-golf/h2-honest/1': rows => { const h = rows.map(r=>r['3']); return { n:h.length, ok:h.filter(r=>r.ok).length, witness_equal:h.filter(r=>r.witness_equal).length, compact_ok:h.filter(r=>r.compact_ok).length, verify_delta_max:Math.max(...h.map(r=>r.verify-r.base_verify)), sign_delta_cycles:[...new Set(h.map(r=>r.sign-r.base_sign))].sort((a,b)=>a-b), sign_delta_compr:[...new Set(h.map(r=>r.sign_compr-r.base_sign_compr))].sort((a,b)=>a-b), extra_compr_eq_c:h.every(r=>r.extra_compr===r.c), expand_max:Math.max(...h.map(r=>r.expand)), verify_max:Math.max(...h.map(r=>r.verify)) } },
    'sig-golf/all-ok/1': rows => { const rs = rows.map(r=>r['3']); return { n:rs.length, ok:rs.filter(r=>r.ok).length, exits:[...new Set(rs.map(r=>String(r.exit!==undefined?r.exit:r.expand_exit)))].sort() } },
    'harness/run-tally/1': rows => { const st = rows.map(r=>r['2']); return { n:st.length, validated:st.filter(s=>s==='VALIDATED').length, statuses:[...new Set(st)].sort() } }
  }
  document.querySelectorAll('td.recomp').forEach(td => {
    const o = G[td.dataset.k]; const led = G[o['1']]; if (!led) { td.textContent = 'ledger missing'; return }
    const rows = led['2'].map(k => G[k]).filter(Boolean)
    const fn = kind(o) === 'summary' ? rules.summary : rules[o['2']]
    if (!fn) { td.textContent = 'no rule for ' + o['2']; return }
    const rec = fn(rows); const stored = kind(o) === 'summary' ? { n:o['2'], cpu_s:o['3'], peak_kb:o['4'], cpu_h:o['5'] } : o['3']
    const same = JSON.stringify(rec) === JSON.stringify(stored)
    td.innerHTML = '<code>' + JSON.stringify(rec) + '</code> ' + (same ? '<b style="color:#4f9d59">= stored</b>' : '<b style="color:#c0392b">≠ stored</b>')
  })
})()
</script>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${nodes.size} nodes, ${G.edges.length} edges; evidence root ${R.root_kappa}`)
