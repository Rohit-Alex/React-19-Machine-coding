# Cookie Consent Manager SDK (LLD)

> **The prompt:** "Build an in-browser Cookie Consent Manager: a global
> JavaScript service. It manages consent state, gets its categories from an
> external Configuration Service, and tells dependent services (Analytics,
> Marketing, Ad-Tracking) whenever the user's preferences change."
>
> This is an SDK design question, not a UI question. The banner is the easy
> part. The marks are for the **state model**, the **contract with
> consumers**, what happens **when things fail**, and **when to ask the user
> again**.

Runnable demo: [`index.tsx`](./index.tsx) · SDK core (no React):
[`consentManager.ts`](./consentManager.ts) · UI: [`ConsentView.tsx`](./ConsentView.tsx)

---

## 1. Clarify before you design

| Question | Why it changes the design |
| --- | --- |
| Opt-in (EU / GDPR) or opt-out (US / CCPA)? | Opt-in means **denied by default** until the user says yes. This design is opt-in; opt-out is just a different default (section 9). |
| Who decides the categories and the banner text? | The Configuration Service. The SDK must not hard-code categories (section 3). |
| What happens when the config changes? | A new category or new legal text means the old "yes" no longer counts — config **version** (section 5). |
| How long is a decision valid? | An expiry, usually 6–12 months (section 5). |
| How do vendor scripts find out? | A **register / callback** contract (section 6). |
| Is the SDK on every page, maybe loaded after other scripts? | Load order and a pre-init queue (section 8). |
| Must the server know the decision? | Then store it in a first-party **cookie**, not localStorage (section 7). |

Agreed scope: opt-in; categories from the config service; banner with Accept
all / Reject all / Customise; consumers told on every change of their answer;
decision saved for `expiryDays`; ask again on a new config version.

---

## 2. The pieces

```
 Configuration Service ──(fetch once, with timeout)──┐
                                                     ▼
 Storage (cookie) ◀──read / write──▶  ConsentManager  ──subscribe──▶ Banner UI (React)
                                     (one per page)
                                          │ register(consumer)
                       ┌──────────────────┼──────────────────┐
                       ▼                  ▼                  ▼
                   Analytics          Marketing          Ad-Tracking
                 needs analytics    needs marketing   needs marketing + advertising
```

| Piece | Job | Why it's separate |
| --- | --- | --- |
| `ConsentConfig` | Categories, version, expiry. From the server. | Legal text and categories change without a code release. |
| `ConsentRecord` | The saved decision: choices + the config version + when. | Without the version and time, you can't tell if a saved "yes" is still valid. |
| `ConsentStorage` | `read()` / `write()`. | Cookie in production, localStorage in the demo, a plain variable in tests. |
| `FetchConfig` | `(signal) => Promise<ConsentConfig>` | Real `fetch` in production, a fake in the demo and tests. |
| `Consumer` | `name`, `categories`, `onGrant`, `onRevoke`. | The contract every vendor script codes against. |
| `ConsentManager` | Holds the state. The only thing that changes it. | One source of truth for the banner **and** every consumer. |

The config fetcher and storage are **passed in** (dependency injection). The
manager never calls `fetch` or `document.cookie` for its record by itself.
That's why the whole core was tested in Node with no browser — and why the
demo can fake a slow or broken config service.

**No `Category` class, no `Banner` class in the core.** A category is data
from the config; the banner is just one subscriber. Saying what you *didn't*
model, and why, is a senior signal.

---

## 3. Public API

```ts
const consent = new ConsentManager({ fetchConfig, storage: cookieStorage() });

consent.init();                       // safe to call many times; fetches once
consent.acceptAll();
consent.rejectAll();
consent.save({ analytics: true });    // anything not listed → off
consent.has("marketing");             // sync check for one-off calls
const off = consent.register({ name, categories, onGrant, onRevoke });
consent.subscribe(listener);          // for UI (useSyncExternalStore)
consent.getSnapshot();                // { status, config, choices, needsDecision, error }
```

Small on purpose. Every write goes through `save` — `acceptAll` and
`rejectAll` are one-liners on top of it. One write path means one place for
the rules: required categories forced on, unknown category ids dropped,
record written, consumers told.

---

## 4. The state model

```
 idle ──init()──▶ loading ──config ok──▶ ready ──┬── needsDecision: true  → show banner
                     │                           └── needsDecision: false → banner hidden
                     └──fails / times out──▶ error  (init() again may retry)
```

