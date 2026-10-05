# Hong — Discovery + profile consult UI

**Owner:** Hong · **Branch:** `feature/discovery-social-ui` · **Frontend only**
**Depends on:** discovery + social APIs already on `main`; Task 4 additionally needs bde Task 1
**Coordination:** [sprint-plan.md](sprint-plan.md)

Each task below is one reviewable PR (or stacked commit). Tasks 1–3 need nothing new
from bde — **start immediately**. The checkboxes under each task **are** the
definition of done.

---

## Task 1 — Nav + routes · start now

- [ ] Extend `frontend/src/layouts/RootLayout.tsx` nav: Suggest, Search, Visitors, Likes received (keep Home / Profile / Logout)
- [ ] Routes under `ProfileCompleteRoute` in `frontend/src/app/routes.tsx`: `/suggest`, `/search`, `/users/:userId`, `/visitors`, `/likes`

## Task 2 — Suggest + search pages · subject IV.3–IV.4 · start now

> Subject: show suggested profiles matching preferences; advanced search by age, fame
> rating, location/distance, and tags; results sortable and filterable by the same
> dimensions.

- [ ] API client `frontend/src/api/discovery.ts` — `GET /discovery/suggest`, `GET /discovery/search` with query params
- [ ] Hooks `useSuggestedProfiles`, `useSearchProfiles`
- [ ] `SuggestPage` — ranked cards linking to `/users/:id`
- [ ] `SearchPage` — filters age / fame / distance / tags + the sort options the BE exposes
- [ ] MSW test for at least one of the two hooks

Card fields come from the BE discovery schema: `id`, `username`, names, `age?`,
`fame_rating`, `distance_km?`, `common_tags_count`, `profile_photo_url?`, `location_label?`.

## Task 3 — Visitors + likes received · subject IV.5 · start now

> Subject: the user can see who visited their profile and who liked them.

- [ ] API client `frontend/src/api/social.ts` — visitors, likes received (+ the action calls Task 4 reuses)
- [ ] `VisitorsPage` → `GET /social/visitors`; `LikesReceivedPage` → `GET /social/likes/received`
- [ ] Rows link to `/users/:id`

## Task 4 — Public profile page + actions · subject IV.5 · **BLOCKED on bde Task 1**

> Subject: view a profile (never email); the visit is recorded; like/unlike; see fame,
> online status, last connection, liked-you and connected state; block and report.

When `GET /users/{id}` reaches `main`: regenerate `frontend/src/types/api.d.ts` first
(see sprint-plan touchpoints), then:

- [ ] `getPublicProfile(userId)` in `frontend/src/api/users.ts`, typed from `api.d.ts`
- [ ] Hook: load `PublicProfile` + `GET /social/relationship/{id}`; fire `POST /social/visits/{id}` **once per open** (BE upsert is idempotent — don't spam on re-render)
- [ ] `PublicProfilePage`: names, bio, tags, photos, fame, location_label, online / last seen; badges liked-you + connected; **no email, ever**
- [ ] Actions: like/unlike (`POST`/`DELETE /social/likes/{id}`), block/unblock (`POST`/`DELETE /social/blocks/{id}`), report (`POST /social/reports/{id}`, optional reason)
- [ ] Surface the BE rule "like requires a profile photo" as a readable error
- [ ] `404` from the relationship or profile GET (a missing user, or one who blocked you) → "profile unavailable"; `blocked_by_me` → "You blocked this user" with Unblock (ADR-0007)
- [ ] MSW test for the public profile hook (fetch + single visit)

`RelationshipResponse` (existing BE contract): `liked_by_me`, `liked_you`, `connected`,
`blocked_by_me`, `last_connection`, `is_online`.

---

## Out of scope

Chat UI and notification center (next sprint, on bde's transport) · any backend edit ·
ranking/fame changes · auth redesign · inventing response shapes not in `api.d.ts`.

## Testing

Per repo testing strategy: test-after for pages (query by role/text/test-id, not CSS);
MSW at the network layer for critical hooks (suggest + public profile/visit minimum);
mock network only, never internal hooks; no Playwright e2e without PR justification.
