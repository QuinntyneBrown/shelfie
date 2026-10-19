# ADR-0021: Reading goals count books finished between the day they are set and their end date

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-154 to L2-161

## Context

A household, and a community, want a shared target such as "10 books by 31 December". Shelfie already has a reward-gallery goal, shown to the reader as "Reading toward" and "Your goal" (`L2-086` to `L2-089`); it must stay exactly as it is and must not be confused with the new target.

## Decision

1. **Books, not chapters.** A reading goal counts finished books. A finished book is an event the household already records (`book.finished_at`) and celebrates; chapters vary from 3 to 80 per book, so a chapter target would reward short chapters.
2. **One table.** `reading_goal(id, household_id NULL, community_id NULL, target, starts_on, ends_on, created_at)`, with exactly one owner set and at most one goal per household and per community (partial unique indexes). Both owners cascade.
3. **The window.** A book counts when the day it was finished, in its own household's time zone (`household.time_zone`), is on or after `starts_on` and on or before `ends_on`. `starts_on` is the day the goal is set, in the setting household's time zone; editing a goal changes its target and end date but not its start. The end date must be today or later and at most 366 days away.
4. **Household goal.** Target 1 to 100 books, counted over every reader of the household. Readers see it on the shelf; parents set, change and remove it on the Community page.
5. **Community goal.** Target 1 to 1,000 books, counted over every member household, each in its own time zone. Each member sees the total and every member's display name with its own count (ADR-0020). A household that leaves stops counting.
6. **States.** In progress until the count reaches the target; reached from then on, even after the end date; ended when the end date has passed without reaching it. An ended or reached goal stays until a parent changes or removes it.
7. **Wording.** The new target is always called a **Reading goal** ("Our reading goal", "Set a reading goal"). The reward gallery keeps "Reading toward" and "Your goal". The two never share a card.
8. **Reached.** The shelf shows a reached goal inside `sh-celebration`, and the reader's device shows the toast "Reading goal reached!" once per goal (remembered in `localStorage`).

## Consequences

- Undoing the last chapter of a book unfinishes it and lowers the count, as it does for the gallery goal.
- Goals do not repeat; a new one is set when the old one is done.
- A book finished by a household before it joined a community still counts if it falls in the window; that keeps the rule one sentence long.
