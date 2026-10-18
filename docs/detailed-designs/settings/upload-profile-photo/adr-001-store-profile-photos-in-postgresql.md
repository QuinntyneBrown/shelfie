# ADR-001: Store profile photos in PostgreSQL

## Status

Accepted, 18 October 2026.

## Context

Each parent and reader may upload a profile photo (`L2-042`). Shelfie runs as one Node.js process on one Azure VM (`infra/`) against a managed PostgreSQL 16 server that runs apart from the VM. `L2-037` states that the API stores all household data in PostgreSQL and nothing on the application host's disk. The database has point-in-time restore for 7 days and a nightly logical dump to Blob Storage kept for 30 days (`L2-031`, `L2-039`). A household is erased by deleting its row, and everything it owns cascades in the same transaction (`L2-041`).

After processing, a photo is a 256 × 256 WebP of about 10–20 kB (`L2-044`). A household holds a handful of people, so a household's photos total well under 1 MB.

Two stores were considered:

1. **PostgreSQL `bytea`** in a `profile_photo` table keyed by profile.
2. **The VM filesystem** (for example `/var/lib/shelfie/photos/{profileId}.webp`) with only a reference in PostgreSQL.

## Decision

Photos are stored in PostgreSQL as `bytea`, one row per profile in `profile_photo`, with `ON DELETE CASCADE` from `profile`.

## Consequences

- `L2-037` holds: the VM stays stateless and a redeploy, a rebuilt VM or a second process sees the same photos.
- Backups need no change: point-in-time restore and the nightly dump already include the table (`L2-031`, `L2-039`). A restore brings photos back consistent with the profiles they belong to.
- Erasure needs no change: deleting a household cascades to its profiles and their photos in the same transaction (`L2-041`). Files on disk would need a second, non-transactional clean-up and could outlive an erased household.
- Database size grows by about 20 kB per person, which is negligible next to the server's storage; a 5 MB upload never reaches the database because only the re-encoded photo is stored.
- Serving reads one small row per request. `ETag` and `If-None-Match` answer repeat requests with 304 and no body, so the cost stays low without a CDN or a file server.
- If photos ever grew large or numerous, a move to Blob Storage would be a new decision; nothing here prevents it.
