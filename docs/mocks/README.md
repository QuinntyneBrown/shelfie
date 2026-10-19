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
  Household:  the Bells. Parents hold accounts; readers are profiles a parent creates. Any number of each.
  Reader:     Nia (9). Avatar "N", rose. Username nia; signs in with username + password. 5-day reading streak.
  Parent:     Dad = Marcus Bell, marcus@example.com, username marcus. Avatar "D", sky. Signed up and started the household.
  Invited:    Mum = Priya Bell, priya@example.com, username priya. Avatar "P", lilac. Dad invited her today; she has not joined yet.
  New reader: Theo (6). Avatar "T", mint. Username theo; the reader Dad adds in the edit-reader dialog.
  Photos:     Nia and Dad each upload their own photo (assets/photos/nia.jpg, dad.jpg) in the photo states; elsewhere they show their letters.
  Mascot:     Olive the owl (assets/olive.svg). She asks the chapter questions one at a time in a chat on Log a chapter, with a short reply between questions.
  Everyone signs in on one form: username, password and "Keep me signed in on this device" (30 days of use; off = ends with the browser).
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
| Nia | The reader, 9. Signs in with username `nia` and a password Dad set. 5-day streak. Avatar "N" in rose. |
| Dad (Marcus Bell) | The parent who signed up. Username `marcus`, e-mail `marcus@example.com`. Avatar "D" in sky. |
| Mum (Priya Bell) | Invited parent, `priya@example.com`. Accepts the invite as username `priya`. Avatar "P" in lilac. |
| Theo | The reader Dad adds next, 6. Username `theo`. Avatar "T" in mint. |
| Olive | The owl who asks the chapter questions. Appears only on Log a chapter. |
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
| Entry | sign-in, sign-up, accept-invite, forgot-password, reset-password | | |
| Reader | shelf, book, add-book, log-chapter, chapter, certificate (a PDF) | account-menu, profile-photo | toast, banner, push |
| Grown-up | review, review-chapter, books, manage-book, settings | give-reward, delete-book, edit-question, edit-reader, invite-parent | |
| Errors | not-found, forbidden, server-error, offline | | |

Navigation: the reader has one place to be (the shelf), so her top bar is just the brand, her streak and her avatar. The grown-up gets Review / Books / Settings in the top bar from 768 px and a bottom tab bar on phones.

## Open questions and assumptions

These are decisions the mocks make that nobody has confirmed. Each is marked in the relevant mock with a yellow note.

