# Shelfie mocks

Static HTML mocks for every page, dialog and notification of Shelfie, in every state, in light and dark, at phone, tablet and desktop widths, with a keyboard. They are the product on disk before the product exists: what gets built is what is mocked here, and nothing more.

## How to open them

- Open [index.html](index.html) from disk for the gallery, then click any state.
- Every mock has a bar at the bottom linking its sibling states and toggling the theme (or press `t`).
- `?theme=dark` forces dark, `?theme=light` forces light. `?chrome=0` hides the mock bar and the yellow design notes so the page looks exactly like the product.
- Dialogs are shown over the page they open from; notifications on the page that triggers them. Under 640 px dialogs become bottom sheets.

## Cast and catalog

Every mock tells the same story so a reviewer can follow it across screens. Reuse these names, books and dates; do not invent new ones.

<!--
  CAST
  Household:  the Bells, one reader and one grown-up (a single household per account).
  Reader:     Nia (9). Avatar "N", rose. Signs in with a 4-digit PIN. 5-day reading streak.
  Grown-up:   Dad = Marcus Bell, marcus@example.com. Avatar "D", sky. Signs in with a password.
  Today:      Friday 17 October 2026, late afternoon.

  CATALOG (cover colour · sticker)
  The Lion, the Witch and the Wardrobe — C. S. Lewis — 17 chapters — reading, 11 logged (ch 12 next) — sage · 🦁
      ch 1–9 reviewed (ch 9 got a 🌟 on Wed 14 Oct), ch 10 logged yesterday and ch 11 today 4:12 pm, both waiting for Dad.
      Questions: the 3 defaults + "Where did the children go in this chapter?" (added by Dad, Wed 7 Oct).
  The Wild Robot — Peter Brown — 80 chapters — reading, 3 logged (ch 4 next) — mint · 🤖   (used for the long/edge states)
  Because of Winn-Dixie — Kate DiCamillo — 26 chapters — not started, added by Dad Thu 15 Oct — sun · 🐕
  Matilda — Roald Dahl — 21 chapters — finished Tue 13 Oct, reward not yet given — rose · 📚
  Charlotte's Web — E. B. White — 22 chapters — finished Sun 23 Aug, reward "Movie night with popcorn" given Mon 24 Aug — sky · 🕷️

  DEFAULT QUESTIONS (every book)
  1. What happened in this chapter?
  2. Who was your favourite character in this chapter, and why?
  3. What do you think will happen next?

  STICKERS Dad can give: 🌟 Star · 🦉 Wise owl · 🚀 Rocket · 🐉 Dragon · 🍪 Cookie · 💡 Bright idea
-->

| Who | Details |
|---|---|
| Nia | The reader, 9. Signs in with a 4-digit PIN. 5-day streak. Avatar "N" in rose. |
| Dad (Marcus Bell) | The grown-up. Signs in with `marcus@example.com` and a password. Avatar "D" in sky. |
| Today | Friday 17 October 2026 |

| Book | Author | Chapters | Where it is |
|---|---|---|---|
| The Lion, the Witch and the Wardrobe 🦁 | C. S. Lewis | 17 | Reading; 11 logged, chapters 10 and 11 waiting for Dad |
| The Wild Robot 🤖 | Peter Brown | 80 | Reading; 3 logged (the long-list case) |
| Because of Winn-Dixie 🐕 | Kate DiCamillo | 26 | Up next; Dad added it on Thursday |
| Matilda 📚 | Roald Dahl | 21 | Finished Tuesday; reward not yet given |
| Charlotte's Web 🕷️ | E. B. White | 22 | Finished in August; reward "Movie night with popcorn" |

## The product in one paragraph

Two people share one household. Nia opens her **shelf**, taps the book she is reading, logs the chapter she just read and answers a few short questions (three defaults, plus any Dad adds for that book). Dad opens **Review**, reads her answers, gives a sticker and a short note, and when she finishes a book he gives a **reward** that shows up on her trophy shelf. Everything else (sign-in, settings, error pages, toasts and banners) exists only to keep that loop smooth.

