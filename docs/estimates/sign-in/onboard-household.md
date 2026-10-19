# Estimate — Onboard a household

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through page objects (Chromium only) and review fixes. They exclude the requirements, mocks, design system and design already done. `ApiClient`, `SessionService`, `sh-text-field`, `sh-button`, `sh-banner`, `sh-celebration`, `sh-error-state`, `POST /api/readers` and `POST /api/gallery-rewards` are present and reused. [Detailed design](../../detailed-designs/sign-in/onboard-household/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Migration `011-onboarding.sql`, `onboarded` in the session row, `createSession` and `signUp`; `POST /api/settings/onboarded`; API tests | 4 |
| `sh-step-indicator` in the `components` library; `sh-auth-layout` moved there and the five auth pages re-pointed | 3 |
| `onboarding` library: workspace project, routes, `OnboardingApi`, `OnboardingPage` with the five steps and the step layout | 8 |
| Sign-up, sign-in and `signedOutGuard` routing on `onboarded` | 1 |
| Name and sign-in steps: validation, prefill, colour, taken, submitting, failed | 4 |
| Reward step: examples, Add another, Next, validation, failed | 3 |
| All set, Skip and finish; the resume rules and the error state | 4 |
| Illustrations copied into the library's assets and served | 1 |
| Playwright: `OnboardingPage` page object, `onboard-household.spec.ts`, sign-up spec landing change | 6 |
| **Total** | **34** |

## Minimal scope

The flag, the session field, the finish route and a wizard of three steps (welcome, child's sign-in with the name on the same step, All set), without the reward step, Back or the resume rules. It satisfies `L2-137`, `L2-138`, `L2-140` and `L2-142`, and defers `L2-139`, `L2-141` and `L2-143`. It costs 22 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the reward step; Settings adds rewards | `L2-141` | 3 |
| Drop the resume rules; a reload always restarts at the welcome | `L2-143` | 3 |
| Drop the example chips | `L2-141` criterion 2 | 1 |
| Drop the sign-in routing; only sign-up opens the wizard | `L2-137` criterion 4 | 1 |
