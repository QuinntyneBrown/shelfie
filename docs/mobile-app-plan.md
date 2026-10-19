# Shelfie for iOS: plan

Status: proposal, 19 Oct 2026. Nothing in this plan is built. The decisions it recommends become ADRs once agreed.

## The short version

1. **Same repository.** The iOS app lives in `apps/ios/`, beside `apps/web`, `apps/api` and `apps/admin-cli`, with its own CI job. This is the same choice ADR-0003 made for the .NET admin CLI, for the same reason: the API and every client change in the same pull request, against the same L1/L2 specs, mocks and design system.
2. **iOS only, for now.** The reader uses one device. Build the reader's loop first, keep the parent on the web until the reader side is solid, and decide on Android only when someone in the household holds an Android device. Nothing in this plan is made cheaper by building Android at the same time, and nothing in it makes Android harder later.
3. **Native SwiftUI, no third-party dependencies**, mirroring the web workspace one to one: a `Components` package (the `sh-*` catalogue), a `Core` package (API client, session, offline queue, toasts, banners), one package per feature and a thin app target. Same specs, same mocks, same tokens, same acceptance-test discipline (XCUITest with one screen object per screen).
4. **One backend change on the critical path**: push through APNs beside Web Push. Everything else the app needs the API already serves.
5. **Ship to the family through TestFlight first.** An App Store listing is a separate, later milestone with its own prerequisites (in-app household deletion above all).

## Check this before committing to native

A native app is the largest way to put Shelfie on an iPad. Two cheaper routes exist, and a careful reading of the goal ("my daughter reads on the iPad, with an icon and notifications") might be satisfied by the first one. Decide this consciously before Phase 0.

| Route | What it gives | Effort | Why it may not be enough |
|---|---|---|---|
| **Home-screen web app (PWA)** | An icon, full-screen launch, Web Push on iOS (home-screen web apps support it), offline shelf once `work-offline` is built. No App Store, no Apple account, no new stack. | 2–3 days (manifest, icons, the Angular service worker the offline design already specifies) | Runs in WebKit, not Chrome. AGENTS.md targets bleeding-edge Chrome only, so some features may need checking in Safari. Feels like a website in places (no haptics, no share sheet, no system speech). |
| **Capacitor wrapper** | The existing Angular app in a WebView with native plugins (APNs push, speech, haptics, share) and an App Store listing. | 5–8 days plus the APNs backend work below | App Review guideline 4.2 (minimum functionality) is a known risk for wrapped web apps. Web Speech API is unavailable inside WKWebView, so voice answers need a plugin. Two UI stacks to keep in sync anyway. |
| **Native SwiftUI** (this plan) | The real thing: system look and feel, APNs, on-device speech, Quick Look for certificates, offline storage, Widgets later if ever wanted. | ≈ 55 days, see estimates | Second front end to maintain. Needs a Mac for development and macOS runners in CI. |

Recommendation: if the only need is "an icon on the iPad and a ping when a sticker arrives", do the PWA and stop. If Shelfie should feel like a first-class iPad app and be listed on the App Store, follow this plan.

## Should the app share the git repository?

Yes. Reasons, in order of weight:

- **One contract, one pull request.** The API has no versioning and no OpenAPI document for the web routes. A route change and every client that uses it must land together, with the acceptance tests for both. A second repository would turn every API change into two PRs and a coordination problem.
- **One set of specs and mocks.** `docs/specs/L1.md` and `L2.md` describe behaviour, not a platform. Every iOS screen traces to an L2 id exactly as the Playwright tests do. The HTML mocks in `docs/mocks/` already show every page, dialog and state in light and dark at phone and tablet widths; the iOS screens are built from them, and `docs/screen-composition.md` names the components each screen is made of.
- **One design system.** `docs/design-system/tokens.json` is DTCG; the iOS `Components` package takes its colours, type scale, spacing, radius and motion from that file, so the two front ends cannot drift.
- **Precedent.** `apps/admin-cli` is a .NET tool in the same repository with its own CI job and is not an npm workspace. `apps/ios` follows the same rule.

What changes in the repository to make room:

- AGENTS.md's folder structure gains `apps/ios/` and a line saying the iOS app obeys the same components-library, scope and ATDD rules.
- `.github/workflows/ci.yml` gains an `ios` job on `macos-latest`. The repository is public, so macOS minutes are free; a private fork would pay a 10× minute multiplier.
- A new ADR records the location and structure, as ADR-0003 did for the CLI.

