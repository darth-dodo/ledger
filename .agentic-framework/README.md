# Agentic Development Framework

**Purpose**: Language-agnostic AI agent collaboration system for any software project

**Foundation**: Built on SuperClaude personas + Quality gates + Multi-agent coordination

---

## Quick Start

### 1. Copy to Your Project

```bash
cp -r .agentic-framework/ /path/to/your-project/.agentic/
```

### 2. Initialize Project Configuration

```bash
# Create project-specific configuration
cp .agentic/templates/project-config.yml .agentic/config.yml

# Edit to match your project
# - Set project name, type, and tech stack
# - Define quality gate thresholds
# - Configure personas for your domain
```

### 3. Choose Your Workflow

```bash
# For feature/component work
cat .agentic/workflows/feature-development.md

# For content/documentation work
cat .agentic/workflows/content-creation.md

# For multi-agent parallel work
cat .agentic/workflows/multi-agent-coordination.md
```

### 4. Start a Session

```bash
# Copy session template
cp .agentic/templates/session-template.md docs/session-log.md

# Begin with persona-aware session
```

---

## Framework Architecture

```
┌────────────────────────────────────────┐
│   Agentic Workflows                    │
│   • Persona specialization             │
│   • Domain-agnostic patterns           │
│   • Quality gate enforcement           │
│   • Multi-agent coordination           │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│   SuperClaude Framework                │
│   • MCP servers (Context7, etc.)       │
│   • Command system (/sc:*)             │
│   • Resource management                │
│   • Task delegation                    │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│   Your Project                         │
│   • Language-specific tooling          │
│   • Custom quality gates               │
│   • Project-specific workflows         │
└────────────────────────────────────────┘
```

---

## Directory Structure

```
.agentic/
├── README.md                     # This file
├── CHEATSHEET.md                 # Quick reference card
├── config.yml                    # Project-specific configuration (Ledger)
│
├── personas/                     # Persona configurations
│   ├── architect.yml             # System design workflows
│   ├── developer.yml             # Implementation workflows
│   ├── writer.yml                # Content/docs workflows
│   ├── qa.yml                    # Testing/validation workflows
│   └── overlays/                 # Domain-specific persona extensions
│       ├── ai-engineer.yml       # RAG, embeddings, prompt engineering
│       └── data-engineer.yml     # Parsing, ETL, data validation
│
├── workflows/                    # Development patterns
│   ├── feature-development.md    # Generic feature workflow (with ADR integration)
│   ├── content-creation.md       # Documentation/content workflow
│   ├── bug-fix.md                # Bug investigation & fix workflow
│   ├── data-pipeline.md          # Multi-stage ETL/ingest workflow
│   ├── milestone-delivery.md     # Phased product delivery workflow
│   └── multi-agent-coordination.md  # Parallel agent patterns (with error recovery)
│
├── quality-gates/                # Validation framework
│   ├── generic-gates.md          # Language-agnostic gates
│   └── examples/                 # Language-specific examples
│       ├── javascript.md
│       ├── python.md
│       ├── go.md
│       └── bun.md                # Bun runtime (bun test, bun build)
│
├── integration/                  # Session management
│   ├── session-template.md       # Persona-aware session log (with Serena memory examples)
│   └── handoff-template.md       # Agent handoff documentation
│
└── templates/                    # Starter templates
    ├── project-config.yml        # Project configuration template
    ├── adr-template.md           # Architecture decision template
    └── retrospective.md          # Post-milestone reflection template
```

---

## Core Concepts

### 1. Personas

Specialized agent personalities with domain expertise:

| Persona       | Focus                   | When to Use                            |
| ------------- | ----------------------- | -------------------------------------- |
| **Architect** | System design, patterns | Architecture decisions, tech choices   |
| **Developer** | Implementation, coding  | Feature development, bug fixes         |
| **Writer**    | Documentation, content  | Docs, guides, README updates           |
| **QA**        | Testing, validation     | Quality assurance, deployment approval |

### 2. Workflows

Structured patterns for common development tasks:

| Workflow            | Duration  | Phases                                       |
| ------------------- | --------- | -------------------------------------------- |
| Feature Development | 1-3 hours | Design → Implement → Validate                |
| Content Creation    | 1-2 hours | Outline → Write → Review                     |
| Bug Fix             | 30-90 min | Investigate → Fix → Verify                   |
| Data Pipeline       | 2-6 hours | Design → Implement Stages → Validate         |
| Milestone Delivery  | Days-Weeks | Gate-In → Scope → Implement → Validate → Retro |
| Multi-Agent         | Variable  | Coordinate → Parallel Work → Merge           |

