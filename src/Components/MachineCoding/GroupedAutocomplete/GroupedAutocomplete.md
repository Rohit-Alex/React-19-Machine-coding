# Autocomplete with grouped options and keyboard navigation

> **The prompt:** "Build an autocomplete whose suggestions are grouped under
> headings (like 'Recent', 'People', 'Files'). Arrow keys should move through
> the options."
>
> The trap is the keyboard. With nested groups, people write "if at the end
> of a group, jump to the first option of the next group, skipping the
> header" — and get it wrong at the edges. The fix is to not have nesting
> where the keyboard can see it.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`GroupedAutocomplete.tsx`](./GroupedAutocomplete.tsx) · shared keyboard logic:
[`useCombobox.ts`](../Typeahead/useCombobox.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Where do groups come from — a field on each item, or separate searches (people, files)? | A field: group on the client. Separate sources: one request per group, each with its own loading state. |
| Group order fixed, alphabetical, or by best match? | Decides how you sort `groups`, and so the order of `flat`. |
| Does typing a group's name match the group? | Here yes: "state" shows the whole State group. |
| Limit per group ("show 3, then 'See all'")? | Slice per group; "See all" is an option in the list too. |
| Empty groups? | Never render a header with no options under it. |

---

## 2. Two shapes of the same data

```ts
groups = [["Build tool", [Vite, Rollup, …]], ["State", [Zustand, Jotai, …]]]   // for drawing
flat   = [Vite, Rollup, …, Zustand, Jotai, …]                                   // for the keyboard
```

- `useCombobox` gets **`flat`**. Arrow Down from the last "Build tool" option
  goes to index + 1, which is the first "Data fetching" option. Headers
  aren't in `flat`, so they're skipped without a single `if`. Wrapping,
  Home and End also just work.
- Rendering walks **`groups`**, with a running counter so each option knows
  its index in `flat` (that index is its id and its highlight check).
- **Build `flat` from the sorted `groups`.** If you sort the groups but build
  `flat` from the unsorted matches, index 0 is not the first option on screen,
  and Arrow Down highlights something halfway down the list.

Analogy: a book with chapters. You read page after page; you don't stop at
each chapter title and decide where to go next. The chapters are only there
when you look at the contents.

This is the whole Typeahead hook, reused unchanged — the grouping lives
entirely in how options are drawn.

---

## 3. ARIA for groups

```html
<div role="listbox">
  <div role="group" aria-labelledby="g0">
    <div role="presentation" id="g0">Build tool</div>
    <div role="option" id="opt-0" aria-selected="true">Vite</div>
    …
```

- **`role="group"` labelled by its heading** — screen readers announce
  "Build tool, group" when the highlight moves into it, so the user knows the
  context without the heading being an option.
- **The heading is not an option.** Making it one means arrow keys land on it
  and Enter "selects" a heading.
- **Highlight via `aria-activedescendant`** on the input; focus never moves
  into the list (same model as the [Typeahead](../Typeahead/Typeahead.md)).
- **One polite status:** "6 results in 3 groups", or "No matches".

---

## 4. Details that get noticed

- **Matched text in `<mark>`.** Shows *why* each option matched — useful when
  the match is in the group name, not the option.
- **Sticky group headers** (`position: sticky; top: 0`) inside the scrolling
  list, so you can see which group you're in while scrolling a long one.
- **`Map.groupBy`** does the grouping in one line, but it's ES2024; this project
  targets ES2023, so a three-line loop does it instead. Worth knowing both.
- **Memoise `groups` and `flat` together** on the query, for the same reason as
  in the [MultiSelect](../MultiSelect/MultiSelect.md#2-reusing-usecombobox):
  the hook resets the highlight when `items` changes.

---

## 5. Pitfalls

1. **Group-aware arrow-key code** — off-by-one at group edges, wrapping from
   the last group to the first gets forgotten.
2. **`flat` order not matching screen order** (section 2).
3. **Headers as options**, or headers rendered with no options below them.
4. **Index-based ids reset per group** (`option-0` in every group) — duplicate
   ids, and `aria-activedescendant` points at the wrong one. Use the flat index.
5. **`<optgroup>` envy**: a native `<select>` with `<optgroup>` gets grouping
   and keyboard for free — but no typing to filter. If you don't need search,
   use it.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Groups come from different APIs (people, files, commands)." | One request per source in parallel; render each group as it arrives with its own "Loading…" row. Keep group order fixed so results don't jump around. Cancel stale requests ([DebouncedSearch](../DebouncedSearch/DebouncedSearch.md)). |
| "Show 3 per group with 'See all'." | Slice each group; add a "See all 12 in State" option at the end of the group — it's a real option, so it's in `flat`. |
| "Recent searches as the first group." | Stored in `localStorage`, shown as a "Recent" group when the input is empty. |
| "Rank by best match, not alphabetically." | Score each option (starts-with beats contains; name beats group name); order groups by their best option's score. |
| "Command palette (⌘K)." | Same component in a [Modal](../Modal/Modal.md), with options that run actions instead of filling the input. |
| "Fuzzy matching." | A library like Fuse.js, or subsequence matching; `<mark>` then highlights several fragments. |

---

## 7. Scoring notes

- **Mid:** grouped rendering works; arrow keys either ignore groups or need
  special cases that break at edges.
- **Senior:** one flat list for the keyboard, groups only for drawing, built in
  the same order; reuses the combobox core unchanged; `role="group"` with
  labelled headers that aren't options; flat-index ids; highlighted matches;
  sticky headers; a plan for multi-source groups.