Cost of the choice: Linux-based agent sessions (such as the one that wrote this plan) cannot run `xcodebuild` or the simulator. Mitigation below under "Tooling and CI".

## Android too?

Not now. Three reasons:

1. **Scope lock.** AGENTS.md asks for exactly what is needed today. The household has iOS devices; an Android app serves nobody yet.
2. **Nothing is shared between the two native apps except the API**, which already exists. Building Android alongside iOS would not reuse SwiftUI code. A Kotlin/Compose app in `apps/android/` would be roughly the same effort again (≈ 45 days) and would mirror `apps/ios` package for package.
3. **The decision is reversible.** The API stays platform-neutral (cookie session, JSON, raw image bodies, PDF links, push subscriptions by device), so Android can be added later without touching the iOS app.

When the answer changes: if an Android device joins the household within the next year, or if Shelfie is meant to be a public product on both stores, the cheaper route is Capacitor or the PWA above, not two native apps. Say so now rather than discovering it after the SwiftUI app is built.

## What the app is

The same product, not a new one. Every L1 requirement that applies to a person using Shelfie applies to the app. Out of scope by nature: the admin API and `shelfie-admin` (operator tooling), the production platform designs.

### Reader (Phase 1)

| Web feature (detailed design) | iOS behaviour |
|---|---|
| sign-in/sign-in-with-password, manage-session | Username and password, "stay signed in" keeps the session cookie across launches. |
| books/view-shelf, view-book | Shelf with current and finished books, progress, streak, badges, reward goal progress, streak milestones. Readable offline from the last fetch. |
| reading-log/log-chapter, voice-answers | Log a chapter, answer questions, drafts survive leaving the screen, undo window, dictation with on-device speech recognition. |
| reading-log/view-chapter-answers | Sent answers and the parent's sticker and note. |
| reading-log/celebrate-finished-book, finish-certificate | Celebration, certificate opened in Quick Look and shared or printed through the share sheet. |
| reading-log/track-streak, earn-badges | As on the web; both are read from the API, never computed on the device. |
| review/reward-gallery (reader part), streak-rewards (reader part) | Pick a goal, watch progress, celebrate when reached; streak path with shield and coin. |
| shell/navigate-shell, notify, send-feedback, work-offline | Tab shell, toasts and banners, feedback sheet, offline banner and queued chapter logs. |
| settings/choose-appearance | Match device, light, dark, read from the session's `theme`. |
| settings/upload-profile-photo (own photo) | Photos picker or camera, cropped on device, sent as raw image bytes to `PUT /api/profile/photo`. |

### Parent (Phase 2)

| Web feature | iOS behaviour |
|---|---|
| review/review-queue, review-chapter, ai-review-assistant, give-reward | Waiting chapters, answers, sticker and note, assistant draft, reward. |
| books/add-book, autocomplete-book, upload-book-cover (incl. cover picker), manage-book, manage-questions, suggest-questions | Add and manage books; lookup and covers go through the API only (ADR-0008 holds: the device never calls a third party). |
| review/reward-gallery, streak-rewards (parent parts) | Gallery with pictures and featured picture; milestone rewards. |
| settings/manage-readers, invite-parent, edit-household-settings | Readers, invites, own name, e-mail and password. |
| sign-in/sign-up, accept-invite, reset-password | Sign-up and invite acceptance in the app; password reset opens the e-mailed link in the app through a universal link. See "App Store readiness" for why sign-up may be held back. |

### Not in the app

- Operator features (admin API, CLI). Unchanged.
- Nothing from `docs/feature-enhancements.md` that is not built on the web. The app reaches parity, no further.

## Architecture

### Repository layout

```
apps/ios/
├── Shelfie.xcworkspace
├── Shelfie/                      # app target: shell, tabs, routing, bootstrapping only
│   ├── Shelfie.xcodeproj
│   ├── Info.plist                # usage strings: microphone, speech, camera, photos
│   └── Shelfie.entitlements      # aps-environment, associated domains
├── Packages/
│   ├── Components/               # the sh-* catalogue in SwiftUI; depends on nothing else
│   ├── Core/                     # ApiClient, Session, OfflineQueue, Toasts, Banners, Tokens
│   ├── SignIn/ Shelf/ LogChapter/ Books/ Review/ Settings/
│   └── ...                       # one package per feature, same names as apps/web/projects
├── ShelfieUITests/
│   ├── Screens/                  # one screen object per screen (the page objects)
│   └── Tests/                    # acceptance tests, "Traces to: L2-xxx" header
└── test.sh                       # starts the API on a free port with a seeded database, runs xcodebuild test
```

