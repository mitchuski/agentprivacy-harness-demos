#!/usr/bin/env node
// gen_index.mjs — the index of the demos: every reader with its κ, the evidence root it was
// generated from, its generator's κ and the transform that binds them; the demos root over all.
//
//   node generators/gen_index.mjs <demosBundleDir> <out.html>
//
// The index is itself a reader, paired to the demos root it lists; by construction that pair
// is one step behind (the index cannot contain the pair that binds it), which is stated.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_index.mjs <demosBundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const pj = JSON.parse(readFileSync(join(bundle, 'blobs', R.names['source:pairs.json'].replace(/^sha256:/, '') + '.bin'), 'utf8'))
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const short = (k) => k.replace(/^sha256:/, '').slice(0, 12) + '…'
const titles = {
  'r32-route-search.html': ['hashsmash r32: the route search as an evidence graph', 'run-backed'],
  'sig-h2-gate.html': ['sig.golf H2 gate for record b96b3ca', 'run-backed'],
  'arena-rules.html': ['The arena rules, A1 to A40, by lane', 'prose-sourced'],
  'credit-provenance.html': ['Credit and provenance: citations and the r32 chain', 'prose-sourced'],
  'research-ledger.html': ['The research ledger and the fence map', 'prose-sourced'],
  'kappa-calibration.html': ['κ calibration: what a CPU-second is worth', 'rows-backed'],
  'judge-rehearsal.html': ['Judge rehearsal: fourteen dossiers, one aggregation rule', 'rows-backed'],
  'qpcbtc-abba-screen.html': ['The ABBA evidence screen: 22 sessions, one rule', 'rows-backed'],
  'precompile-census.html': ['The anti-fingerprint census: is it a lookup?', 'rows-backed'],
  'harness-serv-reader.html': ['The harness, read across four documents (SERV as prover)', 'SERV runs'],
  'harness-aggregate-reader_openserv.html': ['The harness, read across four documents (aggregate)', 'SERV runs'],
  'harness-serv-tests.html': ['Harness × SERV: runtime tests', 'SERV runs'],
  'harness-serv-fit.html': ['Harness × OpenServ: the fit', 'SERV runs'],
  'harness-findings.html': ['Harness findings: SERV tests (one-pager)', 'SERV runs'],
  'zk-forge-reader.html': ['The Constraint Forge: a harness reader', 'SERV runs'],
}
const order = ['run-backed', 'rows-backed', 'prose-sourced', 'SERV runs']
const rows = pj.pairs.map(p => ({ ...p, file: p.reader.replace(/^readers\//, ''), title: (titles[p.reader.replace(/^readers\//, '')] || [p.reader, 'other'])[0], cls: (titles[p.reader.replace(/^readers\//, '')] || [null, 'other'])[1] }))
  .sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || a.file.localeCompare(b.file))
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>agentprivacy harness demos: the readers and their κ</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8;--acc:#3b6fd6}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
.card{border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin:8px 0}.card a{color:var(--acc);text-decoration:none;font-weight:600}
.k{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--mut)}.k b{color:var(--fg);font-weight:500}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}.mut{color:var(--mut)}
</style></head><body>
<h1>agentprivacy harness demos: the readers and their κ</h1>
<div class="banner">${rows.length} readers generated from runs of the agentprivacy dual-agent harness and its challenge lanes. Each is a projection of κ'd bytes: a run bundle, a rows bundle or a sources bundle. Each reader has its own κ (sha256 of its bytes) bound to the evidence root it came from by a transform object; the ${rows.length} transforms sit under one demos root. Every κ is <b>${esc(R.status)}</b> until the cross-implementation check against the registry crate. The decimal travels; the root stays.</div>
${order.map(cls => { const rs = rows.filter(r => r.cls === cls); return rs.length ? `<h2>${esc(cls)}</h2>` + rs.map(r => `<div class="card"><a href="${esc(r.file)}">${esc(r.title)}</a> <span class="mut">· ${esc(r.lane)} · ${esc(r.date)}</span><div class="k">reader <b>${esc(short(r.reader_kappa))}</b> · evidence root <b>${esc(short(r.evidence_root))}</b> · generator ${esc(r.generator.replace(/^generators\//, ''))} <b>${esc(short(r.generator_kappa))}</b> · transform <b>${esc(short(r.transform_kappa))}</b></div></div>`).join('') : '' }).join('')}
<footer><div>Demos root: <code>${esc(R.root_kappa)}</code> (${R.counts.objects} objects, ${R.counts.edges} edges, minted ${esc(R.minted_on)})</div><div class="mut">Full κ in pairs.json. This index is a reader too; its pair binds it to the demos root above, which cannot contain that pair, so the index's own transform is one step behind by construction. Generated by generators/gen_index.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${rows.length} readers under demos root ${R.root_kappa}`)