1. **Who writes the questions.** Three default questions apply to every chapter of every book; Dad can add, edit or remove extra questions per book from Manage book. New questions apply to chapters logged from then on. Dad can also ask for suggested questions (see 14); nothing the AI writes reaches Nia until he adds it.
2. **Accounts and profiles (L2-002, L2-003, L2-021, L2-033 to L2-036).** Only parents hold accounts, created by signing up (starts a household) or by accepting another parent's invite (the link works 7 days, once). Readers are profiles a parent adds in Settings with a name, colour, username and password. Everyone signs in on one form with username, password and "Keep me signed in" (on: 30 days of use; off: ends with the browser). No PIN, no profile picker. Usernames are 3–20 letters, digits, dots or underscores and unique ignoring case. Removing a reader or parent is not mocked; it is out of scope.
3. **Chapters are numbered, not titled.** Adding a book asks only for the number of chapters. A chapter row shows the first line of her first answer instead of a title.
4. **Covers are made, then optionally pictured.** A cover is a pastel colour plus a sticker chosen when the book is added; a picture can be added over it (13) or come from the title lookup (14).
5. **Only question 1 is required.** The other answers can be left blank so a tired reader can still log a chapter. **Questions arrive as a chat.** Olive asks one question at a time in a speech bubble; Nia’s answer box is her bubble, and a small Next button (enabled once she has an answer) brings a short encouraging reply and the next question. Tapping I’m done at any point sends what she has.
6. **Answers are final once sent.** There is no edit after "I'm done!"; Undo on the success toast is the only way back, for the life of the toast (10 seconds).
7. **A sticker is required to send feedback;** the note is optional. The reader sees feedback on the chapter page and in a banner on her shelf.
8. **Rewards are free text** with four quick picks. Giving a reward is the only "finish" step for Dad; there is no approval of the book itself.
9. **Streak** counts consecutive days with at least one chapter logged and is shown to both of them. It is derived, never edited.
10. **Offline:** the shelf shows cached data with a banner; a chapter logged offline is kept on the device and sent later.
11. **Theme** is a household setting (match device, light, dark) saved in Settings; the mock bar's toggle only previews it.
12. **Auth pages are animated.** The card scales in and its fields rise with a short stagger; the logo sticker sways; a slow pastel aurora runs behind the card, drawn with WebGPU (`assets/aurora.js`) from the cover-colour tokens, with a CSS-gradient fallback. All of it stops under reduced motion. These pages break the "no animation on page load" rule on purpose: they are the only pages a person sees cold.
13. **Profile photos (L2-042 to L2-045).** A parent and a reader can each upload, replace and remove their own photo, and nobody else's. One "Your photo" dialog serves both: Nia opens it from "My photo" in her account menu, Dad from "Add a photo" in Settings → Your account. Picking a photo uploads it at once (no Save); JPEG, PNG or WebP up to 5 MB. The photo replaces the letter in every avatar; with no photo, or while it loads, or if it fails to load, the letter shows exactly as before. Removing takes effect at once without a confirmation. No cropping, filters or photos of other people.
14. **Suggested questions (L2-069 to L2-073).** "Suggest questions" sits beside "Add a question" on Manage book and opens a dialog that asks the server for up to five ideas for the next chapter (chapter 12 of The Lion, the Witch and the Wardrobe). Ideas arrive unticked; Dad ticks the ones to keep, can reword any of them in place, and "Add N questions" saves each through the same 5 to 200 character rule as Add a question. Ideas that are too short, too long or already asked never show; if none is left the dialog says so. If the AI service fails, is too slow or has been asked too often, the dialog offers Try again; if the server has no AI key it says suggestions aren't switched on. Add a question works in every case. Only the title, author, chapter number and the book's questions are sent; never Nia's name or answers.
15. **Book autocomplete (L2-064 to L2-075).** On Add a book, three typed letters and a short pause drop up to five matching books under the Title, with their covers, from the Open Library catalogue through the API. Picking one sets the title, fills the author and gives the preview the catalogue cover; the catalogue has no chapter count, so Chapters stays hers to fill. When the catalogue has nothing, up to three AI guesses show with a "Suggested" badge and a note; when nothing can answer, a quiet note says so and the form works by hand. No field other than Title changes before a pick, and everything stays editable.
16. **Reward gallery (L2-081 to L2-089).** Dad keeps a gallery of rewards in Settings → Rewards, each a name (1 to 100 characters) and the number of finished books it takes (1 to 20). Nia sees the gallery under "Reading toward" on her shelf and picks one as her goal; books she finishes from that moment count toward it, and picking a different reward starts again at 0. One goal per household, like the shelf itself. When the count reaches the target she sees a celebration and the pick buttons hide; on Review the finished book that reached it names the goal, and its "Give a reward" opens the usual dialog with the goal's name already typed in. Once that book has its reward the goal is done and she picks her next one. No ordering, history or more than one goal at a time.
17. **Reward descriptions and pictures (L2-105 to L2-110).** In the Add / edit a reward dialog Dad may write a description (up to 500 characters after trimming) and add up to 6 pictures, each a JPEG, PNG or WebP of up to 5 MB, stored as a 480 × 480 WebP. The first picture added is **featured**; Make featured moves the mark, and removing the featured picture makes the oldest one left featured. The featured picture replaces the 🎁 on the Settings row and on Nia's shelf card, and the 🎁 comes back when there is no picture or it fails to load; her card also shows the description. Pictures upload one at a time as soon as they are chosen when editing; when adding, they are kept until Add reward and sent after the reward is saved. Reordering, captions, cropping and a full-size viewer are not built.
18. **Send feedback (L2-114 to L2-117).** Anyone signed in opens Send feedback from the account menu, above Sign out. One short form: a 1 to 5 score as five big faces (😞 Not fun, 🙁 A bit meh, 😐 Okay, 🙂 Good, 🤩 Love it), the kind as two chips (How it feels, selected at first, or An idea, which changes the message prompt to "What would make Shelfie better?"), and an optional message of up to 1,000 characters. A face or a message is needed; Send checks and says what is missing. Sent feedback closes the dialog with the toast "Thanks! We read every note." Reading or replying to feedback inside Shelfie is not built; the operator lists it with shelfie-admin.
19. **Finish certificate (L2-120).** A finished book has a printable certificate: one A4 landscape PDF the API draws with the reader's name, the title and author, the chapter count, the finish day and the cover colour (and picture when there is one). Nia prints it from her finished book page; Dad from the finished card on Review and from Manage book. It never shows the reward or a signature, and an unfinished book has none. `pages/certificate` is a picture of that PDF, not a screen of the app.
20. **Feedback notifications (L2-121 to L2-128).** Browsers can push four things: Dad hears when Nia logs a chapter, and Nia hears when Dad sends a sticker or note, gives a book reward or gives a streak reward. Each person turns it on for the device in front of them: Dad with the "Notify this device" switch in Settings, Nia with a one-time banner on her shelf (Turn on, or Not now, which hides it on that device for good). The browser's own permission prompt only ever follows that tap; if Chrome has blocked notifications the switch is disabled and says where to allow them, and if the server has no push keys the card says so and the banner never shows. All four events start on; Dad can switch each off for the household in the same card. A push is one short, warm line, replaces an earlier one about the same thing, and opens the page it is about. No sound, no badge counts, no notification centre and no e-mail.

