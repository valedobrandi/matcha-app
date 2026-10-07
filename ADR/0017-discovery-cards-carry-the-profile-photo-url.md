# ADR-0017: Discovery cards carry the profile photo URL

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-06 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The Suggest and Search pages show every profile as a grey box with the user's initials. The
photos exist and are served (the seed gives each user two, one of them the profile photo), but a
card cannot show one:

- `DiscoveryProfileCard` has no photo field (`backend/modules/discovery/schemas.py:6`), and
  `list_profiles` selects none (`backend/modules/discovery/repository.py:53`). Both
  `/discovery/suggest` and `/discovery/search` return that model
  (`backend/modules/discovery/controller.py:24`, `:33`).
- `ProfileCard` only draws the initials (`frontend/src/components/ProfileCard.tsx`).
- Photos appear only after opening a profile (`PublicProfilePage.tsx:78`) or on your own profile
  (`MyProfilePage.tsx:58`).

Subject IV.5 asks users to like the profile photo of another user
([`docs/fr.subject.md`](../docs/fr.subject.md), line 188), so the place where people like
should show it.

## Decision

- `DiscoveryProfileCard` gets `profile_photo_url`, the URL of the user's profile photo
  (`user_photos.is_profile_photo = true`). The value is `null` when the user has photos but none
  marked as the profile photo. The backend owns the field, and the schema marks it required
  ([ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md)).
- `list_profiles` reads it with a `LEFT JOIN` on `user_photos`. The `one_profile_photo_per_user`
  index (migration 0006) allows one row at most, so a candidate is never duplicated, and a
  candidate without a profile photo still appears.
- The URL stays as stored (`/uploads/<file>`). The frontend prefixes `API_BASE_URL`, as it
  already does on the two profile pages.
- `ProfileCard` shows the image when the URL is set and keeps the initials when it is `null`.
- Other lists (`/discovery/search-list`, visitors, likes received) are not part of this
  decision. They get the field when they need to show a photo.

## Status

Decided on 2026-10-07: `/discovery/suggest` and `/discovery/search` return `profile_photo_url`,
read with a `LEFT JOIN` on the profile photo, and `ProfileCard` shows the photo or the initials.
Recorded on 2026-10-06, after seeding 500 users and opening the Suggest page: every card showed
initials.

## Positions

### A — The card fetches the user's photos itself
No contract change. It costs one extra request per card, 20 more per page with the default
limit, and the public profile payload carries far more than a card needs.

### B — Return all photos on the card
One request, but a list payload grows by up to five URLs per user and the card uses one of them.
The other four are shown on a list page nobody opened.

### C — Return one nullable `profile_photo_url` on the card (chosen)
The list query already joins user data. One more join, backed by an index, adds the one photo
the user chose as their face.

## Argument

C follows [ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md): the
backend model defines the shape, the frontend types are regenerated, and the CI `contract` job
catches a stale file. It shows only the photo the user designated as the profile photo, and it
adds no request per card. Its cost is one nullable field on the contract and one join in the
list query.

## Implications

- Backend: `profile_photo_url: Optional[str]` on `DiscoveryProfileCard`, and the join in
  `list_profiles`.
- Frontend: regenerate `frontend/src/types/api.d.ts` with `npm run gen:api`; test factories that
  build a `DiscoveryProfile` gain the field; `ProfileCard` renders the image or the initials.
- A user who uploaded photos but never chose a profile photo shows initials until they choose
  one.
- Tests, on a real Postgres per [ADR-0013](0013-visibility-sql-is-tested-on-a-real-postgres.md):
  a candidate with a profile photo carries its URL; a candidate with photos but no profile photo
  carries `null` and still appears. A router test checks the field is present. A card test
  checks the image (with the `API_BASE_URL` prefix) and the initials fallback, found by role or
  alt text, not by CSS class. The Playwright journey of
  [ADR-0016](0016-one-playwright-journey-checks-the-real-ui.md) stays as it is.

## Related

- [ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md) — the contract
  comes from the backend models
- [ADR-0013](0013-visibility-sql-is-tested-on-a-real-postgres.md) — discovery SQL is tested on
  a real Postgres
- [ADR-0016](0016-one-playwright-journey-checks-the-real-ui.md) — the single UI journey