`choices` is the only thing consumers care about, and the rule is simple:
**a category is on only if `choices[id] === true`.** Missing, `false`,
still loading, config broken — all mean "no".

Why deny by default: under opt-in law, firing an analytics script *before*
the user answers is already the violation. "We turned it off a second later"
doesn't help.

Analogy: a hotel minibar that's **locked** until you sign for it. Not open
until you complain.

**Fail closed.** If the config service is down or too slow (default timeout
5 s, using `AbortSignal.timeout`), the state is `error` and nothing optional
runs. No config means we don't even know which categories exist, so we can't
show a banner. The site still works — only tracking is lost. The opposite
failure (tracking without consent) is the one that gets fined.

The config comes over the network, so it's checked before use (`version` is
a number, `categories` is an array). A bad config is treated like a failed
fetch.

---

## 5. When does a saved decision still count?

On every page load the manager reads the saved record and checks it against
the fresh config. It counts only if **all** of these are true:

| Check | Fails when | Why |
| --- | --- | --- |
| `record.version === config.version` | Legal published a new config | The user agreed to the old text, not the new one. |
| `now - decidedAt < expiryDays` | Decision is too old | Regulators expect consent to be renewed. |
| Every non-required category has a `true`/`false` | A new category was added without a version bump | The user was never asked about it. Safety net for a forgotten bump. |
| The record parses and has the right shape | Someone edited the cookie | Storage is user-controlled input. Junk = "no decision". |

If any check fails: show the banner again, and **deny everything optional
until the user answers**. We don't keep the old answers in force meanwhile.
(A gentler option: keep old answers for categories that didn't change. More
code, more legal risk; ask the interviewer which they want.)

Analogy: a gym membership form. If the gym changes its terms, your old
signature doesn't cover the new terms — you sign again.

---

## 6. Telling consumers: the core of the question

This is the Observer pattern, with four rules that are easy to miss:

**1. Tell a consumer only when *its* answer changes.** The manager remembers,
per consumer, whether it was granted last time. Saving "analytics on" again
does **not** call Analytics' `onGrant` again. Without this, the analytics
script would load twice and count every page view twice. (Checked: two
identical saves → one call.)

**2. A late consumer is told right away.** If the Marketing script registers
after the user already said yes (it loaded lazily, or on a later page),
`register` calls `onGrant` at once. Otherwise scripts that load late never
start. Analogy: someone joining a meeting late gets told the decisions
already made, not just the ones made after they walked in.

**3. A consumer can need several categories — it needs all of them.**
Ad-Tracking needs `marketing` **and** `advertising`. One of them off → it's
off. (In the demo: turn off Advertising alone, Ad-Tracking stops, Marketing
keeps running.)

**4. One broken consumer can't stop the rest.** Each callback runs in its
own `try/catch`. A vendor script throwing in `onGrant` is logged, and the
other consumers are still told. That consumer is still marked as granted, so
it **does** get `onRevoke` later — it may have half-started, and telling it
to stop is the safe move. (Checked.)

Also: the manager records the new answer **before** calling the callback. A
consumer that calls `save()` from inside its own callback then can't cause
an endless loop.

### Cleaning up on revoke

Stopping the script isn't enough: its cookies are still on the user's
device. Each category in the config lists its cookie names
(`cookies: ["_ga", "_gid"]`). On every state change, the manager deletes the
cookies of **every denied category**. One rule covers revoke, reject, and an
expired decision.

