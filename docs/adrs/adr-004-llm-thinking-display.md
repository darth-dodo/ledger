# ADR-004: LLM Thinking Display via SSE Event Forwarding

**Status**: Accepted
**Date**: 2026-03-18
**Milestone**: M5 — RAG Chat

---

## Context

The RAG chat uses a ReAct (Reason-Act-Observe) agentic loop with multiple tools: `decompose_query`, `think`, `sql_query`, `vector_search`, `update_category`, `chart_data`, and `done`. The Vercel AI SDK's `streamText().fullStream` emits rich events for every tool invocation (`tool-call`, `tool-result`), but the SSE controller was only forwarding `text-delta` and the `done` tool's summary.

Users had no visibility into what the LLM was doing between sending a question and receiving an answer — often 5-15 seconds of silence while multiple tool calls executed. This eroded trust and made debugging difficult.

Key constraints:

- The existing SSE stream is the only transport between backend and frontend
- The frontend already parses structured JSON SSE events (`text-delta`, `session-id`)
- The Vercel AI SDK `fullStream` already emits the events we need — no backend logic changes required
- The UI uses DaisyUI components (collapse/accordion already used for sources)

---

## Decisions

### 1. Forward Tool Events as New SSE Types

**Choice**: Add two new SSE event types (`tool-call`, `tool-result`) to the existing stream by forwarding events from `fullStream`.

**Alternatives considered**:
- **Structured markdown in text-delta**: Embed thinking as `<!-- think: ... -->` markers in the text stream. Rejected because markers can split across chunks, parsing is fragile, and it mixes content with metadata.
- **Separate WebSocket channel**: Open a secondary connection for thinking telemetry. Rejected as significant infrastructure overhead for a simple feature.

**Rationale**: The `fullStream` async iterator already produces typed events for every tool invocation. Forwarding them requires only adding `else if` branches in the controller loop — zero new dependencies, zero new infrastructure.

### 2. Selective Event Filtering

**Choice**: Forward all `tool-call` events except `done`, and all `tool-result` events except `done` and `think`.

- `done` tool-call is skipped because it signals completion, not a thinking step
- `done` tool-result is already handled as the final answer (emitted as `text-delta`)
- `think` tool-result is skipped because it echoes back the input (the `tool-call` already carries the reasoning text)

### 3. Frontend Discriminated Union for SSE Events

**Choice**: Change `ChatService.sendMessage()` from `Observable<string>` to `Observable<ChatEvent>` where `ChatEvent` is a discriminated union:

```typescript
type ChatEvent =
  | { kind: 'session-id'; sessionId: string }
  | { kind: 'text-delta'; delta: string }
  | { kind: 'thinking-step'; step: ThinkingStep };
```

**Rationale**: Type-safe handling in the component via `switch (chatEvent.kind)`. Eliminates the previous string-prefix hack (`__SESSION_ID__:...`).

### 4. Collapsible Accordion with Live Streaming

**Choice**: Render thinking steps in a DaisyUI `collapse` accordion above the assistant's chat bubble. Auto-expand while `isThinking` is true, auto-collapse when the final answer arrives.

**Step rendering by tool**:
| Tool | Display |
|------|---------|
| `think` | Brain emoji + italic reasoning text |
| `decompose_query` (call) | "Decomposing query..." |
| `decompose_query` (result) | Sub-query bullet list |
| `sql_query` (call) | "Running SQL" + raw SQL in code block |
| `sql_query` (result) | "Returned N rows" |
| `vector_search` (call) | "Searching: {query}" |
| `vector_search` (result) | "Found N matches" |
| `chart_data` / `update_category` | Tool-specific label |

**Rationale**: Matches the "moderate transparency" design goal — users see what the LLM is doing and the actual SQL queries, but raw result payloads are summarized as counts.

---

## Consequences

### Positive
- Users see real-time progress during the 5-15 second ReAct loop
- Raw SQL queries are visible, building trust with power users
- LLM reasoning is transparent, aiding debugging of incorrect answers
- Zero new dependencies or infrastructure — pure event forwarding

### Negative
- SSE payload size increases (tool args and results are now transmitted)
- Frontend test coverage for new `ChatEvent` parsing paths needs improvement (lines 91, 94-105 in chat.service.ts)
- `ThinkingStep.content` is typed as `Record<string, unknown>` — field access relies on runtime key lookups matching tool schemas (e.g., `sql` not `query` for sql_query tool)

### Risks
- If tool input/output schemas change, the frontend display logic silently degrades (shows "0 rows" or empty SQL blocks instead of crashing)
- The accordion `[checked]` binding is one-way from `isThinking` — once the user manually toggles it, their preference is respected until the next message
