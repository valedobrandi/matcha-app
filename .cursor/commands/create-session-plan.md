# create-session-plan
Workflow Creation
<context>
- Session directory: .session/
- Filename format: .session/<short-slug>.md  (no timestamp, slug only)
- Source: the current conversation — extract, do not invent
- File access: required — read every file before writing its diff
</context>

<objective>
Output a single session plan, presented directly in chat, that any agent could execute cold.
All paths should appear in the chat as clickable file paths (e.g. `/repo/path/to/file.py`), so users can quickly open the relevant file from the plan.
Two zones only: call stack orientation, then diffs ordered by that stack.
No prose summaries. No architecture essays. No placeholder diffs.
</objective>

<zone_1_call_stack>
Title: ## Call Stack

Show the actual execution trace for the feature being built.
- Clickable file paths.
- Real function/method names as they will exist after implementation
- Entry point at top, terminal calls at bottom
- Grouped by repository when multiple repos are touched
- Format: indented call tree, no boxes, no arrows

Example:
## Call Stack

### xeko-widget-v2
[/chat.jsx](chat.jsx) :: handleBookingFlow()
  → [/utils/thelisCartLinkUtils.js](utils/thelisCartLinkUtils.js) :: resolveBookingProvider()
  → [/utils/bookingProviderStrategies.js](utils/bookingProviderStrategies.js) :: executeThaisBooking()
    → fetch GET /api/thais/reservation/start

### xeko-backend
[/app/routes/thais_reservation.py](app/routes/thais_reservation.py) :: reservation_start()
  → [/app/dispatchers/thais.py](app/dispatchers/thais.py) :: ThaisReservationDispatcher.handle()
    → POST mcp-thais :3009 :: create_reservation()

### xeko-mcp/packages/thais
[/tools/create_reservation/controller.ts](tools/create_reservation/controller.ts) :: handleCreateReservation()
  → [/tools/create_reservation/service.ts](tools/create_reservation/service.ts) :: createReservation()
    → [/lib/thais-client.ts](lib/thais-client.ts) :: createEReservation()
    → [/lib/reservation-form-i18n.ts](lib/reservation-form-i18n.ts) :: getReservationFormStrings()
    → [/lib/reservation-outcome.ts](lib/reservation-outcome.ts) :: toFormSubmitSuccess()

Rules:
- Extract from conversation — do not invent function names
- If a function name was not discussed, use the path only and mark: (name TBD)
- The call stack order defines the diff order in zone 2
</zone_1_call_stack>

<zone_2_implementation>
Title: ## Implementation

Grouped by repository. Files appear in call stack order.
Paths in headers are clickable `/path/to/file` format for chat friendliness.
One block per file. No exceptions.

Block format:

---
### <repo-name> / [<relative-file-path>](<relative-file-path>)
**status:** new | edit | delete
**why:** one line — what this file does in the feature, not how

```diff
[real before/after diff — read the file first]
```
---

Rules:
- Read the actual file from disk before writing every diff
- Before state must match what is on disk exactly
- After state must implement exactly what was discussed in conversation
- If file is new: before state is empty, after state is the full file
- Do not add comments inside diffs that were not in the conversation
- Do not add defensive code, fallbacks, or extra handling not discussed
- One block per file — do not split one file across multiple blocks
- Do not scatter related files — all files for a repo stay in their repo section
</zone_2_implementation>

<process>
1. Extract the short slug from conversation (kebab-case, e.g. thais-reservation)
2. Write ## Call Stack — extract from conversation, real paths, real names, displaying all paths as `/path/to/file` for clickable chat navigation
3. Identify all repositories touched
4. For each repository, in call stack order:
   a. Read each file from disk
   b. Write one block per file with real diff (header path formatted as `/path/to/file`)
5. At the end, report: slug, repos touched, file count per repo, any (name TBD) entries that need resolution
</process>

<hard_rules>
- No timestamp in filename
- No placeholder diffs — if you cannot read the file, say so and stop
- No invented function names — mark TBD if unknown
- No prose between blocks except the repo header
- No task list — that is a separate workflow
- No review notes — that is a separate workflow
- If a file cannot be read from disk, report it before writing the block, do not guess
</hard_rules>

<success_criteria>
- Output contains session plan with call stack and implementation zones
- Call stack traces real execution with clickable file paths
- Every diff was written after reading the actual file
- Files are ordered by call stack within each repo section
- No placeholder, no invented state, no fictional before
- Another agent can execute from this output without asking questions
</success_criteria>
