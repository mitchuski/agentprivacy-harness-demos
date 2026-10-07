#!/usr/bin/env node
// gen_calibration.mjs — the κ calibration: instructions per CPU-second, idle vs loaded vs
// saturated, per solver phase, from the hashsmash r32 kcal tables minted as rows.
//
//   node generators/gen_calibration.mjs <bundleDir> <out.html>
//
// Rows (record/1): kind "callgrind" {name: phase, instructions}, kind "native" / "saturated"
// {name: <cond>_<phase>_<i>[_<j>], user_s, sys_s, elapsed_s, maxrss_kb}. The reader recomputes
// every rate from the rows (rate = instructions / (user_s + sys_s)) in the browser.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_calibration.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const G = JSON.parse(readFileSync(join(bundle, 'graph.json'), 'utf8'))
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const recs = Object.entries(G.objects).filter(([, o]) => String(o['0'] || '').endsWith('/record/1')).map(([k, o]) => ({ k, kind: o['2'], f: o['3'] }))
const ir = Object.fromEntries(recs.filter(r => r.kind === 'callgrind').map(r => [r.f.name, r.f.instructions]))
const timing = recs.filter(r => r.kind !== 'callgrind').map(r => {
  const m = r.f.name.match(/^(idle|load|sat|t4)_(s1|p2|p3|p4|c45)/); return { ...r.f, k: r.k, cond: m ? m[1] : '?', phase: m ? m[2] : '?', cpu: r.f.user_s + r.f.sys_s }
})
const phases = ['s1', 'p2', 'p3', 'p4']
const conds = [['idle', 'idle, 1 thread'], ['load', '13 busy-loop spinners'], ['sat', 'saturated: 12 copies + 2 solver fillers'], ['t4', '4-thread native p4']]
const stats = {}
for (const ph of phases) for (const [c] of conds) {
  const xs = timing.filter(t => t.phase === ph && t.cond === c).map(t => t.cpu).sort((a, b) => a - b)
  if (!xs.length) continue
  const med = xs[Math.floor(xs.length / 2)]
  stats[`${c}_${ph}`] = { n: xs.length, min: xs[0], med, max: xs[xs.length - 1], rate_max: ir[ph] / xs[0], rate_med: ir[ph] / med, log2_max: Math.log2(ir[ph] / xs[0]), log2_med: Math.log2(ir[ph] / med) }
}
// chart: per phase, log2 rate for each condition
const W = 1100, H = 260, x0 = 70, y0 = 20, lo = 29.5, hi = 32.5
const yOf = (v) => y0 + (hi - v) / (hi - lo) * (H - 50)
const colc = { idle: '#4f9d59', load: '#d6a23b', sat: '#c0392b', t4: '#3b6fd6' }
let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="log2 instructions per CPU-second by phase and load">`
for (let v = 30; v <= 32; v += 0.5) svg += `<line x1="${x0}" y1="${yOf(v)}" x2="${W - 10}" y2="${yOf(v)}" class="grid"/><text x="4" y="${yOf(v) + 4}" class="small">2^${v}</text>`
phases.forEach((ph, i) => {
  const cx = x0 + 80 + i * 250
  svg += `<text x="${cx}" y="${H - 8}" class="small">${ph} · ${(ir[ph] / 1e9).toFixed(1)}e9 instr</text>`
  conds.forEach(([c], j) => { const s = stats[`${c}_${ph}`]; if (!s) return
    const x = cx + j * 40
    svg += `<line x1="${x}" y1="${yOf(Math.log2(ir[ph] / s.max))}" x2="${x}" y2="${yOf(s.log2_max)}" stroke="${colc[c]}" stroke-width="3" opacity=".6"><title>${c} ${ph}: n=${s.n}, CPU-s ${s.min}..${s.max}</title></line><circle cx="${x}" cy="${yOf(s.log2_med)}" r="4" fill="${colc[c]}"><title>${c} ${ph}: median rate 2^${s.log2_med.toFixed(2)}</title></circle>` })
})
svg += '</svg>'
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>κ calibration: instructions per CPU-second, by phase and load</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.grid{stroke:var(--line)}.small{font-size:11px;fill:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left}.num{text-align:right;font-variant-numeric:tabular-nums}
.lg i{display:inline-block;width:10px;height:10px;border-radius:5px;margin-right:4px}.lg{margin-right:12px;font-size:.85rem}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}.mut{color:var(--mut)}
</style></head><body>
<h1>κ calibration: what a CPU-second is worth</h1>
<div class="banner">A compute-priced claim needs a unit. The lane counted instructions with callgrind on the real charged models at a fixed 20,000-conflict budget (output identical to native), then timed the same replays idle, under a busy-loop load, saturated (the charged condition) and at four threads. The rate, and so the price κ, is a function of load: about 2^32 idle against about 2^30.0 to 2^30.6 saturated. Every number here is recomputed in your browser from ${recs.length} minted rows; status <b>${esc(R.status)}</b>.</div>
<p class="lg">${conds.map(([c, l]) => `<i style="background:${colc[c]}"></i>${l}`).join(' ')}</p>
${svg}
<h2>Rates per phase and condition (log2 instructions per CPU-second; bar = min..max, dot = median)</h2>
<table><thead><tr><th>phase</th><th>instructions (callgrind)</th>${conds.map(([c]) => `<th>${c}: n · CPU-s min/med/max · 2^rate max · 2^rate med</th>`).join('')}</tr></thead><tbody>
${phases.map(ph => `<tr><td>${ph}</td><td class="num">${ir[ph].toLocaleString()}</td>${conds.map(([c]) => { const s = stats[`${c}_${ph}`]; return s ? `<td class="num">${s.n} · ${s.min}/${s.med}/${s.max} · ${s.log2_max.toFixed(2)} · ${s.log2_med.toFixed(2)}</td>` : '<td class="mut">—</td>' }).join('')}</tr>`).join('')}
</tbody></table>
<h2>What the lane did with it</h2>
<p>The original calibration (one call, loaded) gave 2^30.03 instructions per CPU-second; with 2224 ops per unit and an ops-per-instruction factor the lane priced κ = 2^24 per CPU-second, then 2^23 (crediting a rival's re-justification), then per phase 2^22.5 to 2^22.8 from the saturated maxima above. The per-phase version was measured and not shipped: the κ lever was exhausted when the coordinator changed plan to the blind route search. The point of the table is the spread: idle versus saturated is a factor of about 4, which is 2 bits of claim, and a judge that cannot see the load cannot tell which one you charged. Minted beside the ledger it was charged against, the calibration becomes a fact a reviewer can re-derive, not a sentence in a proof.</p>
<footer><div>Evidence root (rows bundle): <code>${esc(R.root_kappa)}</code></div><div class="mut">Sources: kcal_native.tsv, kcal_saturated.tsv, kcal_callgrind.json (from the lane's r32_search/results). Reader κ: in pairs.json. Generated by generators/gen_calibration.mjs; agentprivacy-harness-demos.</div></footer>
<script type="application/json" id="rows">${JSON.stringify({ ir, timing: timing.map(t => ({ name: t.name, cond: t.cond, phase: t.phase, cpu: t.cpu })) }).replace(/</g, '\\u003c')}</script>
<script>
(function(){ const d = JSON.parse(document.getElementById('rows').textContent); let ok = 0, n = 0
  document.querySelectorAll('tbody tr').forEach(tr => { const ph = tr.children[0].textContent; ['idle','load','sat','t4'].forEach((c, j) => { const xs = d.timing.filter(t => t.phase === ph && t.cond === c).map(t => t.cpu).sort((a,b)=>a-b); if (!xs.length) return; n++
    const want = tr.children[2 + j].textContent; const got = xs.length + ' · ' + xs[0] + '/' + xs[Math.floor(xs.length/2)] + '/' + xs[xs.length-1] + ' · ' + Math.log2(d.ir[ph]/xs[0]).toFixed(2) + ' · ' + Math.log2(d.ir[ph]/xs[Math.floor(xs.length/2)]).toFixed(2); if (want === got) ok++ }) })
  const b = document.querySelector('.banner'); b.insertAdjacentHTML('beforeend', ' <b style="color:' + (ok === n ? '#4f9d59' : '#c0392b') + '">Browser recompute: ' + ok + ' of ' + n + ' cells match.</b>') })()
</script></body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${recs.length} rows; phases ${phases.join(',')}; conditions ${conds.map(c => c[0]).join(',')}`)
