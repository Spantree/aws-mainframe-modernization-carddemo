# CardDemo — AI-Assisted Migration Analysis

This directory contains the outputs of an AI-assisted migration analysis run against the AWS CardDemo COBOL application by [Spantree Technology Group](https://spantree.net), a [Trifork](https://trifork.com) company.

The analysis was produced using the methodology described at [github.com/Spantree/tree-sitter-cobol-enterprise](https://github.com/Spantree/tree-sitter-cobol-enterprise): a custom tree-sitter grammar for IBM Enterprise COBOL, a dependency analysis pipeline, and Claude (Anthropic) for LLM-assisted documentation and assessment.

These outputs represent what Phase 1 (Comprehension) and Phase 2 (Planning) of an AI-assisted mainframe migration produce before any code is translated.

---

## Files

| File | Description |
|------|-------------|
| `executive-summary.md` | Non-technical summary: what the system does, what we found, recommended approach |
| `assessment-report.md` | Full technical assessment with findings, risks, and recommendations |
| `inventory.md` | Complete file inventory: 44 COBOL programs, 30 copybooks, 46 JCL jobs, classified by type |
| `inventory.json` | Machine-readable inventory |
| `complexity.md` | Complexity scores for all 44 programs across 6 dimensions |
| `complexity.json` | Machine-readable complexity data |
| `dead-code.md` | Dead code analysis: programs and paragraphs unreachable from entry points |
| `dead-code.json` | Machine-readable dead code data |
| `dependency-graph.md` | Written description of the dependency graph |
| `dependency-graph.mermaid` | Mermaid diagram of the full dependency graph (renders in GitHub) |
| `data-model.md` | Data model analysis: VSAM file structures, entity relationships, SQL schema design |
| `schema.sql` | Generated PostgreSQL DDL from COBOL copybook analysis |
| `migration-sequence.md` | Wave plan: 8 migration waves ordered by dependency and complexity |
| `clusters.md` | Program clustering analysis for identifying migration boundaries |
| `hub-copybooks.md` | Analysis of shared copybooks — the highest blast-radius change targets |
| `batch-flow.mermaid` | Mermaid diagram of batch job dependencies |
| `data-flow.mermaid` | Mermaid diagram of data flow between programs |
| `credential-scan.md` | Security findings: hardcoded credentials and PCI DSS violations in the corpus |
| `risk-matrix.md` | Risk assessment for each program and migration wave |
| `poc-plan.md` | Proof-of-concept plan for Wave 1 (simple batch programs) |
| `technology-decisions.md` | Technology selection rationale: target stack, tooling, and tradeoffs |

---

## Key Findings

**Scale:** 44 COBOL programs, 20,650 lines of core code, 8 VSAM data files, 17 online screens, 38 batch jobs.

**Complexity:** Average composite score 2.19/5 across 44 programs. Three programs scored above 3.5. The hardest — COACTUPC — has 3,368 lines, 17 CICS commands, and 51 GO TO statements.

**Dead code:** 14 of 44 programs are unreachable from any entry point (32% dead code rate), plus 33 dead paragraphs within reachable programs.

**Security:** Three critical findings: hardcoded FTP credentials in JCL, plaintext user passwords in VSAM, and CVV codes stored permanently in the card file (both PCI DSS violations). These pre-exist the migration and must be addressed regardless of migration timeline.

**Migration plan:** 8 waves ordered by dependency and complexity. Simple batch programs first; complex CICS online transactions last. Two programs require manual rewrite rather than AI-assisted translation.

---

## License

Analysis outputs in this directory are released under MIT License.
Copyright (c) 2026 Spantree Technology Group, LLC.

The CardDemo source code is licensed under Apache License 2.0 by Amazon Web Services, Inc.
