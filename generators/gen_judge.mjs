#!/usr/bin/env node
// gen_judge.mjs — judge rehearsal: the AI judge's dossiers for fourteen packages (eleven other
// solvers' PRs, three of the lane's own) as one matrix of heuristic ratings and lane verdicts,
// with the aggregation rule the lane read out of the judge's own code.
//
//   node generators/gen_judge.mjs <bundleDir> <out.html>
//
// Rows (record/1, kind "dossier"): {name, source, track, model, mode, lanes{...}, claim{...},
// heuristics{id: status}, n_unsupported, n_plausible, statuses, package_sha256}.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_judge.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const G = JSON.parse(readFileSync(join(bundle, 'graph.json'), 'utf8'))
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const rows = Object.entries(G.objects).filter(([, o]) => String(o['0'] || '').endsWith('/record/1')).map(([k, o]) => ({ k, ...o['3'] }))
const order = (r) => (r.source === 'own' ? 1 : 0) * 1000 + (parseInt(String(r.name).replace(/\D/g, '')) || 0)
rows.sort((a, b) => a.track.localeCompare(b.track) || order(a) - order(b))
const heurIds = [...new Set(rows.flatMap(r => Object.keys(r.heuristics || {})))].sort()
const col = { plausible: '#4f9d59', unsupported: '#c0392b', refuted: '#7b1e1e', implausible: '#d6763b', unresolved: '#9a9a94' }
const lcol = { plausible_not_refuted: '#4f9d59', not_evaluable: '#d6a23b', refuted: '#c0392b', not_qualified: '#9a9a94' }
const short = (id) => id.replace(/^lane_(\w+)\/heuristic\//, (m, l) => (l === 'cost' ? 'cost·' : l === 'cryptanalysis' ? 'crypt·' : l + '·'))
const cw = 18
let m = `<svg viewBox="0 0 ${260 + heurIds.length * cw} ${30 + rows.length * 22}" width="100%" role="img" aria-label="heuristic ratings per package">`
heurIds.forEach((h, i) => { m += `<text x="${262 + i * cw}" y="24" class="hh" transform="rotate(-60 ${262 + i * cw},24)">${esc(short(h))}</text>` })
rows.forEach((r, ri) => {
  const y = 30 + ri * 22
  m += `<text x="2" y="${y + 14}" class="who${r.source === 'own' ? ' own' : ''}">${esc(r.name)} <tspan class="mut">${esc(r.track.replace('-exploratory', ''))}</tspan></text>`
  const lx = ['exploratory', 'rigorous'].map((ln, j) => { const s = (r.lanes[ln] || {}).status || '?'; return `<rect x="${170 + j * 42}" y="${y + 3}" width="40" height="16" rx="3" fill="${lcol[s] || '#000'}"><title>${ln}: ${esc(s)}${(r.lanes[ln] || {}).reasons ? '\n' + esc(r.lanes[ln].reasons.join('\n')) : ''}</title></rect>` }).join('')
  m += lx
  heurIds.forEach((h, i) => { const s = (r.heuristics || {})[h]; if (!s) return; m += `<rect x="${256 + i * cw}" y="${y + 3}" width="${cw - 2}" height="16" rx="2" fill="${col[s] || '#000'}"><title>${esc(r.name)} · ${esc(h)}: ${esc(s)}</title></rect>` })
})
m += '</svg>'
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Judge rehearsal: fourteen dossiers, one aggregation rule</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1240px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.hh{font-size:9px;fill:var(--mut)}.who{font-size:12px;fill:var(--fg)}.who.own{font-weight:700}.mut{fill:var(--mut);color:var(--mut)}
.lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px}.lg{margin-right:12px;font-size:.85rem}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}
</style></head><body>
<h1>Judge rehearsal: fourteen dossiers, one aggregation rule</h1>
<div class="banner">The hashsmash judge is a model committee (${esc([...new Set(rows.map(r => r.model))].join(', '))}, mode ${esc([...new Set(rows.map(r => r.mode))].join(', '))}) that rates every heuristic a package declares and rules per lane. The lane archived the dossiers of eleven other entries and its own three, digested them, and read the aggregation out of the judge's code: <b>one <code>unsupported</code> rating, in any lane, makes the whole package not_evaluable</b>. That is why every heuristic's wording was hardened before the package that passed. Status of every κ: <b>${esc(R.status)}</b>.</div>
<p class="lg">lanes: <i style="background:${lcol.plausible_not_refuted}"></i>plausible, not refuted <i style="background:${lcol.not_evaluable}"></i>not evaluable <i style="background:${lcol.refuted}"></i>refuted <i style="background:${lcol.not_qualified}"></i>not qualified &nbsp; heuristics: <i style="background:${col.plausible}"></i>plausible <i style="background:${col.unsupported}"></i>unsupported <i style="background:${col.refuted}"></i>refuted <i style="background:${col.implausible}"></i>implausible</p>
<div style="overflow:auto">${m}</div>
<p class="mut">Rows in bold are the lane's own packages. Columns: the exploratory and rigorous lane verdicts, then one cell per declared heuristic (hover for its id and rating). ${heurIds.length} distinct heuristic ids across ${rows.length} dossiers.</p>
<h2>The rule, checked against the rows</h2>
<table><thead><tr><th>package</th><th>track</th><th>heuristics</th><th>unsupported</th><th>exploratory lane</th><th>rule predicts</th><th>agrees</th></tr></thead><tbody>
${rows.map(r => { const pred = r.n_unsupported > 0 ? 'not_evaluable or refuted' : 'evaluable'; const got = (r.lanes.exploratory || {}).status || '?'; const agree = r.n_unsupported > 0 ? /not_evaluable|refuted/.test(got) : !/refuted/.test(got); return `<tr${r.source === 'own' ? ' style="font-weight:600"' : ''}><td>${esc(r.name)}</td><td>${esc(r.track)}</td><td class="num">${r.n_heuristics}</td><td class="num">${r.n_unsupported}</td><td>${esc(got)}</td><td>${pred}</td><td>${agree ? '✓' : '✗ (not_evaluable for another reason: see the lane reasons on hover)'}</td></tr>` }).join('')}
</tbody></table>
<p>The exception the rule does not explain is the lane's own 1ac3bbb5: zero unsupported heuristics, still not evaluable. Its reasons name <i>evidence_relevant</i> only: the evidence was "participant-reported only". The repaired package shipped an organiser-executed replay and a credited certificate, and passed (8bad82c1, not in this archive because its dossier was still pending at the fold).</p>
<h2>Claims the judge saw</h2>
<table><thead><tr><th>package</th><th>time log2</th><th>preprocessing log2</th><th>memory log2</th><th>success</th><th>advice log2</th><th>package sha256</th></tr></thead><tbody>
${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.claim.time_log2 ?? ''}</td><td class="num">${r.claim.preprocessing_log2 ?? ''}</td><td class="num">${r.claim.memory_log2_bytes ?? ''}</td><td class="num">${r.claim.success_probability ?? ''}</td><td class="num">${r.claim.nonuniform_advice_log2_bytes ?? ''}</td><td><code>${esc(String(r.package_sha256 || '').slice(0, 16))}…</code></td></tr>`).join('')}
</tbody></table>
<footer><div>Evidence root (rows bundle): <code>${esc(R.root_kappa)}</code></div><div class="mut">Source: judge_digest.json, a digest of fourteen judge-dossier.json files (eleven from other entries' public workflow artefacts, three from the lane's own verdicts); the digest is the blob every row cites. Reader κ: in pairs.json. Generated by generators/gen_judge.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${rows.length} dossiers, ${heurIds.length} heuristic ids`)
