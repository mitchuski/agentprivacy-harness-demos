# agentprivacy-harness-demos

Readers, one-pagers and notes generated from runs of the
[agentprivacy dual-agent harness](https://github.com/mitchuski/agentprivacy-harness).
They are demos of what a run looks like and of the concepts a run exercises
(the hold-apart Gap, the prover that never flatters, the cost of a judgment
seat under a borrowed model). They are not the harness: every gate in the
harness repo passes with this repo absent, and nothing here is cited as
evidence by the harness. The run records the demos were generated from stay
in the harness, replayable offline with its own `verify_run.mjs`.

**Destination.** These pages are the first material for the City of Mages'
tomes and shared knowledge graph (mages.city), alongside the OpenVTC lane:
each demo keyed by the harness run it came from and, once minted, by that
run's evidence root (`tools/kappa_evidence.mjs` in the harness), so a tome
page can point at a run a reader re-derives rather than at a screenshot.

## Layout

| dir | what |
|---|---|
| `readers/` | the generated HTML: `harness-serv-reader` and `harness-aggregate-reader_openserv` (the harness read across four documents, SERV as prover), `harness-serv-tests` (runtime tests), `harness-serv-fit` (the fit), `harness-findings` (one-pager), `zk-forge-reader` (the Constraint Forge, zk-tale-5) |
| `generators/` | the scripts that produced them (zero dependencies, Node 18+); they read `data/` and a harness checkout |
| `data/` | the extracted results and matrices the generators consume (`results.json`, `pricing.json`, `matrix-*.json`, `proposals.*.json`, `letter.md`) |
| `notes/` | the written notes (`OPENSERV_NOTE_AND_RESULTS.md`, generated from the records on 2026-09-13) |
| `bundles/` | sources bundles: prose sources (rules, ledgers, citation files) as κ'd blobs under one root, minted by `tools/mint_sources.mjs` (`--redact` strips user paths and hosts first) |
| `pairs.json`, `pairs/` | the registry of pairs: reader κ bound to evidence root and generator κ as a `transform/1` object (`tools/pair.mjs`) |
| `PLAN.md` | the ranked plan; items 1-12 built on 2026-10-07/08 |
| `tools/mint_rows.mjs`, `tools/mint_demos.mjs` | rows bundles (JSON / JSONL / TSV tables as record/1 rows); the demos root over all pairs |

## Regenerate

```bash
# a harness checkout beside this repo, or HARNESS=<path> in the environment
node generators/extract_results.mjs     # harness run records -> data/results.json
node generators/gen_aggregate.mjs       # -> readers/harness-serv-reader.html
node generators/gen_page.mjs            # -> readers/harness-serv-tests.html
node generators/gen_fit.mjs             # -> readers/harness-serv-fit.html
node generators/gen_onepager.mjs        # -> readers/harness-findings.html
node generators/gen_note_doc.mjs        # -> notes/OPENSERV_NOTE_AND_RESULTS.md
node generators/gen_reader.mjs          # -> readers/zk-forge-reader.html (needs SCRATCH=<dir> with that session's zk candidates; not archived here)
```

## The κ-paired readers (2026-10-07 / 08)

Start at `index.html` (the index is a reader too, paired to the demos root).

| reader | lane | evidence root |
|---|---|---|
| `readers/arena-rules.html` | harness/challenge-lanes | `sha256:7b5fcde256be…` |
| `readers/credit-provenance.html` | credit/sig-hashsmash | `sha256:d3d1d934ee4e…` |
| `readers/harness-aggregate-reader_openserv.html` | harness/serv-runs | `sha256:142a5807ed84…` |
| `readers/harness-findings.html` | harness/serv-runs | `sha256:142a5807ed84…` |
| `readers/harness-serv-fit.html` | harness/serv-runs | `sha256:142a5807ed84…` |
| `readers/harness-serv-reader.html` | harness/serv-runs | `sha256:142a5807ed84…` |
| `readers/harness-serv-tests.html` | harness/serv-runs | `sha256:142a5807ed84…` |
| `readers/index.html` | harness-demos/pairs | `sha256:ad4e115f39d8…` |
| `readers/judge-rehearsal.html` | hashsmash/judge-record | `sha256:d0a06cce9de9…` |
| `readers/kappa-calibration.html` | hashsmash/kappa-calibration | `sha256:c7d095955f58…` |
| `readers/precompile-census.html` | precompile/census | `sha256:acf1a56f7592…` |
| `readers/qpcbtc-abba-screen.html` | qpcbtc/abba-screen | `sha256:6ded2ec26eb4…` |
| `readers/r32-route-search.html` | hashsmash/sha256-r32 | `sha256:3c20049e5510…` |
| `readers/research-ledger.html` | ledger/sig-better_codes | `sha256:370262c4ab6b…` |
| `readers/sig-h2-gate.html` | sig-golf/h2-b96b3ca | `sha256:8c5209a6fb73…` |
| `readers/zk-forge-reader.html` | harness/serv-runs | `sha256:142a5807ed84…` |

16 pairs in `pairs.json`; the demos root over all of them is in `bundles/demos/root.json`.
Every κ is "kappa-compatible (unverified)" until the registry cross-check. Generators read the
κ'd blobs inside a bundle, never a loose copy of the source. Bundles: `bundles/` (sources and
rows minted here) plus the run bundles in kappa_evidence_mage (r32, sig H2) and the 34 harness
run bundles (`examples/*/runs/*/evidence/` in the harness, roots listed in `data/run_roots.json`).

## Provenance

| demo | harness run(s) | harness commit at extraction |
|---|---|---|
| SERV readers, tests, fit, findings, note | `examples/self/runs/r4-*`, `r5-*`, `clean-*-serv`; `examples/field-guide/runs/fg-*` | 2026-09-13 (the SERV seat) |
| zk-forge-reader | `examples/zk-tale-5` | 2026-09-12 |

Moved out of the harness repo on 2026-10-07 (harness commit after 64cbc0e);
history before that is in the harness's log under `examples/self/runs/`.
Evidence roots for these runs are not yet minted; when they are, this table
gains a column.

Licence follows the harness repo. Nothing here is an endorsement by any model
provider; it is a record of what ran.