## Screens

| Area | Pages | Dialogs | Notifications |
|---|---|---|---|
| Entry | sign-in, forgot-password, reset-password | | |
| Reader | shelf, book, add-book, log-chapter, chapter | account-menu | toast, banner |
| Grown-up | review, review-chapter, books, manage-book, settings | give-reward, delete-book, edit-question | |
| Errors | not-found, forbidden, server-error, offline | | |

Navigation: the reader has one place to be (the shelf), so her top bar is just the brand, her streak and her avatar. The grown-up gets Review / Books / Settings in the top bar from 768 px and a bottom tab bar on phones.

## Open questions and assumptions

These are decisions the mocks make that nobody has confirmed. Each is marked in the relevant mock with a yellow note.

1. **Who writes the questions.** Three default questions apply to every chapter of every book; Dad can add, edit or remove extra questions per book from Manage book. New questions apply to chapters logged from then on. (Alternative not mocked: AI-generated questions per chapter.)
2. **One reader, one grown-up.** A household has exactly one of each. Nia signs in with a 4-digit PIN that Dad sets in Settings; five wrong tries lock the keypad for five minutes.
3. **Chapters are numbered, not titled.** Adding a book asks only for the number of chapters. A chapter row shows the first line of her first answer instead of a title.
4. **Covers are made, not fetched.** A cover is a pastel colour plus a sticker chosen when the book is added. No image upload, no online lookup.
5. **Only question 1 is required.** The other answers can be left blank so a tired reader can still log a chapter.
6. **Answers are final once sent.** There is no edit after "I'm done!"; Undo on the success toast is the only way back, for the life of the toast (10 seconds).
7. **A sticker is required to send feedback;** the note is optional. The reader sees feedback on the chapter page and in a banner on her shelf.
8. **Rewards are free text** with four quick picks. Giving a reward is the only "finish" step for Dad; there is no approval of the book itself.
9. **Streak** counts consecutive days with at least one chapter logged and is shown to both of them. It is derived, never edited.
10. **Offline:** the shelf shows cached data with a banner; a chapter logged offline is kept on the device and sent later.
11. **Theme** is a household setting (match device, light, dark) saved in Settings; the mock bar's toggle only previews it.

## Checking and screenshots

