#!/usr/bin/env node
// pair.mjs — mint the pair: a reader's κ bound to the evidence root it was generated from.
//
//   node tools/pair.mjs <reader.html> <bundleDir> <generator.mjs> <lane>
//
// transform/1 = {0 schema, 1 reader κ, 2 evidence root κ, 3 generator κ, 4 date, 5 lane}
// on the registry axis (canonical dCBOR + SHA-256), using the harness's tools/dcbor.mjs
// (a harness checkout beside this repo, or HARNESS in the environment). Appends to
// pairs.json and writes pairs/<transform κ hex>.cbor so the pair itself is an object a
// later demos bundle can carry. A reader never contains its own κ: it is hashed as-is.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, relative, basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const HERE = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const HARNESS = (process.env.HARNESS || HERE + '../../dual-agent-harness/').replace(/\/?$/, '/')
const D = await import(pathToFileURL(HARNESS + 'tools/dcbor.mjs').href)

const [readerArg, bundleArg, genArg, lane] = process.argv.slice(2)
if (!readerArg || !bundleArg || !genArg || !lane) { console.error('usage: node tools/pair.mjs <reader.html> <bundleDir> <generator.mjs> <lane>'); process.exit(2) }
const root = JSON.parse(readFileSync(join(resolve(bundleArg), 'root.json'), 'utf8'))
const readerK = D.kappaFromBytes(readFileSync(resolve(readerArg)))
const genK = D.kappaFromBytes(readFileSync(resolve(genArg)))
const date = new Date().toISOString().slice(0, 10)
const t = new Map([[0, 'agentprivacy-evidence/transform/1'], [1, readerK], [2, root.root_kappa], [3, genK], [4, date], [5, lane]])
const tK = D.kappaFromValue(t)
const repo = resolve(HERE, '..')
mkdirSync(join(repo, 'pairs'), { recursive: true })
writeFileSync(join(repo, 'pairs', D.splitKappa(tK)[1] + '.cbor'), D.encode(t))
const pj = join(repo, 'pairs.json')
const pairs = existsSync(pj) ? JSON.parse(readFileSync(pj, 'utf8')) : { status: D.STATUS, upstream: D.UPSTREAM, pairs: [] }
pairs.pairs = pairs.pairs.filter(p => p.reader !== relative(repo, resolve(readerArg)).replace(/\\/g, '/'))
pairs.pairs.push({ reader: relative(repo, resolve(readerArg)).replace(/\\/g, '/'), reader_kappa: readerK, evidence_root: root.root_kappa,
  lane, bundle_lane: root.lane, generator: relative(repo, resolve(genArg)).replace(/\\/g, '/'), generator_kappa: genK, transform_kappa: tK, date, status: D.STATUS })
pairs.pairs.sort((a, b) => a.reader.localeCompare(b.reader))
writeFileSync(pj, JSON.stringify(pairs, null, 1) + '\n')
console.log(`${basename(readerArg)}\n  reader κ     ${readerK}\n  evidence root ${root.root_kappa}\n  transform κ  ${tK}  (${D.STATUS})`)
