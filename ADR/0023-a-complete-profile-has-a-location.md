# ADR-0023: A complete profile has a location, asked for during onboarding

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Open |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-08 |
| **Supersedes** | the location-free completeness rule of migration 0014 |
| **Superseded by** | — |

## Issue

The subject (IV.2) locates every user by GPS with their consent, or by a city or neighborhood
they type when they refuse, and says this location is required for the app to work. The
onboarding wizard (basic profile, tags, photos) never asked for one, and the
`profile_completeness` view did not require one, so a new user reached the suggestions without
a location: no proximity in the matching, and Advanced search, which filters by distance by
default, answered `LOCATION_REQUIRED`, an error on the console. `PATCH /users/me/location`
refused a location without GPS consent, so a typed city could only be saved together with the
whole profile.

## Decision

- **Rule:** `profile_completeness` (migration 0017) also requires `latitude` and `longitude`.
  The view stays the only owner of the rule; `/users/me`, the session and discovery read it.
- **Onboarding:** the wizard asks for the location after the basic profile: share the position
  (GPS), or type a city or neighborhood, which is geocoded. Next is refused until one is found,
  and the form shows the location it found.
- **Endpoint:** `PATCH /users/me/location` saves either kind; `location_consent` records whether
  the position came from GPS. The `INVALID_LOCATION` error code is gone.
- **Frontend:** `useLocationInput` reports a whole location through a callback instead of
  writing into one form, so the profile tab and the wizard share it.

## Status

Open on 2026-10-08: the owner applied the recommendation after the hand-in location check. It
becomes Decided when the pull request merges.

## Positions

### A — Require the location and ask for it in the wizard (chosen)
Every complete profile can be matched by distance, and the user meets the choice between GPS
and a typed city once, at sign-up.

### B — Keep the rule and send users without a location to the profile tab
The suggestions would still open without a location, and Advanced search would still fail
until the user found the profile tab.

### C — Fall back to a default position
Silently places users somewhere they are not and breaks the "closest first" promise.

## Argument

The subject makes the location a precondition of matching. Putting it in the completeness rule
and in the wizard makes the precondition true for every user who reaches the suggestions, and
removes the one path that produced the `LOCATION_REQUIRED` error.