Limit: JavaScript can only delete cookies on the site's own domain, and not
`HttpOnly` ones. Third-party cookies (on the ad network's domain) can't be
removed from the page — that's why the scripts must not load in the first
place.

---

## 7. Where the decision is stored

`cookieStorage()` writes a first-party cookie (`SameSite=Lax; Secure`,
`max-age` = expiry):

- **The server can read it.** It can leave tracking tags out of the HTML
  for users who said no, instead of sending them and hoping the client
  blocks them. localStorage is invisible to the server.
- **It works across subdomains** if you set `domain=.example.com`;
  localStorage is per origin.
- The record has its own `decidedAt`, so expiry doesn't depend on the
  browser honouring `max-age`.

The demo uses localStorage only so "Reload page" can read the decision back
without real page reloads.

---

## 8. Shipping it as a global SDK

Vendor scripts on the page may run **before** the SDK has loaded. The
standard fix (Google's `gtag`, Segment and others use it) is a tiny inline
stub that queues calls, and the real SDK replays them on load:

```html
<script>
  window.consentQ = window.consentQ || [];
  window.Consent = window.Consent || { register: (c) => window.consentQ.push(c) };
</script>
<script async src="/consent-sdk.js"></script>
```

```ts
// inside consent-sdk.js
const manager = new ConsentManager({ fetchConfig, storage: cookieStorage() });
(window.consentQ ?? []).forEach((c) => manager.register(c));   // replay early calls
window.Consent = manager;                                       // later calls go direct
manager.init();
```

Other SDK rules worth saying out loud:

- **One instance per page.** Two managers would disagree about the state.
- **No dependencies, small bundle.** It loads on every page, first.
- **Never throw into the host page.** Errors become `status: "error"` or a
  logged consumer error, never an uncaught exception.
- **Version the consumer contract.** Vendors code against
  `register / onGrant / onRevoke`; changing it breaks them silently.

---

## 9. The React layer

The banner is just another subscriber:
`useSyncExternalStore(manager.subscribe, manager.getSnapshot)`. The snapshot
is a **new object on every change** (React compares by reference), and the
same object otherwise, so React doesn't loop. Same pattern as the
[ParkingLot](../ParkingLot/ParkingLot.md) and
[FormLibrary](../FormLibrary/FormLibrary.md) stores.

UI rules that are really legal rules:

- **Reject all is as easy as Accept all** — same level, same size. A hidden
  reject button is a "dark pattern", and EU regulators fine for it.
- **No boxes pre-ticked** in Customise (except required ones, shown disabled).
- **A way back in.** "Cookie settings" must be reachable after deciding;
  withdrawing must be as easy as giving consent.
- The banner is a labelled `region`, the preferences a labelled `dialog`, and
  focus moves into the preferences when they open.

---

## 10. Edge cases

| Case | Behaviour |
| --- | --- |
| Consumer registers before `init()` | Waits, denied; told once the user says yes. |
| Consumer registers after consent given | `onGrant` right away. |
| `init()` called by five scripts | One fetch; all get the same promise. |
| Config service down / slow | `error`, everything optional off, no banner; `init()` again retries. |
| Config response malformed | Same as down. |
| `save()` before config loaded | Ignored — there's nothing to agree to yet. |
| Same choices saved twice | Consumers not called again. |
| Unknown category in `save()` | Dropped. |
| Required category set to `false` | Forced back to `true`. |
| Saved cookie edited to junk | Treated as no decision → banner. |
| Config version bumped | Banner again; optional off until answered. |
| Decision older than `expiryDays` | Banner again. |
| Consumer throws | Logged; others still told; it still gets `onRevoke` later. |

All of the model rows were checked in Node with a scratch assertion script
(not committed — the demo is the repo's check).

---

## 11. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "User changes consent in another tab." | `BroadcastChannel("consent")`: post after `save`, and on message re-read storage and update state. Cookies have no change event, so the channel is needed. |
| "Respect Global Privacy Control." | If `navigator.globalPrivacyControl` is true, treat `advertising`/sale-of-data categories as denied by default and don't pre-offer them. Required by law in some US states. |
| "Prove consent to an auditor." | After `save`, `POST` the record (anonymous id, version, choices, time) to a consent-log API. Use `navigator.sendBeacon` so it survives the page closing. |
| "Opt-out regions (US)." | Config carries `defaultOn` per category per region. Same manager; only the default for "no decision" changes. |
| "Config service is slow for returning users." | Cache the last config with the record. Use it at once if its version matches, refresh in the background. |
| "Google Consent Mode / IAB TCF." | A built-in consumer that maps our categories to `gtag('consent', 'update', …)` or builds a TCF string. It's just another `register` call. |
| "Block scripts that ignore the SDK." | Render third-party tags as `<script type="text/plain" data-category="marketing">`; a built-in consumer swaps them to real scripts on grant. |
| "Server-side rendering." | Server reads the consent cookie and leaves denied tags out of the HTML. The client SDK still runs for the banner and changes. |

---

## 12. Scoring notes

- **Mid:** a banner component with `useState`, consent in localStorage as
  `accepted: true`, vendor scripts check it once on load; categories
  hard-coded; nothing happens on revoke; no idea what a config change means.
- **Senior:** a framework-free core with injected config fetcher and storage;
  deny by default and fail closed; a saved record with version + timestamp
  and clear rules for when to ask again; a consumer contract that's
  edge-triggered, replays to late joiners, needs all its categories, and
  isolates errors; cookies cleaned on revoke; a stub-and-queue story for
  load order; and the legal UI rules (equal reject, no pre-ticked boxes,
  easy withdrawal) named as requirements, not polish.
