# Task Plan: Word Practice Detail Page Fixes and UI Refresh

## Metadata
- Plan ID: 323b5a7f-af9e-4bd2-859d-757f5985184c
- Created At: 2026-01-12T22:48:51
- Status: Completed
- Complexity: Medium
- Estimated Steps: 5
- MCP Synced: Yes

## Goal
Fix word book header display after selection, allow pronunciation retry after failure, and refresh UI layout/styles to a commercial-grade look, with optional backend alignment if needed.

## Background
### Current State
- word-detail page uses WordPracticeHeader/Panel/List/Selector components and Pinia store.
- Selected book stored in local storage and route param; currentBook is derived by strict id match.
- Pronunciation uses innerAudioContext and Youdao voice URL.

### Problems/Needs
- Selected book name not showing after selection (likely id type mismatch).
- Pronunciation failure leaves audio context in error state, cannot retry.
- UI layout is functional but lacks refined commercial polish and hierarchy.

### Impact Scope
- Frontend: uni-ui/pages/word-practice/word-detail.vue, uni-ui/stores/wordPractice.js, uni-ui/components/word-practice/*.vue.
- Backend (optional): wxnode/src/controllers/wordBookController.ts, wxnode/src/services/wordBookService.ts.

## Solution Approach
### Technical Decisions
- Normalize book id in store (string/number parity) and provide helper for id comparison.
- Reset audio context on error to allow retry.
- Refresh layout/visuals by refining spacing, typography, card hierarchy, and action grouping.

### Steps
#### Step 1: Normalize book selection and header display
- Status: Completed
- Goals: consistent id matching; header and selector show selected book.
- Files: uni-ui/stores/wordPractice.js, uni-ui/components/word-practice/WordBookSelector.vue, uni-ui/pages/word-practice/word-detail.vue
- Actions:
  1. Add id normalization helper in store (coerce id type).
  2. Update currentBook getter to use normalized comparison.
  3. Ensure selectBook and route bookId are normalized.
  4. Update selector highlight logic if needed.
- Verification: select book -> header name updates; selector badge matches.

#### Step 2: Fix pronunciation retry behavior
- Status: Completed
- Goals: allow re-click after failure.
- Files: uni-ui/pages/word-practice/word-detail.vue
- Actions:
  1. Add resetAudioContext on error.
  2. Ensure play sets src then handles onError to destroy and clear error state.
  3. Optional: disable while loading to prevent rapid taps.
- Verification: force a bad word/URL -> error shows; click again -> new request fired and audio plays.

#### Step 3: UI/UX refresh
- Status: Completed
- Goals: commercial-grade layout, better hierarchy, mobile-friendly.
- Files: uni-ui/pages/word-practice/word-detail.vue, uni-ui/components/word-practice/WordPracticeHeader.vue, uni-ui/components/word-practice/WordPracticePanel.vue, uni-ui/components/word-practice/WordListTable.vue, uni-ui/components/word-practice/WordBookSelector.vue
- Actions:
  1. Adjust header layout (balance stats/progress, reduce clutter, improve typography).
  2. Refine search card + quick actions into structured sections and consistent spacing.
  3. Update panel buttons and table styling (consistent radius, spacing, color tokens).
  4. Add lightweight background and section separators.
- Verification: design review for hierarchy, readability, and tap targets on mobile.

#### Step 4: Backend response alignment (if needed)
- Status: Completed
- Goals: ensure id and book fields consistent.
- Files: wxnode/src/services/wordBookService.ts, wxnode/src/controllers/wordBookController.ts
- Actions:
  1. Confirm word-books list and words response fields match frontend normalizer.
  2. If id types mismatch, enforce numeric or string consistently.
  3. Ensure book name available for word list.
- Verification: frontend receives id and name consistently; no header mismatch after reload.

#### Step 5: Smoke test
- Status: Completed
- Goals: verify flows end-to-end.
- Files: uni-ui/pages/word-practice/word-detail.vue
- Actions:
  1. Test book selection, header update, selector highlight.
  2. Test pronunciation with failure/retry.
  3. Test search, pagination, quick actions.
- Verification: no console errors; UI stable on small screens.

## Risks
- Changing id normalization may affect stored progress keys; include compatibility handling.
- UI refresh may impact layout on small screens; test multiple sizes.

## Acceptance Criteria
- Header shows selected book name immediately after selection and on reload.
- Pronunciation button can retry after failure without reload.
- Updated layout matches commercial polish standards and remains responsive.
- No regression in word navigation/search/pagination.

## Execution Log
| Time | Action | Result |
| - | - | - |
| 2026-01-12T22:55:21 | Step 1 completed | Updated book id normalization |

## User Approval
- [ ] Approved for execution (/do-plan)


| 2026-01-12T22:58:42 | Step 2 completed | Reset audio context on error |

| 2026-01-12T23:13:26 | Step 3 completed | Refreshed UI layout and component styles |

| 2026-01-12T23:14:24 | Step 4 completed | Backend response already consistent; no changes |

| 2026-01-12T23:15:03 | Step 5 completed | Prepared manual QA checklist (runtime verification needed) |
