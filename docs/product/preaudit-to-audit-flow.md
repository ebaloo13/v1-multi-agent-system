

# Preaudit to Audit Flow

## Purpose

This document defines the product and workflow transition between the **preaudit** and the **full audit**.

The goal is to turn a low-friction, public-facing diagnostic into a deeper, structured consulting process that can later feed the orchestrator and specialized agents.

---

## High-level flow

```txt
Website URL
→ Preaudit Live
→ Preaudit Report
→ Audit Intake Draft
→ Client / Consultant Completes Missing Info
→ Audit Live
→ Orchestrator
→ Specialized Agents
```

---

## Stage 1 — Preaudit Live

### Input
- Public website URL

### What happens
- The system fetches public website context
- Detects social profiles when available
- Detects basic tracking / measurement markers
- Runs the preaudit agent
- Applies deterministic scoring
- Writes artifacts grouped by client

### Output
- `run.json`
- `report.md`
- `audit-intake.draft.json`

### Purpose
The preaudit is the **hook**.

It demonstrates value quickly, identifies visible growth opportunities, and opens the door to a deeper consulting engagement.

### Important limitation
The preaudit works only from public evidence and should not be treated as a full business diagnosis.

---

## Stage 2 — Preaudit Report

### Purpose
The report translates technical and structural findings into business-facing language.

It should:
- show visible gaps
- create urgency
- suggest upside
- make the client want the next step

### Role in the funnel
This is the point where the prospect sees immediate value.

The report is not the full service.
It is the entry point into the full audit.

---

## Stage 3 — Audit Intake Draft

### What it is
An automatically generated draft file created after a successful `preaudit:live` run.

### Purpose
It pre-fills everything that can safely be inferred from:
- the website
- the preaudit result
- detected social profiles
- tracking markers

### What it should contain
- business name guess
- industry guess
- website
- detected social channels
- tracking markers
- preaudit scores
- visible issues

### What it should NOT invent
- business goals
- internal pains
- systems in actual use
- operational constraints
- close rates
- team capacity

### Product meaning
This draft is the bridge between:
- value demonstration
- real consulting discovery

---

## Stage 4 — Client / Consultant Completion

### Purpose
This is the handoff point where the lead becomes an active consulting client.

The client (or consultant on a call) confirms and completes the missing business information required for a deeper audit.

### Typical missing information
- business goals
- main pains
- systems in use
- sales process details
- operational constraints
- lead handling process
- data availability

### Why this stage matters
The system should not pretend to know internal business facts it cannot verify from the public site.

This stage adds the minimum real-world context needed to make the audit accurate and useful.

---

## Stage 5 — Audit Live

### Input
- completed intake JSON
- preaudit run context

### What happens
- intake and preaudit are normalized through the audit ingestion layer
- the audit agent analyzes the business with richer context
- the system identifies:
  - main pains
  - available data
  - recommended agents
  - priority order
  - missing info still needed

### Purpose
The audit is the first serious business diagnosis.

Unlike the preaudit, it is not only trying to attract the client.
It is trying to determine:
- what actually matters most
- what should happen next
- what information is still missing
- what specialized agents should be activated later

---

## Stage 6 — Orchestrator

### Purpose
The orchestrator should consume the audit output and decide:
- which specialized agents to activate
- in what order
- with what dependencies or prerequisites

### Important
The audit must feed the orchestrator with something more useful than generic notes.

Over time, the audit should clearly express:
- priorities
- constraints
- readiness
- recommended next inputs
- recommended agents

---

## Stage 7 — Specialized Agents

These may include:
- sales
- operations
- collections

Their role is execution and focused diagnosis.

They should not replace the preaudit or the audit.

---

## Product logic

### Preaudit
- low friction
- public data only
- value demonstration
- lead generation

### Intake
- client confirms missing business context
- trust / commitment step
- conversion moment in the funnel

### Audit
- structured business diagnosis
- identifies priorities
- prepares orchestration

### Orchestrator
- decides implementation path

### Specialized agents
- act on the selected priorities

---

## Why this structure is important

This flow avoids two common mistakes:

### Mistake 1
Trying to do a full business diagnosis from the public website alone.

### Mistake 2
Asking the client for too much information before showing value.

This workflow solves both:
- show value first
- ask for deeper information second
- run deeper diagnosis only after trust is established

---

## Data flow summary

```txt
public web facts
→ preaudit
→ report + intake draft
→ client-confirmed business context
→ audit ingestion
→ audit
→ orchestrator
→ specialized agents
```

---

## UX implications

A future UX should make this flow feel natural:

1. Enter website URL
2. Receive preaudit report
3. Review / confirm prefilled intake form
4. Complete missing business information
5. Run full audit
6. Review recommended next step / agent path

---

## Future extensions

Later versions of the flow may include:
- CSV uploads
- PDF uploads
- CRM connections
- ads account integrations
- calendar / booking platform integrations
- industry-specific branching flows

But the current product should stay focused on the core transition:

**preaudit → intake → audit**

---

## Current product principle

The preaudit is how interest is created.

The intake is where trust and commitment are created.

The audit is where the real consulting work begins.