## Checking and screenshots

```sh
# coverage, HTML hygiene, accessibility basics, broken links; --write regenerates index.html and the matrix below
python3 -I .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write

# 792 screenshots (132 mocks × 360/768/1280 × light/dark) plus a contact sheet in docs/mocks/.cache/mocks/
python3 -I .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

The screenshot script needs the Python `playwright` package with Chromium, or `npx playwright`. Never commit `.cache/`.

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | missing | invalid | submitting | expired | one-provider | no-providers | redirecting | provider-no-email | provider-reader | provider-cancelled | provider-failed | taken | success | badges-none | badges-all | streak-progress | streak-earned | streak-given | long | goal-empty | goal-none | goal-progress | goal-reached | goal-error | push-offer | push-on | finished | edge | picture | suggestions | suggestions-ai | searching | no-matches | lookup-failed | picked | wrong-file | too-large | covers-loading | covers | covers-empty | covers-failed | picture-failed | dictating | dictation-denied | pending | streak-reached | reviewed | assist-busy | assist-flagged | assist-clear | assist-drafted | assist-failed | assist-unavailable | rewarded | uploading | photo | rewards-empty | streak-rewards-given | notifications-on | notifications-events-off | notifications-blocked | notifications-unsupported | menu-open | reduced-motion | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | [✅](pages/sign-in/error.html) | [✅](pages/sign-in/missing.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/expired.html) | [✅](pages/sign-in/one-provider.html) | [✅](pages/sign-in/no-providers.html) | [✅](pages/sign-in/redirecting.html) | [✅](pages/sign-in/provider-no-email.html) | [✅](pages/sign-in/provider-reader.html) | [✅](pages/sign-in/provider-cancelled.html) | [✅](pages/sign-in/provider-failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002`, `L2-003`, `L2-137`, `L2-140`, `L2-141` |
| Create a parent account (`sign-up`) | [✅](pages/sign-up/default.html) | ➖ | ➖ | [✅](pages/sign-up/error.html) |  | [✅](pages/sign-up/invalid.html) | [✅](pages/sign-up/submitting.html) |  | [✅](pages/sign-up/one-provider.html) | [✅](pages/sign-up/no-providers.html) | [✅](pages/sign-up/redirecting.html) | [✅](pages/sign-up/provider-no-email.html) | [✅](pages/sign-up/provider-reader.html) | [✅](pages/sign-up/provider-cancelled.html) | [✅](pages/sign-up/provider-failed.html) | [✅](pages/sign-up/taken.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-033`, `L2-137`, `L2-139`, `L2-140` |
| Join a household (`accept-invite`) | [✅](pages/accept-invite/default.html) | ➖ | ➖ | [✅](pages/accept-invite/error.html) |  | [✅](pages/accept-invite/invalid.html) | [✅](pages/accept-invite/submitting.html) |  |  |  |  |  |  |  |  | [✅](pages/accept-invite/taken.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-035` |
| Forgot password (`forgot-password`) | [✅](pages/forgot-password/default.html) | ➖ | ➖ | [✅](pages/forgot-password/error.html) |  | [✅](pages/forgot-password/invalid.html) | [✅](pages/forgot-password/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/forgot-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reset password (`reset-password`) | [✅](pages/reset-password/default.html) | ➖ | ➖ | [✅](pages/reset-password/error.html) |  | [✅](pages/reset-password/invalid.html) | [✅](pages/reset-password/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/reset-password/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| My shelf (`shelf`) | [✅](pages/shelf/default.html) | [✅](pages/shelf/loading.html) | [✅](pages/shelf/empty.html) | [✅](pages/shelf/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/shelf/badges-none.html) | [✅](pages/shelf/badges-all.html) | [✅](pages/shelf/streak-progress.html) | [✅](pages/shelf/streak-earned.html) | [✅](pages/shelf/streak-given.html) | [✅](pages/shelf/long.html) | [✅](pages/shelf/goal-empty.html) | [✅](pages/shelf/goal-none.html) | [✅](pages/shelf/goal-progress.html) | [✅](pages/shelf/goal-reached.html) | [✅](pages/shelf/goal-error.html) | [✅](pages/shelf/push-offer.html) | [✅](pages/shelf/push-on.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-007`, `L2-047`, `L2-086`, `L2-087`, `L2-088`, `L2-096`, `L2-097`, `L2-101`, `L2-102`, `L2-108`, `L2-121`, `L2-123` |
| Book (`book`) | [✅](pages/book/default.html) | [✅](pages/book/loading.html) | ➖ | [✅](pages/book/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/book/finished.html) | [✅](pages/book/edge.html) | [✅](pages/book/picture.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-008`, `L2-047`, `L2-118` |
| Certificate (`certificate`) | [✅](pages/certificate/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-118` |
| Add a book (`add-book`) | [✅](pages/add-book/default.html) | ➖ | ➖ | [✅](pages/add-book/error.html) |  | [✅](pages/add-book/invalid.html) | [✅](pages/add-book/submitting.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/add-book/picture.html) | [✅](pages/add-book/suggestions.html) | [✅](pages/add-book/suggestions-ai.html) | [✅](pages/add-book/searching.html) | [✅](pages/add-book/no-matches.html) | [✅](pages/add-book/lookup-failed.html) | [✅](pages/add-book/picked.html) | [✅](pages/add-book/wrong-file.html) | [✅](pages/add-book/too-large.html) | [✅](pages/add-book/covers-loading.html) | [✅](pages/add-book/covers.html) | [✅](pages/add-book/covers-empty.html) | [✅](pages/add-book/covers-failed.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009`, `L2-046`, `L2-048`, `L2-074`, `L2-075`, `L2-076`, `L2-077`, `L2-078`, `L2-079`, `L2-080`, `L2-090`, `L2-091`, `L2-092` |
| Log a chapter (`log-chapter`) | [✅](pages/log-chapter/default.html) | [✅](pages/log-chapter/loading.html) | ➖ | [✅](pages/log-chapter/error.html) |  | [✅](pages/log-chapter/invalid.html) | [✅](pages/log-chapter/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/log-chapter/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/log-chapter/finished.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/log-chapter/dictating.html) | [✅](pages/log-chapter/dictation-denied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Chapter answers (`chapter`) | [✅](pages/chapter/default.html) | [✅](pages/chapter/loading.html) | ➖ | [✅](pages/chapter/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/chapter/pending.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Review (`review`) | [✅](pages/review/default.html) | [✅](pages/review/loading.html) | [✅](pages/review/empty.html) | [✅](pages/review/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/review/long.html) |  |  |  | [✅](pages/review/goal-reached.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/review/streak-reached.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-017`, `L2-089`, `L2-098`, `L2-103`, `L2-118` |
| Review a chapter (`review-chapter`) | [✅](pages/review-chapter/default.html) | [✅](pages/review-chapter/loading.html) | ➖ | [✅](pages/review-chapter/error.html) |  | [✅](pages/review-chapter/invalid.html) | [✅](pages/review-chapter/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/review-chapter/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/review-chapter/reviewed.html) | [✅](pages/review-chapter/assist-busy.html) | [✅](pages/review-chapter/assist-flagged.html) | [✅](pages/review-chapter/assist-clear.html) | [✅](pages/review-chapter/assist-drafted.html) | [✅](pages/review-chapter/assist-failed.html) | [✅](pages/review-chapter/assist-unavailable.html) |  |  |  |  |  |  |  |  |  |  |  | `L2-015`, `L2-064`, `L2-065`, `L2-066`, `L2-067`, `L2-068` |
| Books (`books`) | [✅](pages/books/default.html) | [✅](pages/books/loading.html) | [✅](pages/books/empty.html) | [✅](pages/books/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-047` |
| Manage a book (`manage-book`) | [✅](pages/manage-book/default.html) | [✅](pages/manage-book/loading.html) | ➖ | [✅](pages/manage-book/error.html) |  | [✅](pages/manage-book/invalid.html) | [✅](pages/manage-book/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/manage-book/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/manage-book/picture.html) |  |  |  |  |  |  | [✅](pages/manage-book/wrong-file.html) |  |  |  |  |  | [✅](pages/manage-book/picture-failed.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/manage-book/rewarded.html) | [✅](pages/manage-book/uploading.html) |  |  |  |  |  |  |  |  |  | `L2-010`, `L2-046`, `L2-048`, `L2-069`, `L2-118` |
| Settings (`settings`) | [✅](pages/settings/default.html) | [✅](pages/settings/loading.html) | ➖ | [✅](pages/settings/error.html) |  | [✅](pages/settings/invalid.html) | [✅](pages/settings/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/settings/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/settings/photo.html) | [✅](pages/settings/rewards-empty.html) | [✅](pages/settings/streak-rewards-given.html) | [✅](pages/settings/notifications-on.html) | [✅](pages/settings/notifications-events-off.html) | [✅](pages/settings/notifications-blocked.html) | [✅](pages/settings/notifications-unsupported.html) |  |  | `L2-021`, `L2-022`, `L2-034`, `L2-036`, `L2-042`, `L2-043`, `L2-081`, `L2-082`, `L2-083`, `L2-100`, `L2-108`, `L2-121`, `L2-122`, `L2-124` |
| Page not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Grown-ups only (`forbidden`) | [✅](pages/forbidden/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Marketing page (`marketing`) | [✅](pages/marketing/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/marketing/menu-open.html) | [✅](pages/marketing/reduced-motion.html) | `L2-129`, `L2-130`, `L2-131`, `L2-132`, `L2-133` |

### Dialogs

| Screen | default | busy | invalid | failed | goal | edit | pictures | uploading | picture-failed | wrong-file | library | too-many | none-selected | saving | success | empty | unavailable | taken | photo | sent | parent | parent-photo | filled | idea | choosing | too-large | remove-confirmation | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Give a reward (`give-reward`) | [✅](dialogs/give-reward/default.html) | [✅](dialogs/give-reward/busy.html) | [✅](dialogs/give-reward/invalid.html) | [✅](dialogs/give-reward/failed.html) | [✅](dialogs/give-reward/goal.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-017`, `L2-089` |
| Add a reward (`edit-gallery-reward`) | [✅](dialogs/edit-gallery-reward/default.html) | [✅](dialogs/edit-gallery-reward/busy.html) | [✅](dialogs/edit-gallery-reward/invalid.html) | [✅](dialogs/edit-gallery-reward/failed.html) |  | [✅](dialogs/edit-gallery-reward/edit.html) | [✅](dialogs/edit-gallery-reward/pictures.html) | [✅](dialogs/edit-gallery-reward/uploading.html) | [✅](dialogs/edit-gallery-reward/picture-failed.html) | [✅](dialogs/edit-gallery-reward/wrong-file.html) | [✅](dialogs/edit-gallery-reward/library.html) | [✅](dialogs/edit-gallery-reward/too-many.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-081`, `L2-082`, `L2-105`, `L2-106`, `L2-107`, `L2-109`, `L2-110`, `L2-111` |
| Streak reward (`edit-streak-reward`) | [✅](dialogs/edit-streak-reward/default.html) | [✅](dialogs/edit-streak-reward/busy.html) | [✅](dialogs/edit-streak-reward/invalid.html) | [✅](dialogs/edit-streak-reward/failed.html) |  | [✅](dialogs/edit-streak-reward/edit.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-100` |
| Remove a reward (`remove-gallery-reward`) | [✅](dialogs/remove-gallery-reward/default.html) | [✅](dialogs/remove-gallery-reward/busy.html) | ➖ | [✅](dialogs/remove-gallery-reward/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-083` |
| Remove a book (`delete-book`) | [✅](dialogs/delete-book/default.html) | [✅](dialogs/delete-book/busy.html) | ➖ | [✅](dialogs/delete-book/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Add a question (`edit-question`) | [✅](dialogs/edit-question/default.html) | [✅](dialogs/edit-question/busy.html) | [✅](dialogs/edit-question/invalid.html) | [✅](dialogs/edit-question/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Suggested questions (`suggest-questions`) | [✅](dialogs/suggest-questions/default.html) | [✅](dialogs/suggest-questions/busy.html) | [✅](dialogs/suggest-questions/invalid.html) | [✅](dialogs/suggest-questions/failed.html) |  |  |  |  |  |  |  |  | [✅](dialogs/suggest-questions/none-selected.html) | [✅](dialogs/suggest-questions/saving.html) | [✅](dialogs/suggest-questions/success.html) | [✅](dialogs/suggest-questions/empty.html) | [✅](dialogs/suggest-questions/unavailable.html) |  |  |  |  |  |  |  |  |  |  | `L2-069`, `L2-070`, `L2-071`, `L2-072` |
| Add a reader (`edit-reader`) | [✅](dialogs/edit-reader/default.html) | [✅](dialogs/edit-reader/busy.html) | [✅](dialogs/edit-reader/invalid.html) | [✅](dialogs/edit-reader/failed.html) |  | [✅](dialogs/edit-reader/edit.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/edit-reader/taken.html) | [✅](dialogs/edit-reader/photo.html) |  |  |  |  |  |  |  |  | `L2-036`, `L2-043` |
| Invite a parent (`invite-parent`) | [✅](dialogs/invite-parent/default.html) | [✅](dialogs/invite-parent/busy.html) | [✅](dialogs/invite-parent/invalid.html) | [✅](dialogs/invite-parent/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/invite-parent/sent.html) |  |  |  |  |  |  |  | `L2-034` |
| Account menu (`account-menu`) | [✅](dialogs/account-menu/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/account-menu/photo.html) |  | [✅](dialogs/account-menu/parent.html) | [✅](dialogs/account-menu/parent-photo.html) |  |  |  |  |  | `L2-003`, `L2-042`, `L2-043`, `L2-118` |
| Send feedback (`send-feedback`) | [✅](dialogs/send-feedback/default.html) | [✅](dialogs/send-feedback/busy.html) | [✅](dialogs/send-feedback/invalid.html) | [✅](dialogs/send-feedback/failed.html) |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/send-feedback/success.html) |  |  |  |  |  | [✅](dialogs/send-feedback/parent.html) |  | [✅](dialogs/send-feedback/filled.html) | [✅](dialogs/send-feedback/idea.html) |  |  |  | `L2-118`, `L2-115`, `L2-116`, `L2-117` |
| Your photo (`profile-photo`) | [✅](dialogs/profile-photo/default.html) | [✅](dialogs/profile-photo/busy.html) | [✅](dialogs/profile-photo/invalid.html) | [✅](dialogs/profile-photo/failed.html) |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/profile-photo/success.html) |  |  |  | [✅](dialogs/profile-photo/photo.html) |  | [✅](dialogs/profile-photo/parent.html) |  |  |  | [✅](dialogs/profile-photo/choosing.html) | [✅](dialogs/profile-photo/too-large.html) | ➖ | `L2-042`, `L2-044` |

### Notifications

| Screen | info | success | warning | danger | with-action | stacked | persistent | chapter-logged | feedback | book-reward | streak-reward | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/with-action.html) | [✅](notifications/toast/stacked.html) |  |  |  |  |  |  |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  |  | [✅](notifications/banner/persistent.html) |  |  |  |  |  |
| Push notification (`push`) | ➖ | ➖ | ➖ | ➖ |  |  |  | [✅](notifications/push/chapter-logged.html) | [✅](notifications/push/feedback.html) | [✅](notifications/push/book-reward.html) | [✅](notifications/push/streak-reward.html) | `L2-125`, `L2-126`, `L2-127` |

<!-- coverage:end -->
