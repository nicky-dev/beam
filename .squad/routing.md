# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|---------|
| Architecture & scope decisions | Wash | Which NIPs to implement, API design, tech trade-offs |
| UI components & pages | Kaylee | React components, MUI, embed widgets, dashboard pages |
| Backend & Nostr protocol | Zoe | NDK, OAuth, RTMP API, Nostr events, hooks |
| Tests & quality | Jayne | Test setup, unit tests, integration tests, edge cases |
| Code review | Wash | Review PRs, approve/reject agent work |
| Product backlog & priorities | Inara | What to build next, user stories, acceptance criteria |
| Feature evaluation & sign-off | Inara | Does delivered work solve the user's problem? Approve/reject |
| User story & requirements | Inara | Writing user stories, defining done criteria before dev |
| Session logging | Scribe | Automatic — never needs routing |
| Backlog monitoring | Ralph | Issue triage, PR status, CI monitoring |

## Domain Map

| File / Directory | Owner |
|-----------------|-------|
| `src/component/*.tsx` | Kaylee (build), Wash (review) |
| `src/app/(dashboard)/` | Kaylee (UI), Zoe (data hooks) |
| `src/app/embed/` | Kaylee |
| `src/app/api/auth/` | Zoe |
| `src/hook/` | Zoe |
| `src/lib/nostr/` | Zoe |
| `src/lib/mui/` | Kaylee |
| `**/*.test.*`, `**/*.spec.*` | Jayne |
| `.squad/` | Scribe (logs), Wash (decisions) |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad:wash` | Architecture or review task | Wash |
| `squad:kaylee` | Frontend / UI work | Kaylee |
| `squad:zoe` | Backend / Nostr / API work | Zoe |
| `squad:jayne` | Testing / QA work | Jayne |
| `squad:inara` | Product / backlog / requirements work | Inara |
| `squad` (no sub-label) | Needs triage | Wash triages first |
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