```sh
# coverage, HTML hygiene, accessibility basics, broken links; --write regenerates index.html and the matrix below
python3 -I .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write

# 606 screenshots (101 mocks × 360/768/1280 × light/dark) plus a contact sheet in docs/mocks/.cache/mocks/
python3 -I .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

The screenshot script needs the Python `playwright` package with Chromium, or `npx playwright`. Never commit `.cache/`.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | pin | pin-invalid | locked | password | invalid | submitting | expired | success | long | finished | edge | pending | reviewed | rewarded | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | [✅](pages/sign-in/error.html) | [✅](pages/sign-in/pin.html) | [✅](pages/sign-in/pin-invalid.html) | [✅](pages/sign-in/locked.html) | [✅](pages/sign-in/password.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/expired.html) |  |  |  |  |  |  |  |  |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | ➖ | ➖ | [✅](pages/forgot-password/error.html) |  |  |  |  | [✅](pages/forgot-password/invalid.html) | [✅](pages/forgot-password/submitting.html) |  | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | ➖ | ➖ | [✅](pages/reset-password/error.html) |  |  |  |  | [✅](pages/reset-password/invalid.html) | [✅](pages/reset-password/submitting.html) |  | [✅](pages/reset-password/success.html) |  |  |  |  |  |  |  |
| My shelf (`shelf`) | [✅](pages/shelf/default.html) | [✅](pages/shelf/loading.html) | [✅](pages/shelf/empty.html) | [✅](pages/shelf/error.html) |  |  |  |  |  |  |  |  | [✅](pages/shelf/long.html) |  |  |  |  |  |  |
| Book (`book`) | [✅](pages/book/default.html) | [✅](pages/book/loading.html) | ➖ | [✅](pages/book/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/book/finished.html) | [✅](pages/book/edge.html) |  |  |  |  |
| Add a book (`add-book`) | [✅](pages/add-book/default.html) | ➖ | ➖ | [✅](pages/add-book/error.html) |  |  |  |  | [✅](pages/add-book/invalid.html) | [✅](pages/add-book/submitting.html) |  | ➖ |  |  |  |  |  |  |  |
| Log a chapter (`log-chapter`) | [✅](pages/log-chapter/default.html) | [✅](pages/log-chapter/loading.html) | ➖ | [✅](pages/log-chapter/error.html) |  |  |  |  | [✅](pages/log-chapter/invalid.html) | [✅](pages/log-chapter/submitting.html) |  | [✅](pages/log-chapter/success.html) |  | [✅](pages/log-chapter/finished.html) |  |  |  |  |  |
| Chapter answers (`chapter`) | [✅](pages/chapter/default.html) | [✅](pages/chapter/loading.html) | ➖ | [✅](pages/chapter/error.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/chapter/pending.html) |  |  |  |
| Review (`review`) | [✅](pages/review/default.html) | [✅](pages/review/loading.html) | [✅](pages/review/empty.html) | [✅](pages/review/error.html) |  |  |  |  |  |  |  |  | [✅](pages/review/long.html) |  |  |  |  |  |  |
| Review a chapter (`review-chapter`) | [✅](pages/review-chapter/default.html) | [✅](pages/review-chapter/loading.html) | ➖ | [✅](pages/review-chapter/error.html) |  |  |  |  | [✅](pages/review-chapter/invalid.html) | [✅](pages/review-chapter/submitting.html) |  | [✅](pages/review-chapter/success.html) |  |  |  |  | [✅](pages/review-chapter/reviewed.html) |  |  |
| Books (`books`) | [✅](pages/books/default.html) | [✅](pages/books/loading.html) | [✅](pages/books/empty.html) | [✅](pages/books/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Manage a book (`manage-book`) | [✅](pages/manage-book/default.html) | [✅](pages/manage-book/loading.html) | ➖ | [✅](pages/manage-book/error.html) |  |  |  |  | [✅](pages/manage-book/invalid.html) | [✅](pages/manage-book/submitting.html) |  | [✅](pages/manage-book/success.html) |  |  |  |  |  | [✅](pages/manage-book/rewarded.html) |  |
| Settings (`settings`) | [✅](pages/settings/default.html) | [✅](pages/settings/loading.html) | ➖ | [✅](pages/settings/error.html) |  |  |  |  | [✅](pages/settings/invalid.html) | [✅](pages/settings/submitting.html) |  | [✅](pages/settings/success.html) |  |  |  |  |  |  |  |
| Page not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Grown-ups only (`forbidden`) | [✅](pages/forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Dialogs

| Screen | default | busy | invalid | failed | parent | Requirements |
|---|---|---|---|---|---|---|
| Give a reward (`give-reward`) | [✅](dialogs/give-reward/default.html) | [✅](dialogs/give-reward/busy.html) | [✅](dialogs/give-reward/invalid.html) | [✅](dialogs/give-reward/failed.html) |  |  |
| Remove a book (`delete-book`) | [✅](dialogs/delete-book/default.html) | [✅](dialogs/delete-book/busy.html) | ➖ | [✅](dialogs/delete-book/failed.html) |  |  |
| Add a question (`edit-question`) | [✅](dialogs/edit-question/default.html) | [✅](dialogs/edit-question/busy.html) | [✅](dialogs/edit-question/invalid.html) | [✅](dialogs/edit-question/failed.html) |  |  |
| Account menu (`account-menu`) | [✅](dialogs/account-menu/default.html) | ➖ | ➖ |  | [✅](dialogs/account-menu/parent.html) |  |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/with-action.html) | [✅](notifications/toast/stacked.html) |  |  |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  |  | [✅](notifications/banner/persistent.html) |  |

<!-- coverage:end -->
