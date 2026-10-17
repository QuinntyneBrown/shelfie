# Shelfie mocks

Static HTML mocks for every page, dialog and notification, in every state. Open [index.html](index.html) locally to browse them.

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