Rules carried over from the web, unchanged in spirit:

- **Components package is mandatory.** Feature packages and the app compose it and define no reusable views of their own. The catalogue has the same names and states as `docs/screen-composition.md`; a screen uses exactly the components its entry lists.
- **Dependencies point one way.** App → feature packages → `Components` and `Core`. `Components` depends on nothing.
- **The app target is thin.** Tabs, navigation, deep links, bootstrap.
- **One view per folder, concerns apart.** A screen's view, its view model and its API mapping are separate files.
- **No third-party packages.** Foundation, SwiftUI, Observation, SwiftData, Speech, PDFKit/QuickLook, UserNotifications, Network. If something seems to need a dependency, stop and ask.

### Platform baseline

Mirror the "bleeding-edge Chrome only" rule: the newest major iOS only (27 at the time of writing), the current Xcode, Swift 6 language mode with strict concurrency, no availability checks for older releases. iPhone and iPad, portrait and landscape, light and dark, Dynamic Type, VoiceOver. The web's WCAG 2.2 AA target becomes the equivalent accessibility audit in Xcode's Accessibility Inspector.

### Core

- **`ApiClient`.** `URLSession` with a shared `HTTPCookieStorage`, base URL from the build configuration (local API in Debug, `https://shelfie.kids` in Release). Every request sends `X-Requested-With: Shelfie`, which is what `csrfGuard` checks; a native client sends no `Origin` and no `Sec-Fetch-Site`, so the guard passes without any API change. Problem-detail responses map to one `ApiError` type with the same `type` strings the web uses.
- **`Session`.** `GET /api/auth/session` at launch; the cookie's lifetime already encodes "stay signed in", so the app stores nothing in Keychain. Sign-out calls `POST /api/auth/sign-out` and clears cookies.
- **`OfflineQueue`.** The `work-offline` design, implemented natively: a SwiftData store of pending chapter logs keyed by book and chapter, `NWPathMonitor` for connectivity, replay in insertion order, 2xx or 409 counts as sent, anything else stops the replay and keeps order, the same toasts. The shelf is kept as the last successful JSON response on disk so it stays readable offline.
- **`DraftStore`.** Answers in progress, in SwiftData, same semantics as the web.
- **Toasts and banners.** One `ToastCenter` and one `BannerCenter`, rendered by the shell, same variants and copy as `docs/mocks/notifications`.
- **Tokens.** `Tokens.swift` generated from `docs/design-system/tokens.json` by a short script in `tools/`, committed, regenerated when the tokens change. No runtime parsing.

### Features that touch the platform

| Feature | Platform API | Notes |
|---|---|---|
| Voice answers | `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true`, `AVAudioEngine` | Keeps ADR-0010's promise: no audio leaves the device, Shelfie never receives it. Microphone and speech usage strings required. |
| Profile photo, book cover | `PhotosPicker`, `UIImagePickerController` for the camera | Downscale and strip metadata on device, then `PUT` the bytes; the API already re-encodes to WebP and drops metadata. |
| Certificate | `QLPreviewController` on the fetched PDF, share sheet for AirPrint | The route is a plain link with the book's access; the app fetches it with the session cookie. |
| Push | `UNUserNotificationCenter`, APNs device token | See backend changes. A tapped notification opens the page its `path` names. |
| Appearance | `preferredColorScheme` | From the session's `theme`. |
| Password reset, invite links | Universal links on `shelfie.kids` | `apple-app-site-association` served by Caddy; the API's e-mailed links are unchanged. |
| Haptics, celebrations | `UIImpactFeedbackGenerator`, SwiftUI animation | Where the mocks show a celebration. Small touches, not new features. |

### Backend changes

1. **Push through APNs (required).** ADR-0016 built Web Push with VAPID. A native app cannot subscribe to Web Push. Change, recorded in a new ADR:
   - `push_subscription` gains `kind` (`web` or `apns`, default `web`) and `device_token`; `endpoint` becomes nullable; a unique index on `(profile_id, device_token)` for `apns` rows.
   - `POST /api/push/subscriptions` accepts `{ kind: 'apns', token }` beside the existing body; `DELETE` accepts `{ token }`.
   - `notify()` fans out per row: `web-push` for `web`, an APNs HTTP/2 request with a token-based (`.p8`) key for `apns`. Either the `apns2` package or about sixty lines over Node's `http2` module; the ADR picks. A 410 (`Unregistered`) deletes the row, as a 404/410 does for Web Push.
   - New optional variables `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`. Unset means `push-off` for the app, exactly as unset VAPID keys mean for the web. `GET /api/push/key` is unchanged.
   - Payload stays a title, a body, a tag and a path, never answers or notes.
