#!/usr/bin/env node
// gen_precompile.mjs — the anti-fingerprint census: nineteen MODEXP artefacts (the lane's own
// and the board's frontier crowns) run through the same census under one pinned secret:
// correctness on fresh random inputs, pinning ratio against same-size siblings, public total.
//
//   node generators/gen_precompile.mjs <bundleDir> <out.html>
//
// Rows (record/1, kind "artifact"): {name, file, bytes, ours, seedHex, secretHex, publicTotal,
// correctness{n, fail[], public_fail[]}, pinning{worstRatio, fail[]}, status}

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_precompile.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const G = JSON.parse(readFileSync(join(bundle, 'graph.json'), 'utf8'))
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const A = Object.entries(G.objects).filter(([, o]) => String(o['0'] || '').endsWith('/record/1')).map(([k, o]) => ({ k, ...o['3'] })).filter(a => typeof a.publicTotal === 'number').sort((a, b) => a.publicTotal - b.publicTotal)
const PIN = 1.10
const maxT = Math.max(...A.map(a => a.publicTotal))
const W = 1100, rh = 20, x0 = 220
let svg = `<svg viewBox="0 0 ${W} ${30 + A.length * rh}" width="100%" role="img" aria-label="public gas total per artefact">`
A.forEach((a, i) => {
  const y = 20 + i * rh, w = (a.publicTotal / maxT) * (W - x0 - 120)
  svg += `<text x="4" y="${y + 13}" class="lbl${a.ours ? ' ours' : ''}">${esc(a.name)}</text><rect x="${x0}" y="${y + 2}" width="${w}" height="${rh - 5}" rx="2" class="bar${a.ours ? ' ours' : ''}${a.pinning.worstRatio > PIN ? ' pinned' : ''}"><title>${esc(a.name)}: ${a.publicTotal.toLocaleString()} gas · pinning ${a.pinning.worstRatio} · ${a.correctness.n} vectors, ${a.correctness.fail.length} fail</title></rect><text x="${x0 + w + 6}" y="${y + 13}" class="num">${a.publicTotal.toLocaleString()} · pin ${a.pinning.worstRatio}</text>`
})
svg += '</svg>'
const seeds = [...new Set(A.map(a => a.secretHex))]
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The anti-fingerprint census: is it a lookup?</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.lbl{font-size:11px;fill:var(--fg)}.lbl.ours{font-weight:700}.num{font-size:11px;fill:var(--mut)}
.bar{fill:#9a9a94}.bar.ours{fill:#3b6fd6}.bar.pinned{fill:#c0392b}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}.mut{color:var(--mut)}
</style></head><body>
<h1>The anti-fingerprint census: is it a lookup?</h1>
<div class="banner">A MODEXP artefact that memorises the public test vectors scores well and is worthless. The lane's census draws fresh random inputs from <code>SHA256(bytecode || secret)</code>, so a proposer cannot precompute them, and same-size siblings of each public vector; an honest path varies under 1% across values, a lookup blows past the pinning ratio of ${PIN}. Here every artefact the lane holds, its own (blue) and the board's frontier crowns (grey), was run through the same census under one pinned secret (<code>${esc(seeds[0] || '')}</code>) so a reader can re-run it exactly. A red bar would be a MIRAGE. Status of every κ: <b>${esc(R.status)}</b>.</div>
${svg}
<h2>Rows</h2>
<table><thead><tr><th>artefact</th><th>bytes</th><th class="n">public total (gas, 44-vector corpus)</th><th class="n">vectors</th><th class="n">correctness fails</th><th class="n">pinning worst ratio</th><th>status</th><th>seed</th></tr></thead><tbody>
${A.map(a => `<tr${a.ours ? ' style="font-weight:600"' : ''}><td>${esc(a.name)}</td><td class="n">${a.bytes}</td><td class="n">${a.publicTotal.toLocaleString()}</td><td class="n">${a.correctness.n}</td><td class="n">${a.correctness.fail.length}</td><td class="n">${a.pinning.worstRatio}</td><td>${esc(a.status)}</td><td><code>${esc(String(a.seedHex).slice(0, 12))}…</code></td></tr>`).join('')}
</tbody></table>
<h2>What the row order says</h2>
<p>Sorted by public total, lowest first. The lane's k11 (824,737) sits below the board's best live frontier (frontier-live5, 834,027, the same total as the lane's k12) and k11 is the one that failed the organiser's hidden size validator in 14 seconds; the lesson A3 in the harness's arena rules ("reproduce the organiser's validator locally") was paid for here. k10 at 859,429 was the lane's last accepted position against a board of 936,645 (frontier-live3 above, the only other artefact with a pinning ratio off 1.0, at 1.0212, still far under the line). Nothing in the set is a lookup: the census is the gate that would have said so, and the rows are the proof it ran on the frontier's own bytes as well as ours.</p>
<footer><div>Evidence root (rows bundle): <code>${esc(R.root_kappa)}</code></div><div class="mut">Source: precompile_census.json, the census tool's JSON reports (one per artefact, 24 random + 26 sibling vectors, pinned secret) produced on 2026-10-08 from the lane's artefact directory. Reader κ: in pairs.json. Generated by generators/gen_precompile.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${A.length} artefacts, ${A.filter(a => a.ours).length} ours`)
