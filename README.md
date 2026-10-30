# DHAAR — Deposit Holding, Assurance & Audit Registry

A frontend-only prototype for the AICTE security-deposit / FDR lifecycle. DHAAR demonstrates a unified registry, evidence review, simulated bank confirmation, maturity monitoring, controlled release, impact evaluation and demo QA.

## Run locally

Requirements: Node.js 18+ (Node.js 20 LTS recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Build and preview:

```bash
npm run build
npm run preview
```

## Implemented prototype scope

### Phase 1 — Foundation
- React + TypeScript + Vite with a responsive operations-dashboard shell.
- Navigation for all implemented modules, role-selector demo control, DEMO MODE indicator, light/dark theme toggle and shared visual components.
- Responsive desktop, tablet and mobile layouts; keyboard focus and reduced-motion styling.

### Phase 2 — Shared data and state
- Typed instrument model and synthetic seed records.
- Zustand state with browser-local persistence, common add/update/event actions and reset controls.
- Simulated date used by lifecycle calculations.

### Phase 3 — Dashboard, institutions and registry
- Command Center portfolio summary, institution overview, deposit registry, filters and CSV export.
- Verification queue, activity stream and local audit export.

### Phase 4 — Submission wizard
- Three-step intake: instrument details, local file selection and pre-flight review.
- Basic field/date/amount/lien/document-presence checks.
- Submission creates an E0 declaration in the shared registry. A collision check avoids reusing an existing demo instrument ID.

### Phase 5 — Evidence comparison and 26-rule catalogue
- Evidence workbench compares registry values with the simulated evidence state.
- TRD rules R01–R26 are represented in a deterministic rule catalogue with severity, explanation and next action.
- Each rule is explicitly labelled Pass, Review, or Not testable. Rules requiring OCR, PDF forensics, APH parameters, bank/branch directories, trust records or complaint systems are not falsely reported as passed.

### Phase 6 — Bank confirmation desk
- Simulated request, matching response and mismatch workflows.
- A mismatch does not upgrade the evidence grade. A matching response requires a declared lien and records the simulated attestation date.
- No real bank is contacted.

### Phase 7 — Compliance and maturity
- Simulated-date control, verified-held calculation, maturity wall, renewal action and previous-maturity lineage fields.
- E0/E1 declarations are excluded from verified-held value; only future-dated E2/E3 records with lien declaration are included in this prototype calculation.
- The UI explains that the freshness window and calculations are illustrative, not an official determination.

### Phase 8 — Release and refund tracker
- Release gates for E2/E3 evidence, lien declaration, completed term, current Assured freshness (illustrative 180-day window), open findings, holds, refund-account confirmation, maker review, checker approval, competent authority approval, bank acknowledgement and reconciliation.
- NOC is a printable preview only; it is not an official instrument or authorization to release funds.

### Phase 9 — Impact Lab
- Live metrics derived from the current synthetic registry, six repeatable scenario demonstrations, CSV export and print view.
- Evaluation targets are shown as targets, not measured programme outcomes.

### Phase 10 — Demo readiness and QA
- Pre-demo checklist, five-minute SIH presentation script, rehearsal event, reset controls, and reminders for responsive, keyboard, blocked-state and export checks.

## Recommended five-minute demo

1. **Command Center:** introduce the evidence ladder and alert queue.
2. **Submit an instrument:** create a synthetic FDR and show its E0 status.
3. **Evidence workbench:** run R01–R26 and explain which checks are testable versus requiring trusted sources.
4. **Bank confirmation desk:** send a mock request and demonstrate matching and mismatch outcomes.
5. **Compliance & maturity:** change the simulated date and show maturity/coverage changes.
6. **Release & refunds:** show the Assured/term/hold/refund gates, then the maker → checker → authority → bank acknowledgement → reconciliation sequence.
7. **Impact Lab & audit:** run a scenario, export a report and explain the limits of synthetic metrics.

## Important boundaries

- This is a frontend prototype using synthetic data and browser `localStorage`. Do not enter real financial documents or personal information.
- Bank confirmation, document extraction, evidence matching, release approval, bank acknowledgement and refund reconciliation are simulated. There is no backend, production authentication, server-side RBAC, real OCR, document forensics, digital signature, or bank/SFMS/NeSL/PFMS integration.
- The role selector is a visual demonstration control, not a security boundary.
- Browser storage and the activity list are not tamper-proof audit records.
- The 180-day Assured window is illustrative and must be confirmed/configured against the applicable policy before real use.
- The 26-rule catalogue is not equivalent to full implementation of all 26 rules: rules needing unavailable source data are explicitly marked **Not testable**.
- APH clause numbers and legal policy parameters are not invented; they must be supplied and versioned by the responsible authority.

## Troubleshooting

- If `npm install` fails, check internet access and the Node.js version, then retry from this folder.
- If the development server port is occupied, stop the other process or use the alternate port Vite prints.
- Use Settings → Reset demo or the sidebar reset control to restore seed data. The QA checklist and release tracker have their own browser-local state; use **Demo readiness & QA → Reset demo workspace** to clear them as well.

## Trust-model and core-logic updates

- Verification is a controlled ladder: officer review moves E0 → E1; only an E1 record can request bank confirmation; only a matching simulated bank response can move E1 → E2. There is no officer-side E2 shortcut.
- Shared calculations in `src/lib/calculations.ts` drive days-to-maturity, verified-held eligibility/value, and the computed Assured/Stale/Unassured state using the simulated date.
- Compliance shows required amount, verified-held value, and coverage gap. `src/lib/rulesConfig.ts` labels the required amount, minimum tenure, and freshness window as demo parameters, not official policy.
- R06 (minimum tenure) and R07 (required amount) are evaluated by the rule engine and block submission when the demo thresholds are not met.
- Running evidence rules writes persistent finding records with severity, status, detail and next action. Findings can be resolved or waived with a required reason in Verification.
- Release cases are stored in the shared Zustand store. Closing a release marks the linked deposit as closed in the main deposit record.
- Theme selection is persisted with the demo workspace. Verification navigation count is derived from current records rather than hardcoded.

All of the above remain frontend-demo controls. Do not use the prototype to authorize actual deposits, releases, or refunds.

## Phase 3–5 update

This build adds the editable bank-response desk with field-by-field comparison and seven-day request expiry; role-aware navigation and demo workflow gates; maker/checker/approver separation; hold and refund-name mismatch blockers; successor lineage that replaces the predecessor only after E2; 13 synthetic instruments; registry-derived institution summaries; a locally hash-chained audit stream with a verify control; rule-engine-backed scenario outcomes; synthetic precision/recall metrics; and Vitest tests.

Run the tests with `npm test` after installing dependencies. These are frontend demonstration controls only: the browser role selector is not production authorization, local hash chaining is not a secure ledger, and all bank responses are simulated.


## Workflow hardening update (Phase A/B/C)

- **Trust transitions:** only a Regional Officer can review E0 → E1 and send a bank request for an E1 instrument; only a Bank Verifier can submit the response. E1 → E2 occurs only when all five response fields match and the lien is confirmed.
- **Actor-aware audit:** events record the active role, are linked with SHA-256, and retain the latest 300 events. The retained chain validates from its oldest retained event (whose prior hash is the truncation anchor).
- **Impact evaluation:** precision and recall are computed by executing the rule engine against labelled synthetic faults and clean controls. These remain demo-only evaluation results.
- **Release governance:** Regional Officer is the only maker; checker and authority steps require different roles. Shared instrument/institution holds block release progression.
- **Lineage and alerts:** replacement records use `Replaced`; renewal gap days are `max(0, successor issue date − predecessor maturity date)`, so same-day replacement is zero days. Maturity notifications are derived from the simulated date across T-180, T-90, T-60, T-30, T-7, T-0 and overdue.
- **Critical finding waivers:** a critical waiver needs a reason, a request by one role, and approval by a different Approving Authority role.
- **Validation:** `npm test` runs rule, evidence-transition, release-gate, role-separation, SHA-256 and alert-ladder tests. `npm run build` should be run after dependencies install.

All bank responses, records, holds, approvals and financial release actions are simulated in this frontend prototype. Do not use real bank or institution data.
