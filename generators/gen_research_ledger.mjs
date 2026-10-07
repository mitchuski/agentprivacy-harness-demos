#!/usr/bin/env node
// gen_research_ledger.mjs — the research ledger and the fence map: every pathway with its
// verdict (sig_mage HANDOFF §5) and every killed lever with its boundary and reopen condition
// (better_codes_mage KILLED_LEVERS.md). A kill without a reopen condition is a mood.
//
//   node generators/gen_research_ledger.mjs <bundleDir> <out.html>
//
// Parsed from the κ'd blobs in a sources bundle (tools/mint_sources.mjs).

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [bundleArg, outArg] = process.argv.slice(2)
if (!bundleArg || !outArg) { console.error('usage: node generators/gen_research_ledger.mjs <bundleDir> <out.html>'); process.exit(2) }
const bundle = resolve(bundleArg)
const R = JSON.parse(readFileSync(join(bundle, 'root.json'), 'utf8'))
const blob = (name) => readFileSync(join(bundle, 'blobs', R.names[name].replace(/^sha256:/, '') + '.bin'), 'utf8')
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')

// ---- sig_mage research ledger (HANDOFF §5 table) ----------------------------------------------
const H = blob('source:HANDOFF_2026-10-07.md')
const sec = (H.match(/## 5\. Research ledger[\s\S]*?(?=\n## 6)/) || [''])[0]
const rows = sec.split('\n').filter(l => /^\| /.test(l) && !/^\| pathway/.test(l) && !/^\|---/.test(l)).map(l => l.split('|').slice(1, -1).map(s => s.trim()))
const verdictOf = (s) => /\bDead\b|Closed negative|NO-GO/i.test(s) ? 'dead' : /Queue only|Opportunistic|Only after|Do not start|Verify on v7 before/i.test(s) ? 'park' : /Done, adopted/i.test(s) ? 'done' : /Worth|Land once|Unique/i.test(s) ? 'go' : 'queue'
const lesson = (sec.match(/Lesson from the 0427 reprice:[\s\S]*?(?=\n\n|$)/) || [''])[0].replace(/\n/g, ' ')

// ---- better_codes killed levers (## K-… headings with Killed / Boundary / Re-open) ------------
const K = blob('source:KILLED_LEVERS.md')
const kills = []
for (const part of K.split(/\n## /).slice(1)) {
  const title = part.split('\n')[0]
  const id = (title.match(/^(K-[\w.\-]+)/) || [])[1]; if (!id) continue
  const grab = (re) => { const m = part.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : '' }
  kills.push({ id, title: title.replace(/^K-[\w.\-]+\s*[—-]\s*/, ''),
    killed: grab(/\*\*Killed\*\*\s*([^\n]+)/), claim: grab(/\*\*The claim\.\*\*\s*([\s\S]*?)\n\n/), kill: grab(/\*\*The kill\.\*\*\s*([\s\S]*?)\n\n/),
    boundary: grab(/\*\*Boundary(?: \(honest\))?[:.]\*\*\s*([\s\S]*?)(?:\n\n|$)/), reopen: grab(/\*\*Re-open condition\.\*\*\s*([\s\S]*?)(?:\n\n|$)/) })
}
const vcol = { go: '#4f9d59', done: '#3b6fd6', park: '#d6a23b', queue: '#8e44ad', dead: '#c0392b' }

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The research ledger and the fence map</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--mut:#6b6b66;--line:#e4e1d8}
@media (prefers-color-scheme:dark){:root{--bg:#15151a;--fg:#ececea;--mut:#9a9a96;--line:#2c2c33}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.4em 0 .4em;border-bottom:1px solid var(--line)}
.banner{border:1px solid var(--line);border-left:4px solid #d6a23b;padding:8px 12px;border-radius:4px;margin:10px 0;font-size:.9rem}
table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}
.v{display:inline-block;color:#fff;border-radius:10px;padding:0 8px;font-size:.78rem;font-weight:600}
.fence{border:1px solid var(--line);border-left:4px solid #c0392b;border-radius:6px;padding:8px 12px;margin:10px 0}
.fence h3{margin:.1em 0 .3em;font-size:.98rem}.fence .lbl{color:var(--mut);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
.fence p{margin:.2em 0 .6em}.reopen{border-left:3px solid #4f9d59;padding-left:8px}
footer{margin-top:2em;padding-top:1em;border-top:1px solid var(--line);font-size:.85rem}code{word-break:break-all}.mut{color:var(--mut)}
</style></head><body>
<h1>The research ledger and the fence map</h1>
<div class="banner">Two instruments the lanes keep between rounds. The <b>research ledger</b> lists every pathway with a verdict and the condition that reopens it (sig_mage, 7 October 2026). The <b>fence map</b> is the killed-lever file: each fence names what was exhaustive, what was only priced, and the evidence that would lift it (better_codes_mage). Parsed from the κ'd blobs; status <b>${esc(R.status)}</b>.</div>
<h2>Research ledger: every pathway, with a verdict (sig_mage, HANDOFF §5)</h2>
<p>${['go', 'done', 'park', 'queue', 'dead'].map(v => `<span class="v" style="background:${vcol[v]}">${v}</span> ${rows.filter(r => verdictOf(r[2]) === v).length}`).join(' &nbsp; ')}</p>
<table><thead><tr><th>pathway</th><th>where</th><th>verdict</th><th>status, in the lane's words</th></tr></thead><tbody>
${rows.map(r => { const v = verdictOf(r[2]); return `<tr><td>${inline(r[0])}</td><td class="mut">${inline(r[1])}</td><td><span class="v" style="background:${vcol[v]}">${v}</span></td><td>${inline(r[2])}</td></tr>` }).join('\n')}
</tbody></table>
<p class="mut">${inline(lesson)}</p>
<h2>The fence map: killed levers with their reopen conditions (better_codes_mage)</h2>
<p>${kills.length} fences. A seat may not re-propose a fenced lever without the evidence its reopen condition names.</p>
${kills.map(k => `<div class="fence"><h3>${esc(k.id)} · ${inline(k.title)}</h3><div class="lbl">killed</div><p>${inline(k.killed)}</p>${k.claim ? `<div class="lbl">the claim</div><p>${inline(k.claim.slice(0, 600))}</p>` : ''}${k.kill ? `<div class="lbl">the kill</div><p>${inline(k.kill.slice(0, 900))}</p>` : ''}${k.boundary ? `<div class="lbl">boundary (honest)</div><p>${inline(k.boundary)}</p>` : ''}<div class="lbl">reopen condition</div><p class="reopen">${k.reopen ? inline(k.reopen.slice(0, 900)) : '<b style="color:#c0392b">none stated: a mood, not a finding</b>'}</p></div>`).join('')}
<footer><div>Evidence root (sources bundle): <code>${esc(R.root_kappa)}</code></div><div>Blobs: HANDOFF <code>${esc(R.names['source:HANDOFF_2026-10-07.md'])}</code> · KILLED_LEVERS <code>${esc(R.names['source:KILLED_LEVERS.md'])}</code></div><div class="mut">Reader κ: in pairs.json. Generated by generators/gen_research_ledger.mjs; agentprivacy-harness-demos.</div></footer>
</body></html>
`
writeFileSync(resolve(outArg), html)
console.log(`wrote ${outArg}: ${rows.length} pathways, ${kills.length} fences (${kills.filter(k => !k.reopen).length} without a reopen condition)`)
