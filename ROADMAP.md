# React Machine Coding — Interview Prep Roadmap

A phase-by-phase plan to rebuild this repo into a senior-level (5+ YOE) React
machine-coding interview prep reference, covering what's actually being asked
at product companies and startups right now.

Every topic gets two artifacts once done:

- **`<Topic>.md`** — concepts, when to use it, rules, edge cases/caveats (sourced from official docs where applicable, verified against React 19).
- **`<Topic>/` example folder** — one small runnable component per scenario, wired into `App.tsx`.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

## when to pass ref and when to create a ref in a custom hook?

when we need to access the DOM element (using ref.current) in the custom hook on some event (like scroll, resize, click etc.) we should pass the ref to the custom hook as prop, since our event handler would always access the latest value of ref.current.

However, if DOM element is accessed once (like on mount) and we don't need to access it again. If the element isn't there yet on mount, then we never get that element, so we should create the ref in the custom hook and return it to the component to attach it to the DOM element.

## Phase 1 — Hooks Deep Dive

Built-in hooks, one at a time, in rough order of interview frequency.

- [x] `useMemo` — [notes](src/Components/Hooks/useMemo/useMemo.md)
- [x] `useCallback` — [notes](src/Components/Hooks/useCallback/useCallback.md)
- [x] `useState` (incl. lazy init, functional updates, batching) — [notes](src/Components/Hooks/useState/useState.md)
- [x] `useEffect` (incl. cleanup, dependency pitfalls, StrictMode double-invoke) — [notes](src/Components/Hooks/useEffect/useEffect.md)
- [x] `useEffectEvent` (React 19.2, separating non-reactive events from an Effect's dependencies) — [notes](src/Components/Hooks/useEffect/useEffectEvent.md)
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
  - [x] [`useDebounce`](src/Components/Hooks/useDebounce/debounce-deep-dive.md)
  - [x] [`useThrottle`](src/Components/Hooks/useThrottle/throttle.ts)
  - [x] [`usePrevious`](src/Components/Hooks/usePrevious/usePrevious.ts)
  - [x] [`useOnClickOutside`](src/Components/Hooks/useOnClickOutside/useOnClickOutside.ts)
  - [x] [`useLocalStorage`](src/Components/Hooks/useLocalStorage/useLocalStorage.ts)
  - [x] [`useFetch with caching`](src/Components/Hooks/useFetch/useFetch.ts) // to add caching and stale-while-revalidate concepts
  - [x] [`useWindowSize`](src/Components/Hooks/useWindowSize/useWindowSize.ts)
  - [x] [`useIntersectionObserver`](src/Components/Hooks/useIntersectionObserver/useIntersectionObserver.ts)
  - [x] [`useResizeObserver`](src/Components/Hooks/useResizeObserver/useResizeObserver.ts)
  - [x] [`useEventListener`](src/Components/Hooks/useEventListener/useEventListener.ts)
  - [x] [`useLazyLoadOnScreenView`](src/Components/Hooks/useLazyLoadOnScreenView/useLazyLoadOnScreenView.ts)
  - [x] [`useIsOnline`](src/Components/Hooks/useIsOnline/useIsOnline.ts)
  - [x] [`useMediaQuery`](src/Components/Hooks/useMediaQuery/useMediaQuery.ts)
  - [x] [`click or hold event`](src/Components/Hooks/useClickOrHold/useClickOrHold.ts)

## Phase 2 — Classic Machine Coding Build Questions

The "build this component in 45–60 minutes" questions asked across FAANG,
fintech (Razorpay/Paytm/Groww), and product startups (Swiggy/Flipkart/Atlassian/etc).

- [x] Debounced search box (with cancellation of stale requests) — [notes](src/Components/MachineCoding/DebouncedSearch/DebouncedSearch.md)
- [x] Throttled scroll/resize handler — [notes](src/Components/MachineCoding/ThrottledScrollResize/ThrottledScrollResize.md)
- [x] Stopwatch / timer (start, pause, reset, lap) — [notes](src/Components/MachineCoding/Stopwatch/Stopwatch.md)
- [x] Countdown timer (with input for target date/time) — [notes](src/Components/MachineCoding/CountdownTimer/CountdownTimer.md)
- [x] Autocomplete / typeahead with keyboard navigation — [notes](src/Components/MachineCoding/Typeahead/Typeahead.md)
- [x] Infinite scroll list (with loading text) — [notes](src/Components/MachineCoding/InfiniteScroll/InfiniteScroll.md)
- [x] Windowed / virtualized list (build a mini version, then compare to `react-window`) — [notes](src/Components/MachineCoding/VirtualList/VirtualList.md)
- [x] Pagination (client-side and server-side) — [notes](src/Components/MachineCoding/Pagination/Pagination.md)
- [x] Image carousel / slider - [notes](src/Components/MachineCoding/Carousel/Carousel.md)
- [x] Nested comments / threaded replies (recursive + flat map) — [notes](src/Components/MachineCoding/NestedComments/NestedComments.md)
- [x] File explorer/tree view with lazy loading (nested + flat table) — [notes](src/Components/MachineCoding/FileExplorer/FileExplorer.md)
- [x] Google Drive–like file explorer (HLD + mini build: layout, add/rename/delete, grid/list, breadcrumbs, search) — [notes](src/Components/MachineCoding/DriveExplorer/DriveExplorer.md)
- [x] Accordion (single-open and multi-open variants) — [notes](src/Components/MachineCoding/Accordion/Accordion.md)
- [x] Tabs component (controlled + uncontrolled) — [notes](src/Components/MachineCoding/Tabs/Tabs.md)
- [x] Modal / Dialog via `createPortal` (focus trap, escape-to-close, scroll lock) — [notes](src/Components/MachineCoding/Modal/Modal.md)
- [x] Toast / notification system (queue, auto-dismiss, portal) — [notes](src/Components/MachineCoding/Toast/Toast.md)
- [x] Star rating component — [notes](src/Components/MachineCoding/StarRating/StarRating.md)
- [x] OTP input (auto-advance, paste support) — [notes](src/Components/MachineCoding/OtpInput/OtpInput.md)
- [x] Multi-step form / wizard with validation — [notes](src/Components/MachineCoding/MultiStepForm/MultiStepForm.md)
- [x] File upload with progress bar — [notes](src/Components/MachineCoding/FileUpload/FileUpload.md)
- [x] Drag-and-drop list (reordering) / Kanban board — [notes](src/Components/MachineCoding/KanbanBoard/KanbanBoard.md)
- [x] Grid Lights (Build a grid of light cells where you can click on cells to activate them, turning them green. When all the cells are activated, all the cells will be deactivated one by one in the reverse order they were activated with 300ms interval in between them) - [notes](src/Components/MachineCoding/GridLights/GridLights.md)

- [x] Tic-tac-toe / game-state style state machine — [notes](src/Components/MachineCoding/TicTacToe/TicTacToe.md)
- [x] Todo app with undo/redo (command pattern / history stack) — [notes](src/Components/MachineCoding/TodoUndoRedo/TodoUndoRedo.md)
- [x] Grid/spreadsheet-style editable table with keyboard nav — [notes](src/Components/MachineCoding/Spreadsheet/Spreadsheet.md)

- [x] Multi-select dropdown with search and keyboard navigation — [notes](src/Components/MachineCoding/MultiSelect/MultiSelect.md)
- [x] Autocomplete with grouped options and keyboard navigation — [notes](src/Components/MachineCoding/GroupedAutocomplete/GroupedAutocomplete.md)

- [x] Form library like Formik / React Hook Form (LLD) — [notes](src/Components/MachineCoding/FormLibrary/FormLibrary.md)
- [x] Multi-floor Parking Lot — [notes](src/Components/MachineCoding/ParkingLot/ParkingLot.md)
- [x] Video Player Control Bar — [notes](src/Components/MachineCoding/VideoPlayer/VideoPlayer.md)
- [x] Ticket Booking System — [notes](src/Components/MachineCoding/TicketBooking/TicketBooking.md)

## Phase 3 — State Management & Data Fetching

- [ ] Context + `useReducer` as a mini global store
- [ ] Building a minimal client cache (stale-while-revalidate concept) from scratch
- [x] Race conditions in data fetching & request cancellation (`AbortController`) — [notes](src/Components/DataFetching/RaceConditions/RaceConditions.md)
- [x] Optimistic updates (manual, then via `useOptimistic`) — [notes](src/Components/DataFetching/OptimisticUpdates/OptimisticUpdates.md)
- [x] Polling vs WebSockets vs SSE — tradeoffs and a small implementation of each — [notes](src/Components/DataFetching/RealtimeTransports/RealtimeTransports.md)
- [ ] Where TanStack Query / SWR fit in vs hand-rolled hooks (concepts, not necessarily installed)

## Phase 4 — Performance Optimization

- [x] `memo`, `useMemo`, `useCallback` — when they actually help vs cargo-culting — [notes](src/Components/Performance/Memoization/Memoization.md)
- [x] Diagnosing unnecessary re-renders with React DevTools Profiler — [notes](src/Components/Performance/Profiler/Profiler.md)
- [x] Code splitting & lazy loading (`React.lazy`, `Suspense`) — [notes](src/Components/Performance/CodeSplitting/CodeSplitting.md)
- [x] List virtualization deep dive — [notes](src/Components/Performance/VirtualizationDeepDive/VirtualizationDeepDive.md)
- [x] Avoiding prop-drilling-induced re-renders (context splitting, composition) — [notes](src/Components/Performance/ContextPerformance/ContextPerformance.md)
- [x] React Compiler — what it auto-memoizes and what it doesn't change — [notes](src/Components/Performance/ReactCompiler/ReactCompiler.md)

## Phase 5 — Advanced Component Patterns

- [x] Compound components (`Tabs.Root`, `Tabs.List`, `Tabs.Panel` style APIs) — [notes](src/Components/Patterns/CompoundComponents/CompoundComponents.md)
- [x] Render props vs custom hooks (why hooks mostly won) — [notes](src/Components/Patterns/RenderPropsVsHooks/RenderPropsVsHooks.md)
- [x] Higher-order components (still asked in legacy codebases) — [notes](src/Components/Patterns/HigherOrderComponents/HigherOrderComponents.md)
- [x] Controlled vs uncontrolled components — [notes](src/Components/Patterns/ControlledUncontrolled/ControlledUncontrolled.md)
- [x] Portals beyond modals (tooltips, dropdowns) — [notes](src/Components/Patterns/Portals/Portals.md)
- [x] Error boundaries (class-based today; note on the upcoming `ErrorBoundary` primitives) — [notes](src/Components/Patterns/ErrorBoundaries/ErrorBoundaries.md)
- [x] `Suspense` for data fetching, not just lazy loading — [notes](src/Components/Patterns/SuspenseData/SuspenseData.md)
- [x] Polymorphic components (`as` prop) in TypeScript — [notes](src/Components/Patterns/Polymorphic/Polymorphic.md)

## Phase 6 — TypeScript with React

- [x] Typing props: unions, discriminated unions, generics in components — [notes](src/Components/TypeScript/TypingProps.md)
- [x] Typing custom hooks (generic return tuples, overloads) — [notes](src/Components/TypeScript/TypingHooks.md)
- [x] Typing event handlers and refs correctly — [notes](src/Components/TypeScript/EventsAndRefs.md)
- [x] `satisfies`, utility types (`ComponentProps`, `PropsWithChildren`) in real components — [notes](src/Components/TypeScript/UtilityTypes.md)

## HLD

- [ ] Design an OTT Streaming Player
- [ ] Google Calendar
- [ ] Markdown editor with live preview (Rich text editing, syntax highlighting, and auto-save)- [ ] Chat UI with polling or WebSocket updates

## Your Questions

Add anything you've personally been asked or want covered — I'll fold these
into the right phase above.

- [ ] Currying with placeholder
- [x] Abort controller — [notes](src/Components/DataFetching/RaceConditions/RaceConditions.md)
