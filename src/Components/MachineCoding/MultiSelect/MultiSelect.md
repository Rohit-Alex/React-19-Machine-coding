# Multi-select dropdown with search and keyboard navigation

> **The prompt:** "Build a multi-select: type to filter, pick several options,
> show them as removable chips, and make it work from the keyboard."
>
> If you've built the [Typeahead](../Typeahead/Typeahead.md), most of this is
> already done. The question is what changes when picking doesn't end the
> interaction: the list stays open, `aria-selected` changes meaning, and the
> chips need their own keyboard story.

Runnable demo: [`index.tsx`](./index.tsx) · component:
[`MultiSelect.tsx`](./MultiSelect.tsx) · shared keyboard logic:
[`useCombobox.ts`](../Typeahead/useCombobox.ts)

---

## 1. Clarify before you code

| Question | Why it changes your code |
| --- | --- |
| Does the list stay open after a pick? | Usually yes for multi-select (`closeOnSelect: false`). |
| Does the search text clear after a pick? | Keeping it lets you pick several matches for "re"; clearing suits picking one at a time. Kept here. |
| Selected options: hidden from the list, or shown ticked? | Ticked keeps positions stable and lets you untick from the list. |
| A maximum number of picks? | Disable unselected options once reached, and say why. |
| Options from a server? | Debounce + cancel as in [DebouncedSearch](../DebouncedSearch/DebouncedSearch.md); keep selected items' data locally, since they may not be in the current results. |
| Can users create new options ("Add 'GraphQL'")? | An extra "create" option at the end of the list. |

---

## 2. Reusing `useCombobox`

The Typeahead's hook already does open/close, the highlighted index, arrow
keys, Home/End, Enter, Escape (close, then clear), Tab, IME composition and
scrolling the highlight into view. Multi-select needed **one** new option:

```ts
useCombobox({ items: options, onSelect: toggle, onClear, closeOnSelect: false });
```

`onSelect` becomes `toggle` — Enter on a ticked option unticks it.

**Memoise the filtered list.** The hook resets the highlight whenever `items`
changes (a new result set makes the old index meaningless). Filtering
inline makes a new array every render, so the highlight would reset on every
re-render — including the one caused by ticking an option. `useMemo` on
`query` keeps the same array until the text changes.

---

## 3. `aria-selected` means "picked" here

```tsx
<ul role="listbox" aria-multiselectable="true">
  <li role="option" aria-selected={isSelected}>
```

In the single-select Typeahead, `aria-selected` marked the highlighted option.
In a multi-select listbox it means **chosen**, and the highlight is only
`aria-activedescendant` plus styling. Mixing them up makes a screen reader say
"selected" while moving over options you haven't picked.

The tick is `aria-hidden` — `aria-selected` already says it.

---

## 4. Chips

- **Each chip is a `<button>` with `aria-label="Remove React"`.** Tab reaches
  every chip; Enter or Space removes it. A `✕` icon alone would be read as
  "multiplication sign".
- **Backspace on an empty input removes the last chip** — the habit everyone
  has from email "To" fields. Only when the input is empty, or Backspace
  would also delete letters.
- **Selection order is kept** (an array of ids, not a Set, and not filtered
  from the catalog), so chips stay in the order they were picked.
- **A polite live region** says "React added. 3 selected." — the list and
  chips change silently otherwise.

---

## 5. Pitfalls

1. **Closing on every pick.** Picking five options means opening the list five
   times.
2. **`aria-selected` for the highlight** (section 3).
3. **Unmemoised options** (section 2) — the highlight jumps back to nothing
   after each Enter.
4. **Click on an option blurs the input first**, closing the list before the
   click lands. `onPointerDown` → `preventDefault()` on options keeps focus in
   the input (same fix as the Typeahead).
5. **Storing whole objects from search results** when options come from a
   server: a later search may not include them, and chips break. Store ids
   plus the data you need to show.
6. **`display: contents` on the chip list** to make the layout easier — some
   browsers drop the element's list role from the accessibility tree.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "Native option?" | `<select multiple>` works with keyboard and screen readers, but no search, no chips, and Ctrl/⌘+click to pick several is unknown to most users. Fine for admin tools. |
| "Select all matching." | Add the filtered ids not already selected; the live region says how many were added. |
| "Thousands of options." | Virtualise the listbox ([VirtualList](../VirtualList/VirtualList.md)); `aria-setsize`/`aria-posinset` on options so position is still announced. `aria-activedescendant` must point at a rendered option, so keep the highlighted one mounted. |
| "Use it in a form." | Hidden inputs, one per selected id with the same `name`, so `FormData` gets them all. |
| "Grouped options." | See [GroupedAutocomplete](../GroupedAutocomplete/GroupedAutocomplete.md) — a flat list for keys, groups only when drawing. |
| "Max 3 picks." | `aria-disabled` on unselected options once full, and a visible "Up to 3" hint. |

---

## 7. Scoring notes

- **Mid:** a dropdown of checkboxes with a filter box; mouse-friendly, keyboard
  partial, chips that are spans.
- **Senior:** reuses a combobox core with a `closeOnSelect` switch, memoised
  options, `aria-multiselectable` and correct `aria-selected`, chips as
  labelled buttons, Backspace removal, ordered selection, live announcements,
  and a plan for server data and large lists.
