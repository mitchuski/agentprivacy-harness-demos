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
| `PLAN.md` | the ranked plan for the next readers and the rule that each is shown as it lands |

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

## The κ-paired readers (2026-10-07)

| reader | from | evidence root |
|---|---|---|
| `readers/r32-route-search.html` | hashsmash r32 bundle (59 calls) | `sha256:3c20049e…` |
| `readers/sig-h2-gate.html` | sig_mage H2 gate bundle (record b96b3ca) | `sha256:8c5209a6…` |
| `readers/arena-rules.html` | CHALLENGE_LANES.md as a blob | `sha256:7b5fcde2…` |
| `readers/credit-provenance.html` | citations json + R32_LOG.md as blobs | `sha256:2a9fae2f…` |
| `readers/research-ledger.html` | HANDOFF (redacted copy) + KILLED_LEVERS as blobs | `sha256:370262c4…` |

Full κ in `pairs.json`. Every κ is "kappa-compatible (unverified)" until the registry cross-check.
Generators read the κ'd blobs inside the bundle, never a loose copy of the source.

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
