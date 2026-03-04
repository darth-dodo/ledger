# Milestone Delivery Workflow

**Purpose**: Phased product delivery with gates between milestones, dependency tracking, and retrospective feedback loops.

**Duration**: Days to weeks per milestone (depends on scope)

**Agents**: Architect + Developer + QA + Writer (varies by milestone)

---

## When to Use

- Product has a multi-milestone roadmap
- Milestones have dependencies (output of M(N) feeds M(N+1))
- Need formal gate-in / gate-out criteria between phases
- Want structured retrospectives to evolve the process

---

## Milestone Lifecycle

```
Gate-In
  │  Verify prerequisites from previous milestone
  │  Confirm dependencies are met
  ▼
Phase 1: Scope & Design (Architect)
  │  Define milestone scope, produce ADRs
  │  Break into feature-level tasks
  ▼
Phase 2: Implementation (Developer)
  │  Execute tasks using feature-development.md
  │  or data-pipeline.md as sub-workflows
  ▼
Phase 3: Validation (QA)
  │  Run quality gates, acceptance testing
  │  Verify milestone deliverables
  ▼
Gate-Out
  │  All acceptance criteria pass
  │  Deliverables documented
  ▼
Retrospective
     What worked, what to adjust, framework updates
```

---

## Phase 1: Scope & Design (Architect)

**Duration**: 30-90 minutes

**Objective**: Define clear boundaries, deliverables, and technical approach for this milestone.

### Tasks

- [ ] Review milestone definition from product roadmap
- [ ] Verify gate-in prerequisites are met
- [ ] Define acceptance criteria for milestone completion
- [ ] Identify feature-level tasks (each uses feature-development.md)
- [ ] Map dependencies within the milestone (parallel vs sequential)
- [ ] Produce ADR for any architectural decisions
- [ ] Estimate effort per task
- [ ] Assign coordination pattern (single / parallel / sequential / hierarchical)

### Outputs

**Milestone Scope Document**:

```markdown
# Milestone [N]: [Name]

## Objective
[One sentence goal]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Prerequisites (Gate-In)
- [x] M(N-1) deliverables verified
- [x] [Dependency from previous milestone]

## Task Breakdown

| # | Task | Sub-Workflow | Coordination | Estimate |
|---|------|-------------|--------------|----------|
| 1 | [Task name] | feature-development | Single agent | 2h |
| 2 | [Task name] | data-pipeline | Sequential | 3h |
| 3 | [Task name] | feature-development | Parallel | 2h |

## Dependency Graph (within milestone)
Task 1 → Task 2 (Task 2 needs Task 1's output)
Task 3 (independent, can parallel with Task 1)

## ADRs
- ADR-[N]: [Title] (if architectural decision made)

## Risks
- [Risk]: [Mitigation]
```

---

## Phase 2: Implementation (Developer)

**Duration**: Variable (sum of task estimates)

**Objective**: Execute all tasks, following sub-workflows for each.

### Execution

Each task follows the appropriate sub-workflow:
- **Feature work** → `workflows/feature-development.md`
- **Data pipeline** → `workflows/data-pipeline.md`
- **Bug fixes** → `workflows/bug-fix.md`
- **Documentation** → `workflows/content-creation.md`

### Coordination

Use the milestone's assigned coordination pattern:
- **Single agent**: Execute tasks sequentially
- **Parallel**: Independent tasks run concurrently (see `multi-agent-coordination.md`)
- **Sequential pipeline**: Dependent tasks pass output forward

### Progress Tracking

```markdown
## Milestone [N] Progress

| Task | Status | Notes |
|------|--------|-------|
| Task 1 | Complete | Merged to feature branch |
| Task 2 | In Progress | Blocked on DB migration |
| Task 3 | Pending | Waiting for Task 1 |

**Overall**: 1/3 complete
**Blockers**: [List or "None"]
```

---

## Phase 3: Validation (QA)

**Duration**: 1-3 hours

**Objective**: Verify all milestone acceptance criteria are met and deliverables are production-quality.

### Tasks

- [ ] Verify each acceptance criterion from scope document
- [ ] Run full quality gate cycle (all 8 gates)
- [ ] Test integration between tasks within this milestone
- [ ] Test backward compatibility with previous milestones
- [ ] Verify documentation completeness
- [ ] Performance sanity check
- [ ] Create validation report

### Validation Report

