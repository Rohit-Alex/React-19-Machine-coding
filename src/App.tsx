import "./App.css";
import type { ComponentType } from "react";
import { useLocalStorage } from "./Components/Hooks/useLocalStorage/useLocalStorage";
import { DebouncedSearchDemo } from "./Components/MachineCoding/DebouncedSearch";
import { ThrottledScrollResizeDemo } from "./Components/MachineCoding/ThrottledScrollResize";
import { InfiniteScrollDemo } from "./Components/MachineCoding/InfiniteScroll";
import { PaginationDemo } from "./Components/MachineCoding/Pagination";
import { StopwatchDemo } from "./Components/MachineCoding/Stopwatch";
import { CountdownTimerDemo } from "./Components/MachineCoding/CountdownTimer";
import { TypeaheadDemo } from "./Components/MachineCoding/Typeahead";
import { KanbanBoardDemo } from "./Components/MachineCoding/KanbanBoard";
import { OtpInputDemo } from "./Components/MachineCoding/OtpInput";
import { FormLibraryDemo } from "./Components/MachineCoding/FormLibrary";
import { DriveExplorerDemo } from "./Components/MachineCoding/DriveExplorer";
import { FileExplorerDemo } from "./Components/MachineCoding/FileExplorer";
import { NestedCommentsDemo } from "./Components/MachineCoding/NestedComments";
import { CarouselDemo } from "./Components/MachineCoding/Carousel";
import { VirtualListSection } from "./Components/MachineCoding/VirtualList";
import { UseActionStateDemo } from "./Components/Hooks/useActionState";
import { UseCallbackDemo } from "./Components/Hooks/useCallback";
import { UseContextDemo } from "./Components/Hooks/useContext";
import { UseDebounceDemo } from "./Components/Hooks/useDebounce";
import { UseDebugValueDemo } from "./Components/Hooks/useDebugValue";
import { UseDeferredValueDemo } from "./Components/Hooks/useDeferredValue";
import { UseDemo } from "./Components/Hooks/use";
import { UseEffectDemo } from "./Components/Hooks/useEffect";
import { UseEventListenerDemo } from "./Components/Hooks/useEventListener";
import { UseFetchDemo } from "./Components/Hooks/useFetch";
import { UseIdDemo } from "./Components/Hooks/useId";
import { UseImperativeHandleDemo } from "./Components/Hooks/useImperativeHandle";
import { UseIntersectionObserverDemo } from "./Components/Hooks/useIntersectionObserver";
import { UseIsOnlineDemo } from "./Components/Hooks/useIsOnline";
import { UseClickOrHoldDemo } from "./Components/Hooks/useClickOrHold";
import { UseMediaQueryDemo } from "./Components/Hooks/useMediaQuery";
import { UseLayoutEffectDemo } from "./Components/Hooks/useLayoutEffect";
import { UseLazyLoadOnScreenViewDemo } from "./Components/Hooks/useLazyLoadOnScreenView";
import { UseLocalStorageDemo } from "./Components/Hooks/useLocalStorage";
import { UseMemoDemo } from "./Components/Hooks/useMemo";
import { UseOnClickOutsideDemo } from "./Components/Hooks/useOnClickOutside";
import { UseOptimisticDemo } from "./Components/Hooks/useOptimistic";
import { UsePreviousDemo } from "./Components/Hooks/usePrevious";
import { UseReducerDemo } from "./Components/Hooks/useReducer";
import { UseRefDemo } from "./Components/Hooks/useRef";
import { UseStateDemo } from "./Components/Hooks/useState";
import { UseSyncExternalStoreDemo } from "./Components/Hooks/useSyncExternalStore";
import { UseThrottleDemo } from "./Components/Hooks/useThrottle";
import { UseTransitionDemo } from "./Components/Hooks/useTransition";
import { UseWindowSizeDemo } from "./Components/Hooks/useWindowSize";

// Page order within each tab.
const hookDemos: ComponentType[] = [
  UseMemoDemo,
  UseCallbackDemo,
  UseStateDemo,
  UseEffectDemo,
  UseLayoutEffectDemo,
  UseRefDemo,
  UseReducerDemo,
  UseContextDemo,
  UseTransitionDemo,
  UseDeferredValueDemo,
  UseIdDemo,
  UseSyncExternalStoreDemo,
  UseImperativeHandleDemo,
  UseDemo,
  UseActionStateDemo,
  UseOptimisticDemo,
  UseDebugValueDemo,
  UseDebounceDemo,
  UseThrottleDemo,
  UsePreviousDemo,
  UseOnClickOutsideDemo,
  UseLocalStorageDemo,
  UseFetchDemo,
  UseWindowSizeDemo,
  UseIntersectionObserverDemo,
  UseEventListenerDemo,
  UseLazyLoadOnScreenViewDemo,
  UseIsOnlineDemo,
  UseMediaQueryDemo,
  UseClickOrHoldDemo,
];

const buildDemos: ComponentType[] = [
  DebouncedSearchDemo,
  ThrottledScrollResizeDemo,
  TypeaheadDemo,
  InfiniteScrollDemo,
  VirtualListSection,
  PaginationDemo,
  StopwatchDemo,
  CountdownTimerDemo,
  CarouselDemo,
  NestedCommentsDemo,
  FileExplorerDemo,
  DriveExplorerDemo,
  KanbanBoardDemo,
  FormLibraryDemo,
  OtpInputDemo,
];

const tabs = {
  hooks: { label: "Hooks", demos: hookDemos },
  builds: { label: "Machine coding / LLD", demos: buildDemos },
};

type Tab = keyof typeof tabs;

function App() {
  // Remembered across reloads. Only the chosen tab is mounted, so the other
  // tab's timers, observers and listeners aren't running in the background.
  const [tab, setTab] = useLocalStorage<Tab>("app-tab", "hooks");
  const { demos } = tabs[tab] ?? tabs.hooks; // An old or bad stored value falls back to Hooks.

  return (
    <div>
      <h1>Machine coding round questions on react</h1>
      <nav aria-label="Demo sections" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            style={{ fontWeight: tab === key ? 700 : 400 }}
          >
            {tabs[key].label} ({tabs[key].demos.length})
          </button>
        ))}
      </nav>
      {demos.map((Demo, i) => (
        <div key={`${tab}-${i}`}>
          {i > 0 && <hr />}
          <Demo />
        </div>
      ))}
    </div>
  );
}

export default App;