2. **API compatibility rule (required, no code).** A shipped app cannot be refreshed like a web page. Add to AGENTS.md: changes to `/api` routes used by the app are additive; a field is never removed or renamed and a status code never changes meaning without a new route. The app ignores unknown fields. No version header and no minimum-build gate until a breaking change is actually wanted (zero future-proofing).
3. **Universal links (small).** Serve `/.well-known/apple-app-site-association` from Caddy for `/reset-password` and `/accept-invite`.
4. **Household deletion (only for an App Store listing).** See below.

Everything else is served today: sign-in, shelf, books, chapters, questions, review, rewards, gallery, streak rewards, badges, certificates, photos, covers, lookup, feedback, settings, readers, invites.

## Tooling and CI

- **Development needs a Mac with Xcode.** Agent sessions on Linux can edit Swift and run `swift build` and `swift test` for the `Core` and feature packages if those packages keep SwiftUI out of their model and API layers (Foundation and `URLSession` exist on Linux). They cannot build the app target or run XCUITests. Plan for the ATDD loop on UI slices to run on the Mac or in CI.
- **`ci.yml` gains an `ios` job** on `macos-latest`: install PostgreSQL 16 with Homebrew, start the API from `apps/api` on a free port with a seeded database (the pattern `apps/admin-cli/test.sh` uses), then `xcodebuild test` against an iPhone and an iPad simulator. Simulator only, no device farm.
- **TestFlight uploads** by a `workflow_dispatch` job: archive, export with an App Store Connect API key kept in repository secrets, upload with `xcrun altool`. Not on every merge to `main`: TestFlight builds expire after 90 days and each upload is reviewed lightly, so upload when a phase lands.
- **Apple Developer Program** membership (US$99 a year) is a prerequisite for APNs and TestFlight. A free personal team can run the app on a plugged-in device for seven days at a time, which is enough for Phase 0 only.

## Acceptance tests

Same discipline as `e2e/`, translated:

- XCUITest, one screen object per screen in `ShelfieUITests/Screens`, owning identifiers and interactions. Tests state intent; screen objects know the view hierarchy. Never an accessibility identifier in a test.
- Every test file carries `// Traces to: L2-xxx`.
- Tests run against the real API with a seeded database, as the admin CLI tests do, not against mocks of the API. Offline tests use the simulator's network link conditioner through a launch argument that tells `OfflineQueue` to treat the network as down, the counterpart of Playwright's `context.setOffline`.
- Unit tests with Swift Testing only where a package has logic worth isolating (the replay rules of `OfflineQueue`, problem-detail mapping). No architecture tests.
- Each slice: Given-When-Then first, failing test second, production code third, exactly as AGENTS.md requires.

## Phases and slices

Effort is in days, in the convention of `docs/estimates/`. Each slice is one PR or a few, each with its acceptance tests.

### Phase 0: Decisions and foundations (6 days)

| Slice | Days |
|---|---|
| ADR: iOS app location and structure; AGENTS.md folder structure and API compatibility rule | 0.5 |
| Xcode workspace, app target, empty packages, `test.sh`, `ios` CI job | 1.5 |
| `Tokens.swift` generator and `Components` package: button, text field, card, chapter row, sticker, avatar, toast, banner, bottom sheet, progress, empty and error states, as `docs/screen-composition.md` names them | 3 |
| `Core`: `ApiClient`, `Session`, problem-detail mapping, toasts and banners wiring, first screen object | 1 |

### Phase 1: The reader's loop (22 days)

| Slice | Days |
|---|---|
| Sign in with username and password; stay signed in across launches; sign out | 2 |
| Shelf: current and finished books, progress, streak | 2.5 |
| Book page: chapters, status, pending state | 1.5 |
| Log a chapter with answers, drafts, undo window | 3 |
| Voice answers with on-device speech | 1.5 |
| View sent answers, sticker and note | 1 |
| Finished-book celebration; certificate in Quick Look with share and print | 2 |
| Badges and reward-goal progress on the shelf; goal picking and celebration | 2.5 |
| Streak path, milestones, earned and given streak rewards | 1.5 |
| Offline: cached shelf, banner, queued logs, replay, Offline screen | 2.5 |
| Send feedback sheet; appearance; own profile photo | 1.5 |
| Error states: forbidden, not found, server error, session expired | 0.5 |

