# Plan: bolstering the demos — traces into readers, readers into κ pairs

Opened 2026-10-07. The First Person's brief: the lanes' traces hold methods
worth visualising; each reader gets a κ-address and links to the runtime's
evidence; the transformation itself creates that pair. Many levers and solves
live in different mage instances, so the plan pulls from all of them. Each
reader is shown to the First Person as it lands, before the next is built.

## The pair, mechanically

```
evidence root (κ of a run's bundle)  ──transform/1──►  reader (κ of the HTML bytes)
```

- The **evidence root** is minted by `kappa_evidence_mage` (Python) or the
  harness's `tools/kappa_evidence.mjs` (JS) from the lane's own records.
- The **reader** is generated from the bundle's `graph.json` (never from
  prose) by a generator in `generators/`; its κ is `sha256` over its bytes.
- The **transform/1** object binds the two with the generator's κ and the
  date: `{0 schema, 1 reader κ, 2 evidence root, 3 generator κ, 4 date, 5 lane}`.
  `tools/pair.mjs` mints it and writes `pairs.json`. A later demos bundle
  mints `pairs.json` itself, so the registry of pairs is one root too.
- A reader shows its evidence root in its footer and recomputes the headline
  numbers in the browser from the embedded graph data, so a viewer sees the
  derivation, not a screenshot of it.
- Every κ stays "kappa-compatible (unverified)" until the P1 cargo check.

## Candidates, ranked (data on this box unless noted)

| # | reader | what it shows | source traces | evidence root | effort |
|---|---|---|---|---|---|
| 1 | **Evidence-graph explorer** (generic) | any bundle as a layered graph: root, ledgers/checks, rows, blobs, typed edges; per-kind panels; totals recomputed client-side | `kappa_evidence_mage/out/*/graph.json` | the bundle's own | the core instrument |
| 2 | **r32 route search** | 59 solver calls on a timeline: descent per phase (s1 60 to 22, p2, p3 bisection, p4), CPU-s per call, abandoned/stopped rows charged, totals 593,858.32 | `out/r32/graph.json` (from `hashsmash_mage/work/sha256/ledger_export/`) | `sha256:3c20049e…` | #1 + a call panel |
| 3 | **sig H2 gate** | 24 honest runs: verify delta 0, sign delta 1048, expand cycles vs base; 28 tamper and 2 cross rejections; the eight images with derived-from edges base to H2; the stale-layout catch | `out/sig_h2_b96b3ca/graph.json` | `sha256:8c5209a6…` | #1 + a gate panel |
| 4 | **The arena rules map** | A1-A40 as a clickable map: rule, lane that proved it, entry it shipped in; the method itself as a reader | `dual-agent-harness/CHALLENGE_LANES.md` | the harness commit f80f896 (a blob κ of the file) | small |
| 5 | **Credit and provenance graph** | 90 citing PRs by 13 solvers for sig; the r32 chain #296 to #367 to #377 to ours; coauthor audit | `sig_mage/sigmage/diagrams/citations_2026-10-05.json`; hashsmash R32_LOG credit lines | a blob κ of the citations json | small |
| 6 | **Judge rehearsal** | obligations × ratings across the hashsmash PR dossiers; our verdict chain da4895b5 to 02d6a703 and 1ded36a8 to 8bad82c1; the aggregation rule | `hashsmash_mage/work/sha256/judge_record/pr*/`, `review_*/`, ASSAY_B | mint the dossier digests as a bundle first | medium |
| 7 | **κ calibration** | callgrind instructions per CPU-s idle vs loaded vs saturated, per phase; opcode mix with the PLT-stub attribution; m ops per instruction | `r32_search/results/kcal_*.tsv, calib_*`, R32_LOG | mint kcal rows as a ledger first | medium |
| 8 | **Research ledger and the fence map** | every pathway with its verdict and reopen condition; killed levers across lanes with their boundaries | `sig_mage HANDOFF_2026-10-07.md` §5; `better_codes_mage/notes/KILLED_LEVERS.md`; pqc_harness KILLED_LEVERS | blob κ of each ledger | small |
| 9 | **SERV runs, paired** | the existing six readers get a pair: mint `examples/self/runs/*` and `field-guide/runs/fg-*` with `kappa_evidence.mjs`, then pair | harness run records | new roots per run | small, mostly tooling |
| 10 | **qpcbtc evidence screen** | ABBA/BAAB blocks, Student-t lower bounds, the local-to-ranked calibration (about 1:64) | `qpcbtc_mage/harness/tools/review/`, HANDOVER §3 | mint the screen rows first | medium |
| 11 | **precompile anti-fingerprint census** | pinning ratios across fresh seeds and same-size siblings; the MIRAGE line at 1.10 | `precompile_mage/census.py` outputs | mint census rows first | medium |
| 12 | **The κ graph of the demos** | pairs.json minted: every reader, its root, its generator, one root over the demos | this repo | the demos root | after 2-3 pairs exist |

## Build order and the showing rule

1 then 2 and 3 (today: the data is already κ-addressed), then the pair tool
on those two; show. Then 4, 5, 8 (prose-sourced, quick); show. Then 9 (pairs
for what already exists); show. Then 6, 7, 10, 11 (each needs a mint first,
which is also a new lane for `kappa_evidence_mage`); show each. Then 12.

Each landing: the reader opened locally for the First Person, its path and
its evidence root in the message, nothing published. Readers are plain HTML,
zero dependencies, inline SVG; they must read on a phone and offline.

## Not in scope

Prose-only pages (letters, chronicles as text): the tomes carry those. Anything
whose source is a partner's private artefact. Any κ quoted in public before P1.
