# Debounced search box (with cancellation of stale requests)

> **The prompt, as it's usually asked:** "Build a search box that calls an API
> as the user types. Don't fire a request on every keystroke."
>
> The second sentence is the trap. It points you at debouncing, and debouncing
> is the easy half. The half that separates a mid-level answer from a senior
> one is what happens to the requests that *do* get sent.

Runnable demo: [`DebouncedSearch.tsx`](./DebouncedSearch.tsx) · hook:
[`useSearch.ts`](./useSearch.ts) · mock backend: [`searchApi.ts`](./searchApi.ts)

---

## 1. Clarify before you code

Interviewers score this. Spending 60 seconds here reads as senior; diving
straight into `setTimeout` reads as junior. The questions worth asking:

| Question | Why it changes your code |
| --- | --- |
| Is there a minimum query length? | Saves a pile of useless requests for one-character queries. |
| Should an empty input clear results, or keep the last ones? | Decides whether you reset state or leave it. |
| Do we need to cache repeat queries? | Changes the whole data layer. Usually "not now". |
| Is this a plain results list, or a dropdown with keyboard navigation? | A combobox is a much bigger a11y job — that's the typeahead question, not this one. |
| Can the backend return results out of order? | It always can. Ask anyway — it shows you're thinking about it. |

For this build I assumed: search on every non-empty trimmed query, clear on
empty, no cache, plain results list.

---

## 2. Requirements

- Don't fire a request per keystroke.
- Never show results that belong to a query the user has moved on from.
- Handle loading, error, empty-input, and no-results states distinctly.
- Cancel in-flight work when the component unmounts.
- The input must be labelled and status changes must be announced.

---

## 3. The naive version, and why it's wrong

```tsx
// Don't ship this.
const [query, setQuery] = useState("");
const [results, setResults] = useState([]);

useEffect(() => {
  const id = setTimeout(() => {
    fetch(`/search?q=${query}`)
      .then((r) => r.json())
      .then(setResults);
  }, 300);
  return () => clearTimeout(id);
}, [query]);
```

This *does* debounce correctly — the cleanup clears the pending timer, so only
the last keystroke in a burst survives. That part is fine.

The bug is what happens after the timer fires. Once `fetch` is in flight,
nothing stops it. Type `rea`, pause for 350ms (a request goes out), then
type `ct`. Now two requests are racing, and **you get whichever one the
network hands back last, not whichever one is correct.**

### Why debouncing does not fix this

The instinct is "I'll just raise the delay to 500ms." That reduces how often
the race happens. It does not remove it — and it makes the box feel sluggish
on every single search to paper over a bug that happens on some of them.

An analogy: debouncing is deciding to send fewer letters. It says nothing
about the order the post office delivers them in. If you send letter A on
Monday and letter B on Tuesday, and A goes missing in a sorting office for a
week, your reader ends up with A as the latest word. Sending fewer letters
never fixed that; you need a rule that says *ignore anything that arrives out
of date*.

This is why the demo makes short queries slower than long ones. It's not a
contrivance — a broader query really does scan more rows — and it makes the
race fire every time instead of once in a hundred runs. Untick **cancel stale
requests** in the demo and type `react` quickly to watch it happen.

---

## 4. The fix

Two mechanisms, and a senior answer names both:

**`AbortController`** — the primary fix. The effect's cleanup aborts the
previous request before the next one starts. The browser drops the connection,
so the work is genuinely cancelled rather than just ignored. Free bandwidth
saving too.

**A liveness flag** — the belt-and-braces. A boolean the cleanup flips, checked
before any `setState`:

```ts
let isCurrent = true;
// ...
return () => { isCurrent = false; controller.abort(); };
```

With `fetch` this is almost redundant, because aborting makes the promise
reject instead of resolve. You still want it, for two reasons:

1. Not every async source is abortable. A third-party SDK call, an IndexedDB
   read, or a `setTimeout`-based mock has no signal to cancel. The flag works
   for all of them.
2. It's the piece that generalises. If the interviewer swaps `fetch` for
   something else mid-interview, your code already survives.

The full implementation lives in [`useSearch.ts`](./useSearch.ts). Note that
the `AbortError` is swallowed deliberately — an aborted request is expected
control flow, not a failure to show the user.

### The other well-known variant

If you can't abort, track a request id instead of a boolean:

```ts
const latest = useRef(0);
const id = ++latest.current;
const data = await search(query);
if (id !== latest.current) return; // a newer request has started
```

Same idea, different bookkeeping. Either answer is fine; being unable to
produce *either* is what gets flagged.

---

## 5. Why debounce the value, not the handler

```tsx
const debouncedQuery = useDebounce(query, 350); // do this
```

The alternative is wrapping the change handler in a debounced function. That
works, but it drags in a problem: the debounced function has to keep a stable
identity across renders, or every render creates a fresh one with a fresh
timer and the debouncing silently stops working. You end up needing
`useMemo` + a ref for the latest callback — see
[`useDebouncedCallback.ts`](../../Hooks/useDebounce/useDebouncedCallback.ts)
for how much machinery that takes.

Debouncing the *value* sidesteps all of it. `query` stays the immediate source
of truth for the input (so typing never feels laggy), and `debouncedQuery`
becomes the thing your effect depends on. This build reuses the repo's
existing [`useDebounce`](../../Hooks/useDebounce/useDebounce.ts) rather than
writing a third copy.

---

## 6. Accessibility

The bits an interviewer actually looks for:

- A real `<label>` tied to the input with `htmlFor` / `id`. `useId` gives you a
  collision-free id that's also SSR-safe.
- `aria-live="polite"` on the status line, so a screen reader announces "4
  results for react" without the user having to go hunting.
- `type="search"` and `autoComplete="off"` so the browser's own history
  dropdown doesn't fight your results.

Full combobox semantics (`role="combobox"`, `aria-activedescendant`, arrow-key
navigation) are deliberately out of scope — that's the autocomplete/typeahead
question. Say that out loud in the interview rather than silently skipping it.

---

## 7. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Debounce or throttle here?" | Debounce. You want the pause *after* typing stops. Throttle is for continuous streams like scroll, where you want steady updates during the event, not one at the end. |
| "What if the user pastes a long string?" | One change event, one request. Debouncing handles it for free. |
| "How would you cache?" | A `Map<query, results>`. Check it before firing, and render the cached value instantly. Mention stale-while-revalidate, then say this is the point where you'd reach for TanStack Query instead of hand-rolling. |
| "What about the back button / shareable URLs?" | Put the query in the URL search params and read it back as initial state. |
| "Where would `useDeferredValue` fit?" | On the *rendering* side, not the network side. It helps when re-rendering a huge result list blocks typing. It does nothing about request count or ordering — it's not a debounce replacement, and saying so is the point. |
| "How do you test this?" | Fake timers to drive the debounce, a mocked fetch that resolves out of order, and assert the older response never reaches the DOM. |
| "What breaks at scale?" | Every keystroke burst still costs a request per user. Server-side you'd want a minimum query length, rate limiting, and a cache in front of the search index. |

---

## 8. Scoring notes

What tends to separate the bands on this question:

- **Mid:** debounces correctly, renders results, handles loading. Misses the
  race entirely, or "fixes" it by raising the delay.
- **Senior:** names the race unprompted, cancels with `AbortController`, keeps
  a liveness check for non-abortable sources, distinguishes empty-input from
  no-results, and scopes the a11y work honestly instead of hand-waving it.
