# Agentic Framework — Quick Reference

---

## Persona Selection

| You need... | Use |
|-------------|-----|
| System design, data models, API contracts | **Architect** |
| Write code, fix bugs, refactor | **Developer** |
| RAG pipeline, embeddings, prompts | **Developer** + `ai-engineer` overlay |
| Parsing, ETL, data validation | **Developer** + `data-engineer` overlay |
| Documentation, README, guides | **Writer** |
| Testing, validation, deployment approval | **QA** |

---

## Workflow Selection

| Situation | Workflow |
|-----------|----------|
| New feature or component | `feature-development.md` |
| Bug investigation and fix | `bug-fix.md` |
| Documentation or content | `content-creation.md` |
| Multi-stage data ingestion | `data-pipeline.md` |
| Product milestone delivery | `milestone-delivery.md` |
| Multiple agents in parallel | `multi-agent-coordination.md` |

---

## Milestone → Pattern

| Milestone | Pattern | Key Personas |
|-----------|---------|--------------|
| M0: Scaffold | Single | Developer |
| M1: Health Check | Single | Developer |
| M2: File Upload | Sequential | Architect → Developer |
| M3: Parse & Persist | Sequential | Architect → Developer(+data) → QA |
| M4: Chunk & Embed | Sequential | Architect → Developer(+AI) |
| M5: RAG Chat | Hierarchical | Architect leads, Developer(+AI) |
| M6: Dashboard | Parallel | Developer(backend) + Developer(frontend) |
| M7: Auth & Polish | Parallel | Developer + QA + Writer |

---

## Quality Gates — Quick Run

```bash
# All gates (Bun)
bun run tsc --strict --noEmit   # Gates 1+2: Syntax & Types
bun run lint                      # Gate 3: Code quality
bun test --coverage               # Gate 5: Tests
bun run build                     # Gate 8: Integration

# Full validation
bun run tsc --strict --noEmit && bun run lint && bun test && bun run build
```

---

## MCP Server Selection

| Task | Server |
|------|--------|
| NestJS/Angular docs, API patterns | **Context7** |
| Architecture review, debugging | **Sequential** |
| E2E testing, UI validation | **Playwright** |
| Symbol operations, refactoring | **Serena** |

---

## Session Lifecycle

```
Start:   list_memories() → read_memory("ledger/current-milestone")
Work:    write_memory("ledger/progress", "M3: parser done")
Check:   write_memory("ledger/checkpoint", state) every 30min
End:     write_memory("ledger/session-summary", outcomes)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `config.yml` | Ledger-specific stack, gates, milestones |
| `workflows/milestone-delivery.md` | Phased product delivery |
| `workflows/data-pipeline.md` | ETL/ingest patterns |
| `workflows/feature-development.md` | Standard feature work |
| `quality-gates/examples/bun.md` | Bun-specific gate commands |
| `personas/overlays/ai-engineer.yml` | RAG/embedding specialization |
| `personas/overlays/data-engineer.yml` | Parsing/ETL specialization |
| `templates/retrospective.md` | Post-milestone reflection |