### 3. Quality Gates

8-step validation cycle (adapt thresholds to your project):

1. **Syntax** - Code parses correctly
2. **Types** - Type checking passes
3. **Lint** - Code style compliance
4. **Security** - No vulnerabilities
5. **Tests** - All tests pass
6. **Performance** - Meets benchmarks
7. **Accessibility** - Standards compliance
8. **Integration** - Works with system

### 4. Persona Overlays

Domain-specific extensions that augment core personas:

| Overlay            | Extends   | Domain                         |
| ------------------ | --------- | ------------------------------ |
| **ai-engineer**    | Developer | RAG, embeddings, prompt design |
| **data-engineer**  | Developer | Parsing, ETL, data validation  |

### 5. Multi-Agent Coordination

Parallel agent patterns for faster development (with error recovery):

| Pattern          | Agents         | Use Case          |
| ---------------- | -------------- | ----------------- |
| **Parallel**     | 2-5            | Independent tasks |
| **Sequential**   | 2-3            | Dependent tasks   |
| **Hierarchical** | Lead + Workers | Complex features  |

---

## Customization

### Adapting for Your Project

1. **Technology Stack**
   - Update `config.yml` with your languages and frameworks
   - Add language-specific quality gates
   - Configure MCP servers for your stack

2. **Personas**
   - Rename or add personas for your domain
   - Adjust MCP tool preferences
   - Define domain-specific quality criteria

3. **Workflows**
   - Modify phases and durations
   - Add project-specific steps
   - Configure tooling integration

4. **Quality Gates**
   - Set thresholds for your standards
   - Add project-specific checks
   - Configure automation scripts

---

## MCP Server Integration

### Recommended Servers by Task

| Task Type     | Primary MCP | Secondary  |
| ------------- | ----------- | ---------- |
| Analysis      | Sequential  | Context7   |
| Documentation | Context7    | Sequential |
| UI/Frontend   | Magic       | Context7   |
| Testing       | Playwright  | Sequential |
| Refactoring   | Serena      | Sequential |

### Server Selection Matrix

```yaml
# Task → MCP mapping
analysis: sequential + context7
implementation: context7 + [language-specific]
testing: playwright (E2E) + sequential (planning)
documentation: context7 + sequential
refactoring: serena + sequential
```

---

## Session Lifecycle

### Starting a Session

```markdown
1. Load project context: `/sc:load`
2. Select active persona
3. Choose workflow pattern
4. Initialize session log
```

### During Work

```markdown
1. Follow workflow phases
2. Track progress in session log
3. Run quality gates at checkpoints
4. Document decisions and blockers
```

### Ending a Session

```markdown
1. Update session log with outcomes
2. Document handoff notes
3. Save session context: `/sc:save`
4. Run final quality validation
```

---

## Example Usage

### Single Feature Development

```markdown
**Request**: "Add user authentication to the API"

**Workflow**: feature-development.md
**Personas**: Architect → Developer → QA

1. Architect designs auth strategy (30min)
2. Developer implements endpoints (2-3hr)
3. QA validates security and tests (1hr)
```

### Multi-Agent Content Creation

```markdown
**Request**: "Write documentation for 5 API endpoints"

**Workflow**: multi-agent-coordination.md
**Pattern**: Parallel (5 Writer agents)

1. Coordinator assigns endpoints
2. 5 Writers work simultaneously
3. Coordinator merges and validates
```

---

## Benefits

| Feature             | Without Framework | With Framework  |
| ------------------- | ----------------- | --------------- |
| Persona focus       | Ad-hoc            | Domain expert   |
| Workflow guidance   | Manual            | Template-driven |
| Quality enforcement | Basic             | 8-step gates    |
| Multi-agent         | Uncoordinated     | Orchestrated    |
| Session continuity  | Lost context      | Persistent      |
| Time efficiency     | Baseline          | +40-80% faster  |

---

## Getting Started

1. **Copy framework** to your project
2. **Configure** `config.yml` for your stack (see `templates/project-config.yml`)
3. **Read the cheatsheet** — `CHEATSHEET.md` is a one-page reference
4. **Pick a workflow** for your first task
5. **Start with single-agent** before multi-agent
6. **Run retrospectives** after each milestone to evolve the framework

**Quick Reference**: See `CHEATSHEET.md` for a one-page summary.

**Documentation**: See individual workflow files for detailed instructions.

---

**Agentic Development Framework: Structured AI collaboration for any project**