```markdown
## Milestone [N] Validation Report

**Status**: [Approved / Changes Requested]

### Acceptance Criteria
- [x] Criterion 1: Verified
- [x] Criterion 2: Verified
- [ ] Criterion 3: Issue found (see below)

### Quality Gates
| Gate | Status | Notes |
|------|--------|-------|
| 1. Syntax | Pass | |
| 2. Types | Pass | |
| 3. Lint | Pass | |
| 4. Security | Pass | |
| 5. Tests | Pass | Coverage: 82% |
| 6. Performance | Pass | |
| 7. Accessibility | N/A | Backend-only milestone |
| 8. Integration | Pass | |

### Issues Found
- [Issue]: [Severity] - [Description]

### Recommendation
[Approved for gate-out / Requires fixes: list]
```

---

## Gate-In / Gate-Out Criteria

### Gate-In Checklist

Before starting any milestone:

- [ ] Previous milestone deliverables exist and are verified
- [ ] Dependencies from other milestones are met
- [ ] Required infrastructure / services are available
- [ ] Team has context from previous milestone handoff
- [ ] No unresolved blockers from prior work

### Gate-Out Checklist

Before declaring a milestone complete:

- [ ] All acceptance criteria verified by QA
- [ ] Quality gates pass (all 8, or justified N/A)
- [ ] Code merged to appropriate branch
- [ ] Documentation updated
- [ ] Retrospective completed
- [ ] Handoff notes written for next milestone

---

## Retrospective

**Duration**: 15-30 minutes

**Timing**: After gate-out, before starting next milestone

Use `templates/retrospective.md` and capture:

1. **What went well** — Keep doing
2. **What didn't go well** — Stop or change
3. **Framework adjustments** — Update workflows, quality gates, personas
4. **Action items** — Concrete changes for next milestone

---

## Milestone Dependency Map

### Notation

```
M(N) ──→ M(N+1)     Sequential dependency (M(N+1) needs M(N) output)
M(A) ──╮
       ├──→ M(C)    Both M(A) and M(B) must complete before M(C)
M(B) ──╯
M(X) │ M(Y)         Independent (can run in parallel)
```

### Example: Ledger Project

```
M0 (Scaffold)
 └──→ M1 (Health Check)
       └──→ M2 (File Upload)
             └──→ M3 (Parse & Persist)
                   └──→ M4 (Chunk & Embed)
                         └──→ M5 (RAG Chat)
                               └──→ M6 (Analytics)
                                     └──→ M7 (Auth & Polish)
```

### Ledger Milestone → Coordination Pattern Mapping

| Milestone | Pattern | Personas | Rationale |
|-----------|---------|----------|-----------|
| M0: Scaffold | Single agent | Developer | Simple setup task |
| M1: Health Check | Single agent | Developer | Single endpoint + smoke test |
| M2: File Upload | Sequential | Architect → Developer | Design upload strategy, then implement |
| M3: Parse & Persist | Sequential | Architect → Developer → QA | Parser strategy needs design, careful testing |
| M4: Chunk & Embed | Sequential | Architect → Developer + AI overlay | Embedding quality is critical path |
| M5: RAG Chat | Hierarchical | Architect leads, Developer + AI overlay | Complex multi-system integration |
| M6: Analytics | Parallel | Developer (backend) + Developer (frontend) | Independent API and dashboard work |
| M7: Auth & Polish | Parallel | Developer + QA + Writer | Multiple independent hardening tasks |

---

## Inter-Milestone Handoff

### Handoff Document

```markdown
# Milestone [N] → Milestone [N+1] Handoff

## Completed Deliverables
- [Deliverable 1]: [Location / description]
- [Deliverable 2]: [Location / description]

## State of the System
- **What works**: [Summary of working functionality]
- **Known issues**: [List or "None"]
- **Technical debt**: [Deferred items]

## Context for Next Milestone
- [Key decision from M(N) that affects M(N+1)]
- [Interface / API contract that M(N+1) depends on]
- [Data format or schema that carries forward]

## Recommendations
- [Suggestion for approaching next milestone]
```

---

## Best Practices

### Planning
- **Scope ruthlessly**: Each milestone should be demo-able. If it's not, it's too big.
- **One milestone at a time**: Don't start M(N+1) until M(N) gates out.
- **Dependencies are risks**: Minimize cross-milestone coupling.

### Execution
- **Use sub-workflows**: Don't reinvent — each task within a milestone follows feature-development.md, data-pipeline.md, etc.
- **Track daily**: Update milestone progress document as tasks complete.
- **Commit to the branch**: Each milestone gets its own feature branch or PR.

### Retrospectives
- **Never skip**: The retrospective is how the framework improves.
- **Be specific**: "Tests were slow" → "bun test took 45s, need to parallelize".
- **Act on it**: Each retro produces at least one concrete change.
