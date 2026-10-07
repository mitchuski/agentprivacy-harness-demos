#!/usr/bin/env node
// mint_rows.mjs — put tables behind a κ: rows of a JSON array / JSONL / TSV become record/1
// objects in a ledger with a rows/count/1 check, the source file a blob every row cites.
//
//   node tools/mint_rows.mjs <bundleOutDir> <lane> <kind>=<file>[:tsv|jsonl|json] [...more kind=file]
//
// TSV: first column is the row name (field "name"), the rest numeric columns named c1..cn
// unless the first line starts with '#' and names them. JSON: an array of objects, or an
// object whose values are objects (the key becomes "name"). Text is redacted of user paths.
// Same bundle layout as kappa_evidence_mage / tools/kappa_evidence.mjs, same verifiers.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'

const HERE = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const HARNESS = (process.env.HARNESS || HERE + '../../dual-agent-harness/').replace(/\/?$/, '/')
const D = await import(pathToFileURL(HARNESS + 'tools/dcbor.mjs').href)
const NS = 'agentprivacy-evidence'
const PRIVATE = new RegExp(String.raw`(?:/mnt/)?[a-z]:?[\\/]users[\\/][^\\/\s"'\x60)]+|/c/users/[^/\s"'\x60)]+|/home/[^/\s"'\x60)]+|/root/|desktop-[a-z0-9]+|\\\\wsl[^\s]*|@[a-z0-9.-]+\.(?:local|lan)`, 'gi')
const redact = (s) => s.replace(PRIVATE, '[redacted]')
const home = homedir().replace(/\\/g, '/')
const origin = (p) => { const r = resolve(p).replace(/\\/g, '/'); return r.startsWith(home) ? '~' + r.slice(home.length) : basename(p) }

const [outArg, lane, ...specs] = process.argv.slice(2)
if (!outArg || !lane || !specs.length) { console.error('usage: node tools/mint_rows.mjs <bundleOutDir> <lane> <kind>=<file>[:fmt] ...'); process.exit(2) }

function parseRows(text, fmt) {
  if (fmt === 'tsv') {
    const lines = text.split('\n').filter(l => l.trim())
    let cols = null; const rows = []
    for (const l of lines) {
      if (l.startsWith('#')) { cols = l.slice(1).trim().split(/\s+/); continue }
      const parts = l.trim().split(/\s+/)
      const r = { name: parts[0] }
      parts.slice(1).forEach((v, i) => { const k = cols ? cols[i + 1] || `c${i + 1}` : `c${i + 1}`; const n = Number(v); r[k] = Number.isFinite(n) && v !== '' ? n : v })
      rows.push(r)
    }
    return rows
  }
  if (fmt === 'jsonl') return text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
  const j = JSON.parse(text)
  if (Array.isArray(j)) return j
  return Object.entries(j).map(([k, v]) => ({ name: k, ...(typeof v === 'object' && v ? v : { value: v }) }))
}
// a row's values must be dCBOR-encodable: numbers, strings, booleans, null, arrays, plain objects
const clean = (v) => v === undefined ? null : typeof v === 'string' ? redact(v) : Array.isArray(v) ? v.map(clean) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v

const objects = new Map(), blobs = new Map(), edges = new Map(), names = new Map()
const asserter = 'unsigned:harness-demos'
const put = (v, name) => { const k = D.kappaFromValue(v); objects.set(k, v); if (name) names.set(name, k); return k }
const edge = (s, t, rel) => { const e = D.edgeRecord(s, t, rel, asserter); edges.set(D.kappaFromValue(e), e) }
let seq = 0
const ledgerNames = [], checkNames = []
for (const spec of specs) {
  const m = spec.match(/^([\w.-]+)=(.+?)(?::(tsv|jsonl|json))?$/); if (!m) { console.error('bad spec', spec); process.exit(2) }
  const [, kind, file, fmtArg] = m
  const fmt = fmtArg || (file.endsWith('.tsv') || file.endsWith('.txt') ? 'tsv' : file.endsWith('.jsonl') ? 'jsonl' : 'json')
  const raw = readFileSync(file, 'utf8'); const red = redact(raw)
  const blobK = D.kappaFromBytes(Buffer.from(red, 'utf8')); blobs.set(blobK, Buffer.from(red, 'utf8'))
  names.set(`source:${basename(file)}`, blobK)
  const rows = parseRows(red, fmt)
  const ks = []
  for (const r of rows) { const k = put(new Map([[0, `${NS}/record/1`], [1, seq++], [2, kind], [3, clean(r)], [4, lane]])); ks.push(k); edge(k, blobK, 'evidence-provenance') }
  const ln = `${kind}-ledger`, cn = `${kind}-count`
  const lk = put(new Map([[0, `${NS}/ledger/1`], [1, ln], [2, ks], [3, lane], [4, `${rows.length} ${kind} rows from ${basename(file)} (${(red.length !== raw.length) ? 'redacted copy of ' : ''}${origin(file)})`]]), ln)
  for (const k of ks) edge(lk, k, 'composed-of')
  const ck = put(new Map([[0, `${NS}/check/1`], [1, lk], [2, 'rows/count/1'], [3, { n: rows.length }]]), cn); edge(ck, lk, 'derived-from')
  ledgerNames.push(ln); checkNames.push(cn)
  console.log(`${kind}: ${rows.length} rows from ${basename(file)}`)
}
const leaves = [...objects.keys(), ...blobs.keys(), ...edges.keys()].sort()
const mroot = D.merkleRoot(leaves.map(x => Buffer.from(x))).toString('hex')
const date = new Date().toISOString().slice(0, 10)
const root = new Map([[0, `${NS}/run-root/1`], [1, lane], [2, date], [3, [...names.entries()].sort()], [4, mroot], [5, D.STATUS], [6, asserter], [7, D.UPSTREAM]])
const rootK = D.kappaFromValue(root); objects.set(rootK, root)
for (const n of [...ledgerNames, ...checkNames]) { const e = D.edgeRecord(rootK, names.get(n), 'composed-of', asserter); edges.set(D.kappaFromValue(e), e) }

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
writeFileSync(join(out, 'REPORT.md'), [`# ${lane} rows - minted ${date} - status: ${D.STATUS}`, '', `Evidence root: ${rootK}`, '', '| ledger | kappa |', '|---|---|', ...ledgerNames.map(n => `| ${n} | \`${names.get(n)}\` |`), ''].join('\n'))
console.log(`rows root ${rootK}  (${objects.size} objects, ${D.STATUS})`)
