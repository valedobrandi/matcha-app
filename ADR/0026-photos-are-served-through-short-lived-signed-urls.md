# ADR-0026: Photos are served through short-lived signed URLs

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-09 |
| **Supersedes** | the public `/uploads` static mount |
| **Superseded by** | — |

## Issue

`/uploads` was a public static folder. Anyone holding a photo URL, from a shared link, a browser
history or an old API response, could fetch the photo forever, without an account and after the
owner blocked them. The subject scores any security flaw 0 (`docs/fr.subject.md:271`). An `<img>`
cannot send the Bearer token, and the app has no cookies, so the photo request cannot carry the
session.

## Decision

- **Signing** (`backend/core/upload_urls.py`): response models declare photo URLs as `UploadUrl`
  (`PhotoOut.url`, `DiscoveryProfileCard.profile_photo_url`). When a response is written as JSON, a
  local `/uploads/<file>` URL gets `?expires=<ts>&signature=<hmac>`. The HMAC binds the file name
  to the expiry with a key derived from `JWT_SECRET`, so no new setting is needed. URLs that are not
  local uploads pass through unchanged.
- **Expiry:** the end of the hour after the current one, so a URL is valid for one to two hours and
  stays the same within an hour, which lets the browser cache the photo.
- **Serving:** `GET /uploads/{file}` returns the file only for a valid, unexpired signature. Every
  other request gets an empty 404, so a client cannot tell a missing file from a bad link. The
  public static mount is gone.
- The OpenAPI contract is unchanged: the fields are still strings, and the frontend already loads
  `API_BASE_URL + url`.

## Status

Decided on 2026-10-09 and implemented in the change that adds this record.

## Positions

### A — Signed, expiring URLs (chosen)
Only a signed-in API response hands out a working URL, and a leaked one dies within two hours,
with no state on the server and no change to the frontend.

### B — Photos behind the Bearer token, loaded by script
Every image would be fetched with `fetch` and shown through a blob URL: more code in every
component, no browser caching, and object URLs to release.

### C — A session cookie for images
The browser would send it with `<img>` requests, but it adds a second way to authenticate, with its
own CSRF and SameSite concerns, next to the Bearer token
([ADR-0021](0021-the-socket-token-travels-in-the-first-frame.md) chose against cookies too).

## Argument

A protects the photos at the cost of one serializer and one route. Rounding the expiry to the hour
keeps image caching intact, and deriving the key from the existing secret keeps the deployment as
it is.
