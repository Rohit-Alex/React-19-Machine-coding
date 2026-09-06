# React Machine Coding — Interview Prep Roadmap

A phase-by-phase plan to rebuild this repo into a senior-level (5+ YOE) React
machine-coding interview prep reference, covering what's actually being asked
at product companies and startups right now.

Every topic gets two artifacts once done:

- **`<Topic>.md`** — concepts, when to use it, rules, edge cases/caveats (sourced from official docs where applicable, verified against React 19).
- **`<Topic>/` example folder** — one small runnable component per scenario, wired into `App.tsx`.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 1 — Hooks Deep Dive

Built-in hooks, one at a time, in rough order of interview frequency.

- [x] `useMemo` — [notes](src/Components/Hooks/useMemo/useMemo.md)
- [x] `useCallback` — [notes](src/Components/Hooks/useCallback/useCallback.md)
- [x] `useState` (incl. lazy init, functional updates, batching) — [notes](src/Components/Hooks/useState/useState.md)
- [x] `useEffect` (incl. cleanup, dependency pitfalls, StrictMode double-invoke) — [notes](src/Components/Hooks/useEffect/useEffect.md)
- [x] `useLayoutEffect` (vs `useEffect`, when it's actually needed) — [notes](src/Components/Hooks/useLayoutEffect/useLayoutEffect.md)
- [x] `useRef` (mutable refs, DOM refs, ref as instance variable, avoiding re-renders) — [notes](src/Components/Hooks/useRef/useRef.md)
- [x] `useReducer` (vs `useState`, complex state transitions) — [notes](src/Components/Hooks/useReducer/useReducer.md)
- [x] `useContext` (avoiding prop drilling, re-render implications, splitting contexts) — [notes](src/Components/Hooks/useContext/useContext.md)
- [x] `useTransition` (React 19, concurrent UI, isPending) — [notes](src/Components/Hooks/useTransition/useTransition.md)
- [x] `useDeferredValue` (React 19, deferring expensive re-renders) — [notes](src/Components/Hooks/useDeferredValue/useDeferredValue.md)
- [x] `useId` (accessible unique ids, SSR-safe) — [notes](src/Components/Hooks/useId/useId.md)
- [x] `useSyncExternalStore` (subscribing to external stores correctly) — [notes](src/Components/Hooks/useSyncExternalStore/useSyncExternalStore.md)
- [x] `useImperativeHandle` + `forwardRef`/`ref` as prop (React 19 no longer needs `forwardRef`) — [notes](src/Components/Hooks/useImperativeHandle/useImperativeHandle.md)
- [x] `use` (React 19 — reading promises/context conditionally) — [notes](src/Components/Hooks/use/use.md)
- [x] `useActionState` (React 19 — form actions, pending/error state) — [notes](src/Components/Hooks/useActionState/useActionState.md)
- [x] `useOptimistic` (React 19 — optimistic UI updates) — [notes](src/Components/Hooks/useOptimistic/useOptimistic.md)
- [x] `useDebugValue` (custom hook debugging in DevTools) — [notes](src/Components/Hooks/useDebugValue/useDebugValue.md)
- Custom hooks roundup:
  - [x] [`useDebounce`](src/Components/Hooks/useDebounce/useDebounce.ts)
  - [x] [`useThrottle`](src/Components/Hooks/useThrottle/useThrottle.ts)
  - [x] [`usePrevious`](src/Components/Hooks/usePrevious/usePrevious.ts)
  - [x] [`useOnClickOutside`](src/Components/Hooks/useOnClickOutside/useOnClickOutside.ts)
  - [x] [`useLocalStorage`](src/Components/Hooks/useLocalStorage/useLocalStorage.ts)
  - [x] [`useFetch`](src/Components/Hooks/useFetch/useFetch.ts)
  - [x] [`useWindowSize`](src/Components/Hooks/useWindowSize/useWindowSize.ts)
  - [x] [`useIntersectionObserver`](src/Components/Hooks/useIntersectionObserver/useIntersectionObserver.ts)
  - [x] [`useEventListener`](src/Components/Hooks/useEventListener/useEventListener.ts)
  - [x] [`useLazyLoadOnScreenView`](src/Components/Hooks/useLazyLoadOnScreenView/useLazyLoadOnScreenView.ts)

## Phase 2 — Classic Machine Coding Build Questions

The "build this component in 45–60 minutes" questions asked across FAANG,
fintech (Razorpay/Paytm/Groww), and product startups (Swiggy/Flipkart/Atlassian/etc).

- [ ] Debounced search box (with cancellation of stale requests)
- [ ] Throttled scroll/resize handler
- [ ] Autocomplete / typeahead with keyboard navigation
- [ ] Infinite scroll list
- [ ] Windowed / virtualized list (build a mini version, then compare to `react-window`)
- [ ] Pagination (client-side and server-side)
- [ ] Nested comments / threaded replies (recursive rendering)
- [ ] Accordion (single-open and multi-open variants)
- [ ] Tabs component (controlled + uncontrolled)
- [ ] Modal / Dialog via `createPortal` (focus trap, escape-to-close, scroll lock)
- [ ] Toast / notification system (queue, auto-dismiss, portal)
- [ ] Star rating component
- [ ] OTP input (auto-advance, paste support)
- [ ] Multi-step form / wizard with validation
- [ ] File upload with progress bar
- [ ] Drag-and-drop list (reordering) / Kanban board
- [ ] Image carousel / slider
- [ ] Tic-tac-toe / game-state style state machine
- [ ] Todo app with undo/redo (command pattern / history stack)
- [ ] Chat UI with polling or WebSocket updates
- [ ] Grid/spreadsheet-style editable table with keyboard nav

## Phase 3 — State Management & Data Fetching

- [ ] Context + `useReducer` as a mini global store
- [ ] Building a minimal client cache (stale-while-revalidate concept) from scratch
- [ ] Race conditions in data fetching & request cancellation (`AbortController`)
- [ ] Optimistic updates (manual, then via `useOptimistic`)
- [ ] Polling vs WebSockets vs SSE — tradeoffs and a small implementation of each
- [ ] Where TanStack Query / SWR fit in vs hand-rolled hooks (concepts, not necessarily installed)

## Phase 4 — Performance Optimization

- [ ] `memo`, `useMemo`, `useCallback` — when they actually help vs cargo-culting
- [ ] Diagnosing unnecessary re-renders with React DevTools Profiler
- [ ] Code splitting & lazy loading (`React.lazy`, `Suspense`)
- [ ] List virtualization deep dive
- [ ] Avoiding prop-drilling-induced re-renders (context splitting, composition)
- [ ] React Compiler — what it auto-memoizes and what it doesn't change

## Phase 5 — Advanced Component Patterns

- [ ] Compound components (`Tabs.Root`, `Tabs.List`, `Tabs.Panel` style APIs)
- [ ] Render props vs custom hooks (why hooks mostly won)
- [ ] Higher-order components (still asked in legacy codebases)
- [ ] Controlled vs uncontrolled components
- [ ] Portals beyond modals (tooltips, dropdowns)
- [ ] Error boundaries (class-based today; note on the upcoming `ErrorBoundary` primitives)
- [ ] `Suspense` for data fetching, not just lazy loading
- [ ] Polymorphic components (`as` prop) in TypeScript

## Phase 6 — TypeScript with React

- [ ] Typing props: unions, discriminated unions, generics in components
- [ ] Typing custom hooks (generic return tuples, overloads)
- [ ] Typing event handlers and refs correctly
- [ ] `satisfies`, utility types (`ComponentProps`, `PropsWithChildren`) in real components

## Phase 7 — Testing

- [ ] React Testing Library fundamentals (query priority, user-event)
- [ ] Testing hooks in isolation
- [ ] Mocking timers (debounce/throttle), fetch, and IntersectionObserver

---

## Your Questions

Add anything you've personally been asked or want covered — I'll fold these
into the right phase above.

- [ ] Currying with placeholder
- [ ] Abort controller