After Phase 1 the reader can use the app for everything she does today, and the parent keeps using the web. This is a sensible place to pause and decide whether Phase 2 is wanted at all.

### Phase 2: The parent's side (20 days)

| Slice | Days |
|---|---|
| Review queue and review chapter: answers, sticker, note | 3 |
| AI review assistant draft | 1 |
| Give a reward; gallery reward ready-to-give; streak reward give | 1.5 |
| Books: add with title lookup, cover picker, cover upload, chapter count | 3.5 |
| Manage book, delete, questions, suggested questions | 3 |
| Reward gallery: rewards, pictures, featured picture | 2.5 |
| Streak rewards: set milestones and amounts | 1 |
| Settings: readers (add, edit, password), invite parent, own name and e-mail and password | 3 |
| Sign up, accept invite, reset password through universal links | 1.5 |

### Phase 3: Push through APNs (4 days)

| Slice | Days |
|---|---|
| ADR; migration; subscription body and table changes; `notify()` fan-out; unset keys mean `push-off` | 2 |
| App: permission flow, token registration and removal, notification tap opens the page, household event choices in settings (parent) | 2 |

### Phase 4: App Store readiness (3 days, plus prerequisites)

Only if a public listing is wanted. TestFlight needs none of this.

| Item | Days |
|---|---|
| **Prerequisite: in-app household deletion.** App Review guideline 5.1.1(v) requires account deletion inside any app that offers account creation. It is deferred on the web (the operator runs the one `DELETE` under "Erasing a household" in `docs/runbook.md`, L2-041). Build it once, for both front ends: an endpoint that runs the erasure, a confirmation flow in Settings. Alternatively hold sign-up out of the app and create households on the web only; the guideline then does not strictly apply, but reviewers sometimes ask anyway. | 3 (deletion feature) |
| Privacy nutrition labels (account data, user content, no tracking), age rating, Kids Category decision. The app is used by a child but is a family tool with a parent account; listing outside the Kids Category avoids its extra rules (parental gates, no third-party SDKs; Shelfie has none anyway). | 1 |
| Screenshots for iPhone and iPad, description, support URL (`SUPPORT.md` already exists), review notes with a demo household | 1.5 |
| Submission and one round of review | 0.5 |

Sign in with Apple is not required: guideline 4.8 applies only to apps that offer third-party or social login, and Shelfie offers username and password only.

### Total

| Phase | Days |
|---|---|
| 0 Foundations | 6 |
| 1 Reader | 22 |
| 2 Parent | 20 |
| 3 Push | 4 |
| 4 App Store readiness | 3 (+3 for household deletion) |
| **Total** | **55 (58 with deletion)** |

For scale, the whole web product, backend included, is estimated at 122 days in `docs/estimates/README.md`.

## Risks

- **A second front end to keep in step.** Every future feature costs its web effort plus roughly half again for iOS. The specs, mocks and composition document make that tractable, but it is a standing cost. The reader-first phasing limits it: if Phase 2 is never built, the parent side has one front end.
- **No Mac, no progress on UI slices.** Linux agent sessions can only build the SwiftUI-free packages. Budget the ATDD loop for UI slices on the Mac or on the macOS CI runner.
- **Apple account and review.** Membership fee, certificates and provisioning are a fixed overhead; review outcomes are outside the repository's control. TestFlight avoids most of it for the family.
- **Stale app, moving API.** Mitigated by the additive-only rule. The first time a breaking change is truly needed, add a minimum-build check then, not before.
- **Push payload and privacy.** Unchanged from ADR-0016: title, body, tag, path only. APNs sees the same as the browser push services do.

## Decisions needed before Phase 0

1. PWA, Capacitor, or native (this plan)?
2. Same repository under `apps/ios/`? (Recommended: yes.)
3. iOS only, reader first? (Recommended: yes.)
4. TestFlight for the family, with an App Store listing as a later decision? (Recommended: yes.)
5. Is there a Mac with the current Xcode available for development?

Once answered, Phase 0 begins with the ADR and the AGENTS.md changes.
