# CardDemo — AI-Assisted Migration Analysis (TypeScript/NestJS Target)

This directory contains the outputs of an AI-assisted migration analysis run against the AWS CardDemo COBOL application by [Spantree Technology Group](https://spantree.net), a [Trifork](https://trifork.com) company.

The analysis targets migration to a TypeScript/NestJS/Bun/TypeORM/React stack. For the Java/Spring Boot target stack analysis, see the `analysis/java-migration` branch.

The analysis was produced using the methodology described at [github.com/Spantree/tree-sitter-cobol-enterprise](https://github.com/Spantree/tree-sitter-cobol-enterprise): a custom tree-sitter grammar for IBM Enterprise COBOL, a dependency analysis pipeline, and Claude (Anthropic) for LLM-assisted documentation and assessment.

These outputs represent what Phase 1 (Comprehension) and Phase 2 (Planning) of an AI-assisted mainframe migration produce before any code is translated.

---

## Target Stack

NestJS + Bun + TypeORM + PostgreSQL + React + TypeScript

See `technology-decisions.md` for the full rationale, including COMP-3/packed decimal handling with Decimal.js, GO TO elimination strategy, and BMS screen map to React component mapping.

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
| `data-model.md` | Data model analysis: VSAM file structures, entity relationships |
| `schema.sql` | Generated PostgreSQL DDL from COBOL copybook analysis |
| `technology-decisions.md` | TypeScript target stack rationale: NestJS, TypeORM, Bun, Decimal.js |
| `migration-sequence.md` | Wave plan: 8 migration waves ordered by dependency and complexity |
| `clusters.md` | Program clustering analysis for identifying migration boundaries |
| `hub-copybooks.md` | Analysis of shared copybooks — the highest blast-radius change targets |
| `batch-flow.mermaid` | Mermaid diagram of batch job dependencies |
| `data-flow.mermaid` | Mermaid diagram of data flow between programs |
| `credential-scan.md` | Security findings: hardcoded credentials and PCI DSS violations |
| `risk-matrix.md` | Risk assessment per program and migration wave |
| `poc-plan.md` | Proof-of-concept plan for Wave 1 |

---

## Key Findings

**Scale:** 44 COBOL programs, 20,650 lines of core code, 8 VSAM data files, 17 online screens, 38 batch jobs.

**Complexity:** Average composite score 2.19/5 across 44 programs. Three programs scored above 3.5. The hardest — COACTUPC — has 3,368 lines, 17 CICS commands, and 51 GO TO statements.

**Dead code:** 14 of 44 programs are unreachable from any entry point (32% dead code rate), plus 33 dead paragraphs.

**Security:** Three critical findings: hardcoded FTP credentials in JCL, plaintext user passwords in VSAM, and CVV codes stored permanently in the card file (both PCI DSS violations).

**Migration plan:** 8 waves ordered by dependency and complexity. Two programs require manual rewrite rather than AI-assisted translation.

---

## License

Analysis outputs in this directory are released under MIT License.
Copyright (c) 2026 Spantree Technology Group, LLC.

The CardDemo source code is licensed under Apache License 2.0 by Amazon Web Services, Inc.
