#!/usr/bin/env node
// mint_demos.mjs — the κ graph of the demos: every transform/1 pair object (pairs/*.cbor,
// already canonical) in one ledger, pairs.json as the blob each cites, one root over all of
// it. Same layout as every other bundle here; verified by the harness and Python verifiers.
//
//   node tools/mint_demos.mjs <bundleOutDir>

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const HERE = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const HARNESS = (process.env.HARNESS || HERE + '../../dual-agent-harness/').replace(/\/?$/, '/')
const D = await import(pathToFileURL(HARNESS + 'tools/dcbor.mjs').href)
const NS = 'agentprivacy-evidence', lane = 'harness-demos/pairs', asserter = 'unsigned:harness-demos'
const repo = resolve(HERE, '..')
const [outArg] = process.argv.slice(2)
if (!outArg) { console.error('usage: node tools/mint_demos.mjs <bundleOutDir>'); process.exit(2) }

const objects = new Map(), blobs = new Map(), edges = new Map(), names = new Map()
const put = (v, name) => { const k = D.kappaFromValue(v); objects.set(k, v); if (name) names.set(name, k); return k }
const edge = (s, t, rel) => { const e = D.edgeRecord(s, t, rel, asserter); edges.set(D.kappaFromValue(e), e) }
const pj = readFileSync(join(repo, 'pairs.json'))
const pjK = D.kappaFromBytes(pj); blobs.set(pjK, pj); names.set('source:pairs.json', pjK)
const pairs = JSON.parse(pj.toString('utf8')).pairs
const ks = []
for (const fn of readdirSync(join(repo, 'pairs')).sort()) {
  const bytes = readFileSync(join(repo, 'pairs', fn))
  const v = D.decode(bytes); const k = D.kappaFromBytes(bytes)
  if ('sha256:' + fn.replace(/\.cbor$/, '') !== k) throw new Error(`pair object ${fn} does not hash to its name`)
  const p = pairs.find(x => x.transform_kappa === k); if (!p) throw new Error(`pair object ${fn} not in pairs.json`)
  objects.set(k, v); names.set('pair:' + p.reader.replace(/^readers\//, ''), k); ks.push(k)
  edge(k, pjK, 'evidence-provenance')
  edge(k, v.get(2), 'derived-from') // the evidence root the reader was generated from (may live in another bundle)
}
const lk = put(new Map([[0, `${NS}/ledger/1`], [1, 'pairs-ledger'], [2, ks], [3, lane], [4, `${ks.length} transform/1 pairs: reader κ bound to evidence root and generator κ`]]), 'pairs-ledger')
for (const k of ks) edge(lk, k, 'composed-of')
const ck = put(new Map([[0, `${NS}/check/1`], [1, lk], [2, 'rows/count/1'], [3, { n: ks.length }]]), 'pairs-count'); edge(ck, lk, 'derived-from')
const leaves = [...objects.keys(), ...blobs.keys(), ...edges.keys()].sort()
const mroot = D.merkleRoot(leaves.map(x => Buffer.from(x))).toString('hex')
const date = new Date().toISOString().slice(0, 10)
const root = new Map([[0, `${NS}/run-root/1`], [1, lane], [2, date], [3, [...names.entries()].sort()], [4, mroot], [5, D.STATUS], [6, asserter], [7, D.UPSTREAM]])
const rootK = D.kappaFromValue(root); objects.set(rootK, root)
for (const n of ['pairs-ledger', 'pairs-count']) { const e = D.edgeRecord(rootK, names.get(n), 'composed-of', asserter); edges.set(D.kappaFromValue(e), e) }

const out = resolve(outArg)
rmSync(out, { recursive: true, force: true })
for (const d of ['objects', 'blobs', 'edges']) mkdirSync(join(out, d), { recursive: true })
for (const [k, v] of objects) writeFileSync(join(out, 'objects', D.splitKappa(k)[1] + '.cbor'), D.encode(v))
for (const [k, b] of blobs) writeFileSync(join(out, 'blobs', D.splitKappa(k)[1] + '.bin'), b)
for (const [k, e] of edges) writeFileSync(join(out, 'edges', D.splitKappa(k)[1] + '.cbor'), D.encode(e))
const js = (v) => v instanceof Map ? Object.fromEntries([...v].map(([k, x]) => [String(k), js(x)])) : Array.isArray(v) ? v.map(js) : v
writeFileSync(join(out, 'root.json'), JSON.stringify({ root_kappa: rootK, status: D.STATUS, lane, minted_on: date, merkle_root_sha256: mroot, merkle_leaves: leaves.length,
  counts: { objects: objects.size, blobs: blobs.size, edges: edges.size }, names: Object.fromEntries(names), upstream: D.UPSTREAM }, null, 1) + '\n')
writeFileSync(join(out, 'graph.json'), JSON.stringify({ status: D.STATUS, root: rootK, objects: Object.fromEntries([...objects].map(([k, v]) => [k, js(v)])),
  blobs: Object.fromEntries([...blobs].map(([k, b]) => [k, b.length])),
  edges: [...edges].map(([k, e]) => ({ kappa: k, source: e.get(0), target: e.get(1), relation: D.RELATION_NAME[e.get(2)], asserter: e.get(3) })) }, null, 1) + '\n')
writeFileSync(join(out, 'REPORT.md'), [`# ${lane} - minted ${date} - status: ${D.STATUS}`, '', `Evidence root: ${rootK}`, '', `${ks.length} pairs under one root; each pair derives from the evidence root its reader was generated from.`, ''].join('\n'))
console.log(`demos root ${rootK}  (${ks.length} pairs, ${D.STATUS})`)
