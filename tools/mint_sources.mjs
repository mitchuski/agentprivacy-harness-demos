#!/usr/bin/env node
// mint_sources.mjs — put prose sources behind a κ: files become blobs, one sources/1 object
// lists them, one run root covers it. Same bundle layout as kappa_evidence_mage and the
// harness's tools/kappa_evidence.mjs, so the same verifiers read it.
//
//   node tools/mint_sources.mjs [--redact] <bundleOutDir> <lane> <file> [<file>...]
//
// --redact: text files are copied with user paths and host names replaced by [redacted] before
// hashing; the origin note says so. The lane keeps the original; the κ here is of the public bytes.
//
// Each file is recorded as [published name, blob κ, bytes, origin note]; the origin note is
// the path relative to the user's home, with the user segment removed, so the bundle says
// where a source came from without carrying a private path.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'

const HERE = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const HARNESS = (process.env.HARNESS || HERE + '../../dual-agent-harness/').replace(/\/?$/, '/')
const D = await import(pathToFileURL(HARNESS + 'tools/dcbor.mjs').href)
const NS = 'agentprivacy-evidence'

const argv = process.argv.slice(2)
const REDACT = argv.includes('--redact')
const [outArg, lane, ...files] = argv.filter(a => a !== '--redact')
const PRIVATE = new RegExp(String.raw`(?:/mnt/)?[a-z]:?[\\/]users[\\/][^\\/\s"'\x60)]+|/c/users/[^/\s"'\x60)]+|/home/[^/\s"'\x60)]+|/root/|desktop-[a-z0-9]+|\\\\wsl[^\s]*|@[a-z0-9.-]+\.(?:local|lan)`, 'gi')
const redact = (b) => Buffer.from(b.toString('utf8').replace(PRIVATE, '[redacted]'), 'utf8')
if (!outArg || !lane || !files.length) { console.error('usage: node tools/mint_sources.mjs <bundleOutDir> <lane> <file>...'); process.exit(2) }
const out = resolve(outArg)
const home = homedir().replace(/\\/g, '/')
const origin = (p) => { const r = resolve(p).replace(/\\/g, '/'); return r.startsWith(home) ? '~' + r.slice(home.length) : basename(p) }

const objects = new Map(), blobs = new Map(), edges = new Map(), names = new Map()
const asserter = 'unsigned:harness-demos'
const list = []
for (const f of files) {
  const raw = readFileSync(f)
  const b = REDACT ? redact(raw) : raw
  const k = D.kappaFromBytes(b); blobs.set(k, b); names.set('source:' + basename(f), k)
  list.push([basename(f), k, b.length, (REDACT && b.length !== raw.length ? 'redacted copy of ' : '') + origin(f)])
}
const src = new Map([[0, `${NS}/sources/1`], [1, lane], [2, list]])
const srcK = D.kappaFromValue(src); objects.set(srcK, src); names.set('sources', srcK)
for (const [, k] of list) { const e = D.edgeRecord(srcK, k, 'composed-of', asserter); edges.set(D.kappaFromValue(e), e) }
const leaves = [...objects.keys(), ...blobs.keys(), ...edges.keys()].sort()
const mroot = D.merkleRoot(leaves.map(x => Buffer.from(x))).toString('hex')
const date = new Date().toISOString().slice(0, 10)
const root = new Map([[0, `${NS}/run-root/1`], [1, lane], [2, date], [3, [...names.entries()].sort()], [4, mroot], [5, D.STATUS], [6, asserter], [7, D.UPSTREAM]])
const rootK = D.kappaFromValue(root); objects.set(rootK, root)
{ const e = D.edgeRecord(rootK, srcK, 'composed-of', asserter); edges.set(D.kappaFromValue(e), e) }

rmSync(out, { recursive: true, force: true })
for (const d of ['objects', 'blobs', 'edges']) mkdirSync(join(out, d), { recursive: true })
for (const [k, v] of objects) writeFileSync(join(out, 'objects', D.splitKappa(k)[1] + '.cbor'), D.encode(v))
for (const [k, b] of blobs) writeFileSync(join(out, 'blobs', D.splitKappa(k)[1] + '.bin'), b)
for (const [k, e] of edges) writeFileSync(join(out, 'edges', D.splitKappa(k)[1] + '.cbor'), D.encode(e))
const js = (v) => v instanceof Map ? Object.fromEntries([...v].map(([k, x]) => [String(k), js(x)])) : Array.isArray(v) ? v.map(js) : v
writeFileSync(join(out, 'root.json'), JSON.stringify({ root_kappa: rootK, status: D.STATUS, lane, minted_on: date, merkle_root_sha256: mroot, merkle_leaves: leaves.length,
  counts: { objects: objects.size, blobs: blobs.size, edges: edges.size }, names: Object.fromEntries(names), upstream: D.UPSTREAM }, null, 1))
writeFileSync(join(out, 'graph.json'), JSON.stringify({ status: D.STATUS, root: rootK, objects: Object.fromEntries([...objects].map(([k, v]) => [k, js(v)])),
  blobs: Object.fromEntries([...blobs].map(([k, b]) => [k, b.length])),
  edges: [...edges].map(([k, e]) => ({ kappa: k, source: e.get(0), target: e.get(1), relation: D.RELATION_NAME[e.get(2)], asserter: e.get(3) })) }, null, 1))
writeFileSync(join(out, 'REPORT.md'), [`# ${lane} sources - minted ${date} - status: ${D.STATUS}`, '', `Evidence root: ${rootK}`, '', '| source | kappa | bytes | origin |', '|---|---|---|---|',
  ...list.map(([n, k, s, o]) => `| ${n} | \`${k}\` | ${s} | ${o} |`), ''].join('\n'))
console.log(`sources root ${rootK}  (${list.length} files, ${D.STATUS})`)
