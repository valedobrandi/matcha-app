# ADR-0022: A location is kept at neighborhood precision and distances are whole kilometres

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-08 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The subject locates a user "up to their neighborhood" (`docs/fr.subject.md`, IV.2). The API
stored the exact GPS coordinates sent by the browser and returned each suggestion's distance to
0.1 km, and the distance filter compared that same value. A user can change their own location
at will, so reading their distance to someone from three points, or narrowing the distance
filter, locates that person to about 100 m: the trilateration attack known from dating apps.

## Decision

- **Stored precision:** `UsersService` rounds latitude and longitude to 2 decimals (about 1.1 km
  north–south, under 1 km east–west in France) before either location write,
  `update_location` (GPS) and `edit_profile` (GPS or a typed city). The exact position never
  reaches the database.
- **Distance:** discovery computes and returns `distance_km` rounded to whole kilometres, and
  the distance filter compares that rounded value.
- The API contract does not change (`distance_km` stays a number), and the seed, which writes
  synthetic positions directly, is untouched.

## Status

Decided on 2026-10-08 and implemented in #58: the owner applied the recommendation after the
hand-in location check. The users service tests store GPS and edited coordinates at two decimals,
and the discovery distance integration test answers whole kilometres.

## Positions

### A — Round on write and round the distance (chosen)
The exact position is never stored, so no query, filter or leaked backup can reveal it.

### B — Round only the returned distance
Hides the number but not the position: the distance filter and the sort still run on exact
coordinates and can be narrowed step by step.

### C — Add random noise to positions
Repeated readings average the noise out unless it is fixed per user, which then behaves like
rounding with extra state.

## Argument

Rounding at the single place that writes a location removes the precise position instead of
hiding it in each reader, and whole kilometres match the precision the stored position still has.
