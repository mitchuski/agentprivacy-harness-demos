#!/usr/bin/env node
// gen_qpcbtc.mjs — the ABBA evidence screen: 22 interleaved A/B measurement sessions on the
// Quantum Safe Bitcoin board, each a gain with its standard error, each arm's verified hits
// and completed work, and the screen's own rules (provenance before percentage; a SCREEN_PASS
// is not permission to submit; agreement is not recall).
//
//   node generators/gen_qpcbtc.mjs <bundleDir> <out.html>
//
// Rows (record/1, kind "session"): {name: stamp, track, seed, seconds, gpu, arms_n, all_verified,
// gate_no_regression, counter_gain_pct, work_gain_pct, work_se_pct, score_gain_pct,
// control_spread_pct, gain_se_pct, arms[{arm, score_Mps, work_Mps, verified_hits, attempts, wall_s, ...}]}

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_qpcbtc.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const G = JSON.parse(readFileSync(join(bundle, 'graph.json'), 'utf8'))
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const S = Object.entries(G.objects).filter(([, o]) => String(o['0'] || '').endsWith('/record/1')).map(([k, o]) => ({ k, ...o['3'] })).sort((a, b) => String(a.name).localeCompare(String(b.name)))
const num = (v) => typeof v === 'number' && Number.isFinite(v)
// recompute per session from arms: mean work rate of A arms vs B arms, gain = B/A - 1
const rec = (s) => { const A = s.arms.filter(a => /^A/.test(a.arm) && num(a.work_Mps)).map(a => a.work_Mps), B = s.arms.filter(a => /^B/.test(a.arm) && num(a.work_Mps)).map(a => a.work_Mps); if (!A.length || !B.length) return null; const m = (x) => x.reduce((p, c) => p + c, 0) / x.length; return (m(B) / m(A) - 1) * 100 }
// chart: gain with ±1 SE per session, order by stamp
const W = 1100, H = 300, x0 = 60, lo = -20, hi = 22
const yOf = (v) => 20 + (hi - v) / (hi - lo) * (H - 60)
const bw = Math.floor((W - x0 - 20) / S.length)
let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="score gain per session with standard error">`
for (const v of [-20, -10, 0, 10, 20]) svg += `<line x1="${x0}" y1="${yOf(v)}" x2="${W - 10}" y2="${yOf(v)}" class="grid${v === 0 ? ' zero' : ''}"/><text x="4" y="${yOf(v) + 4}" class="small">${v}%</text>`
S.forEach((s, i) => {
  const x = x0 + i * bw + bw / 2
  if (!num(s.score_gain_pct)) { svg += `<text x="${x - 4}" y="${yOf(0) - 6}" class="small">n/a</text>`; return }
  const se = num(s.gain_se_pct) ? s.gain_se_pct : 0
  const pass = s.all_verified && s.gate_no_regression
  svg += `<line x1="${x}" y1="${yOf(s.score_gain_pct - se)}" x2="${x}" y2="${yOf(s.score_gain_pct + se)}" stroke="${pass ? '#4f9d59' : '#c0392b'}" stroke-width="2"/><circle cx="${x}" cy="${yOf(s.score_gain_pct)}" r="4" fill="${pass ? '#4f9d59' : '#c0392b'}"><title>${esc(s.name)} seed ${s.seed}: score gain ${s.score_gain_pct}% ± ${se} (SE); ${s.arms_n} arms; verified ${s.all_verified}; no-regression gate ${s.gate_no_regression}; control spread ${s.control_spread_pct}%</title></circle>`
})
svg += '</svg>'
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The ABBA evidence screen: 22 sessions, one rule</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.grid{stroke:var(--line)}.grid.zero{stroke:var(--mut)}.small{font-size:11px;fill:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:.84rem}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums}
details summary{cursor:pointer;color:var(--mut)}.arms{font-size:.8rem;color:var(--mut)}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}.mut{color:var(--mut)}
</style></head><body>
<h1>The ABBA evidence screen: 22 sessions, one rule</h1>
<div class="banner">On the Quantum Safe Bitcoin board a lever's worth is a rate. The lane measured each candidate against its base in interleaved arms (A, B, B, A) on the same GPU in the same minute, so clocks, thermals and the first-arm warm-up cancel; every arm's hits were verified; the gain is reported with its standard error; and the screen's own rules say what a pass means: provenance fields first, at least three four-arm blocks, a lower confidence bound above the threshold, and <b>a SCREEN_PASS is not permission to submit</b>. The sessions below are the raw record. Status of every κ: <b>${esc(R.status)}</b>.</div>
${svg}
<p class="mut">Score gain of B over A per session, ± one standard error; green when every arm verified and the no-regression gate held, red otherwise. Hover a point.</p>
<h2>Sessions</h2>
<table><thead><tr><th>stamp</th><th>seed</th><th>s/arm</th><th>GPU</th><th>arms</th><th>verified</th><th>gate</th><th>score gain %</th><th>work gain %</th><th>± SE</th><th>control spread %</th><th>recomputed from arms (work, B/A−1)</th></tr></thead><tbody>
${S.map(s => { const r = rec(s); return `<tr><td>${esc(s.name)}</td><td class="num">${s.seed ?? ''}</td><td class="num">${s.seconds ?? ''}</td><td>${esc(s.gpu || '')}</td><td class="num">${s.arms_n ?? s.arms.length}</td><td>${s.all_verified ? '✓' : '✗'}</td><td>${s.gate_no_regression ? '✓' : '✗'}</td><td class="num">${num(s.score_gain_pct) ? s.score_gain_pct : '—'}</td><td class="num">${num(s.work_gain_pct) ? s.work_gain_pct : '—'}</td><td class="num">${num(s.gain_se_pct) ? s.gain_se_pct : '—'}</td><td class="num">${num(s.control_spread_pct) ? s.control_spread_pct : '—'}</td><td class="num">${r === null ? '—' : r.toFixed(2) + '%'}</td></tr>
<tr><td colspan="12"><details><summary>arms</summary><table class="arms"><thead><tr><th>arm</th><th>score Mps</th><th>work Mps</th><th>verified hits</th><th>attempts</th><th>wall s</th><th>clock MHz</th><th>temp C</th></tr></thead><tbody>${s.arms.map(a => `<tr><td>${esc(a.arm)}</td><td class="num">${a.score_Mps ?? ''}</td><td class="num">${a.work_Mps ?? ''}</td><td class="num">${a.verified_hits ?? ''}${a.verified ? '' : ' (unverified)'}</td><td class="num">${a.attempts ?? ''}</td><td class="num">${a.wall_s ?? ''}</td><td class="num">${a.clock_MHz ?? ''}</td><td class="num">${a.temp_C ?? ''}</td></tr>`).join('')}</tbody></table></details></td></tr>` }).join('\n')}
</tbody></table>
<h2>What the record shows</h2>
<p>Most sessions sit within a few percent of zero with standard errors of the same size: the honest reading of most levers was "no measurable gain", and the lane filed them that way. The large negative sessions are the no-regression gate doing its job on a candidate that lost work rate. The two large positive sessions at the end are the composition the lane submitted (63d18ddb), credited to both parent trees. The "recomputed" column re-derives the gain from the arms' completed-work rates in your browser; where it differs from the reported score gain, the difference is the scoring identity (score = peak × ratio), which the lane learned to call accounting, not physics, and withdrew a thermal story over.</p>
<footer><div>Evidence root (rows bundle): <code>${esc(R.root_kappa)}</code></div><div class="mut">Source: qpcbtc_abba.json, a digest of the lane's 22 abba-subset measurement files (harness/runs/measure). Reader κ: in pairs.json. Generated by generators/gen_qpcbtc.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${S.length} sessions`)
